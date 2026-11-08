-- =====================================================================
-- Sprint D4.1b — Registrar Hardening
-- =====================================================================
-- D4.1a (reconciliation) landed the registrar substrate into fail-closed
-- BLOCKING. D4.1b hardens the enrollment-state write path, same pattern
-- PR #2 (20260907104x) used for module content authority:
--
--   1. student_holds — a canonical table for financial, academic, and
--      administrative holds. A hold is active until lifted_at is set.
--   2. can_register_now(user_id, term_id) — predicate returning the
--      list of blockers. Empty array = free to register. Called from
--      future wrappers; the existing enroll RPC stays untouched.
--   3. guard_section_enrollment_status_fields trigger — fails any
--      direct UPDATE that changes status / withdrawn_at / promoted_at /
--      waitlisted_at unless the transaction carries the trusted-session
--      marker scrolluniversity.registrar_authority_rpc='on'.
--   4. drop_section_enrollment(section_id, reason) — deadline-aware
--      wrapper: before add_drop_ends_on → clean drop (status='dropped');
--      before withdraw_ends_on → withdrawal (status='withdrawn' with
--      transcript-visible mark); after → raises
--      drop_deadline_passed. Sets the trusted marker, writes to the
--      registrar_audit_log with the actor and reason.
--   5. Every state transition writes a registrar_audit_log row with
--      event_kind ∈ ('dropped','withdrawn','hold_imposed','hold_lifted').
--
-- Non-goals this slice:
--   - Rewriting enroll_student_in_section itself. The deadline + hold
--     checks are reachable via a shim that calls can_register_now
--     before the RPC; the RPC stays source-of-truth for enrollment.
--   - Graduation clearance server-side audit — deferred to D4.1c.
-- =====================================================================

-- ---------- 0. Defensive schema drift reconciliation -----------------
-- The SUYAS calendar substrate reconciliation (20260907175900) would
-- add add_drop_ends_on + withdraw_ends_on to academic_terms, but that
-- migration is wired later in the CI graph than D4.1b. Add those
-- columns defensively so the drop RPC can read them.
ALTER TABLE public.academic_terms
  ADD COLUMN IF NOT EXISTS add_drop_ends_on date,
  ADD COLUMN IF NOT EXISTS withdraw_ends_on date;

-- ---------- 1. student_holds ----------------------------------------
CREATE TABLE IF NOT EXISTS public.student_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hold_type text NOT NULL,
  reason text,
  imposed_by uuid,
  imposed_at timestamptz NOT NULL DEFAULT now(),
  lifted_by uuid,
  lifted_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_holds
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS hold_type text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS imposed_by uuid,
  ADD COLUMN IF NOT EXISTS imposed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lifted_by uuid,
  ADD COLUMN IF NOT EXISTS lifted_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS student_holds_active_idx
  ON public.student_holds(user_id)
  WHERE lifted_at IS NULL;

ALTER TABLE public.student_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student reads own holds" ON public.student_holds;
CREATE POLICY "Student reads own holds"
  ON public.student_holds FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Registrar admins read all holds" ON public.student_holds';
    EXECUTE $policy$
      CREATE POLICY "Registrar admins read all holds"
        ON public.student_holds FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
          OR public.has_role(auth.uid(), 'registrar'::public.app_role)
        )
    $policy$;
  END IF;
END$$;

COMMENT ON TABLE public.student_holds IS
  'D4.1b: canonical holds table. A row with lifted_at IS NULL is an active hold that blocks registration via can_register_now.';

-- ---------- 2. can_register_now(user_id, term_id) -------------------
CREATE OR REPLACE FUNCTION public.can_register_now(_user uuid, _term_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues text[] := ARRAY[]::text[];
  v_term record;
  v_standing text;
  v_degree_rows int;
  v_active_holds int;
  v_window_rows int;
BEGIN
  IF _user IS NULL THEN
    RETURN ARRAY['user_id_required'];
  END IF;
  IF _term_id IS NULL THEN
    RETURN ARRAY['term_id_required'];
  END IF;

  SELECT * INTO v_term FROM public.academic_terms WHERE id = _term_id;
  IF NOT FOUND THEN
    RETURN ARRAY['term_not_found'];
  END IF;

  IF v_term.status::text NOT IN ('open','in_session') THEN
    v_issues := array_append(v_issues, 'term_status_' || v_term.status::text || '_not_registrable');
  END IF;

  IF v_term.add_drop_ends_on IS NOT NULL
     AND CURRENT_DATE > v_term.add_drop_ends_on THEN
    v_issues := array_append(v_issues, 'add_drop_window_closed');
  END IF;

  SELECT count(*) INTO v_window_rows
    FROM public.registration_windows
   WHERE term_id = _term_id AND is_active
     AND now() BETWEEN open_at AND close_at;
  IF v_window_rows = 0 THEN
    v_issues := array_append(v_issues, 'no_open_registration_window');
  END IF;

  SELECT count(*) INTO v_degree_rows
    FROM public.student_degree_enrollments
   WHERE user_id = _user AND status IN ('active','enrolled');
  IF v_degree_rows = 0 THEN
    v_issues := array_append(v_issues, 'no_active_degree_enrollment');
  END IF;

  SELECT standing INTO v_standing
    FROM public.student_academic_standing
   WHERE user_id = _user
   ORDER BY recorded_at DESC NULLS LAST
   LIMIT 1;
  IF v_standing IN ('suspended','dismissed') THEN
    v_issues := array_append(v_issues, 'academic_standing_' || v_standing || '_blocks_registration');
  END IF;

  SELECT count(*) INTO v_active_holds
    FROM public.student_holds
   WHERE user_id = _user AND lifted_at IS NULL;
  IF v_active_holds > 0 THEN
    v_issues := array_append(v_issues, 'active_holds_present');
  END IF;

  RETURN v_issues;
END;
$$;

REVOKE ALL ON FUNCTION public.can_register_now(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_register_now(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_register_now(uuid, uuid) IS
  'D4.1b: list the reasons a given student cannot register for a given term right now. Empty = free to register. Reads standing, degree enrollment, holds, deadlines, and the registration window.';

-- ---------- 3. Trusted-session guard on section_enrollments ---------
DO $$
BEGIN
  IF to_regclass('public.section_enrollments') IS NULL THEN
    -- Historical substrate not landed; nothing to guard.
    RETURN;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.guard_section_enrollment_authority_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted boolean := COALESCE(
    current_setting('scrolluniversity.registrar_authority_rpc', true),
    'off'
  ) = 'on';
BEGIN
  IF v_trusted THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at
     OR NEW.waitlisted_at IS DISTINCT FROM OLD.waitlisted_at
     OR NEW.promoted_at IS DISTINCT FROM OLD.promoted_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'section_enrollment_state_write_forbidden';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_section_enrollment_authority_fields() IS
  'D4.1b fail-closed state guard. Only transactions carrying scrolluniversity.registrar_authority_rpc=on may change status/withdrawn_at/promoted_at/waitlisted_at on public.section_enrollments.';

DO $$
BEGIN
  IF to_regclass('public.section_enrollments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_guard_section_enrollment_authority
      ON public.section_enrollments;
    CREATE TRIGGER trg_guard_section_enrollment_authority
      BEFORE UPDATE ON public.section_enrollments
      FOR EACH ROW
      EXECUTE FUNCTION public.guard_section_enrollment_authority_fields();
  END IF;
END$$;

-- ---------- 4. drop_section_enrollment wrapper ----------------------
-- Deadline-aware: before add_drop_ends_on → clean drop (status='dropped');
-- before withdraw_ends_on → withdrawal (status='withdrawn');
-- else → raises drop_deadline_passed.
-- Historical migration 20260520051627 defined this with parameter name
-- '_enrollment_id'. Drop all overloads so the CREATE OR REPLACE below
-- is free to use '_section_id' with new deadline-aware semantics.
DROP FUNCTION IF EXISTS public.drop_section_enrollment(uuid, text);
DROP FUNCTION IF EXISTS public.drop_section_enrollment(uuid);

CREATE OR REPLACE FUNCTION public.drop_section_enrollment(
  _section_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _enrollment record;
  _section record;
  _term record;
  _today date := CURRENT_DATE;
  _new_status text;
  _event_kind text;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _enrollment
    FROM public.section_enrollments
   WHERE section_id = _section_id AND student_user_id = _user
     AND status IN ('enrolled','waitlisted','requested')
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'enrollment_not_found');
  END IF;

  SELECT * INTO _section
    FROM public.course_sections WHERE id = _section_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  SELECT * INTO _term
    FROM public.academic_terms WHERE id = _section.term_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'term_not_found');
  END IF;

  IF _term.add_drop_ends_on IS NULL OR _today <= _term.add_drop_ends_on THEN
    _new_status := 'dropped';
    _event_kind := 'dropped';
  ELSIF _term.withdraw_ends_on IS NOT NULL AND _today <= _term.withdraw_ends_on THEN
    _new_status := 'withdrawn';
    _event_kind := 'withdrawn';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'drop_deadline_passed');
  END IF;

  PERFORM set_config('scrolluniversity.registrar_authority_rpc', 'on', true);

  -- section_enrollments.status is public.section_enrollment_status (enum);
  -- cast the text _new_status before writing.
  UPDATE public.section_enrollments
     SET status = _new_status::public.section_enrollment_status,
         withdrawn_at = CASE WHEN _new_status = 'withdrawn' THEN now() ELSE withdrawn_at END
   WHERE id = _enrollment.id;

  IF _enrollment.status = 'enrolled' AND _section.enrolled_count > 0 THEN
    UPDATE public.course_sections
       SET enrolled_count = GREATEST(enrolled_count - 1, 0),
           section_status = 'open'
     WHERE id = _section_id;
  END IF;

  INSERT INTO public.registrar_audit_log (
    actor_id, student_user_id, section_id, term_id, event_kind, payload
  ) VALUES (
    _user, _user, _section_id, _section.term_id, _event_kind,
    jsonb_build_object(
      'enrollment_id', _enrollment.id,
      'reason', COALESCE(_reason, ''),
      'previous_status', _enrollment.status,
      'new_status', _new_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'event', _event_kind,
    'new_status', _new_status,
    'enrollment_id', _enrollment.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.drop_section_enrollment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drop_section_enrollment(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.drop_section_enrollment(uuid, text) IS
  'D4.1b deadline-aware drop/withdraw. Clean drop before add_drop_ends_on, withdrawal before withdraw_ends_on, forbidden after. Writes a registrar_audit_log row each transition. Flips scrolluniversity.registrar_authority_rpc for the duration of the write so the state guard allows it.';

-- ---------- 5. Hold management RPCs ---------------------------------
CREATE OR REPLACE FUNCTION public.impose_student_hold(
  _student uuid,
  _hold_type text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _id uuid;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _student IS NULL OR _hold_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'student_and_type_required');
  END IF;

  INSERT INTO public.student_holds (user_id, hold_type, reason, imposed_by)
  VALUES (_student, _hold_type, _reason, _actor)
  RETURNING id INTO _id;

  INSERT INTO public.registrar_audit_log (
    actor_id, student_user_id, event_kind, payload
  ) VALUES (
    _actor, _student, 'hold_imposed',
    jsonb_build_object('hold_id', _id, 'hold_type', _hold_type, 'reason', COALESCE(_reason, ''))
  );

  RETURN jsonb_build_object('success', true, 'hold_id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.lift_student_hold(_hold_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _hold record;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _hold FROM public.student_holds WHERE id = _hold_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'hold_not_found');
  END IF;
  IF _hold.lifted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'hold_already_lifted');
  END IF;

  UPDATE public.student_holds
     SET lifted_at = now(), lifted_by = _actor
   WHERE id = _hold_id;

  INSERT INTO public.registrar_audit_log (
    actor_id, student_user_id, event_kind, payload
  ) VALUES (
    _actor, _hold.user_id, 'hold_lifted',
    jsonb_build_object('hold_id', _hold_id, 'hold_type', _hold.hold_type)
  );

  RETURN jsonb_build_object('success', true, 'hold_id', _hold_id);
END;
$$;

REVOKE ALL ON FUNCTION public.impose_student_hold(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lift_student_hold(uuid)             FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.impose_student_hold(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lift_student_hold(uuid)               TO authenticated, service_role;
