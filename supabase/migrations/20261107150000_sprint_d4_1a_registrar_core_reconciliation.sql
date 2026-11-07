-- =====================================================================
-- Sprint D4.1a — Registrar Core Reconciliation
-- =====================================================================
-- The registrar critical path (student → term → open window → section →
-- enroll → audit) is fully implemented in bootstrap-advisory migrations:
--   - 20251229001718_...      : registration_windows + enrollment_records
--   - 20260103234035_...      : student_degree_enrollments
--   - 20260626180404_...      : student_academic_standing
--   - 20260626122152_...      : registrar_audit_log, extensions to
--                                course_sections + section_enrollments,
--                                sections_overlap(), enroll_student_in_section(),
--                                drop_section_enrollment(), promote_waitlist()
--
-- But in CI these migrations log "relation does not exist" / "function
-- does not exist" because they run under an incomplete bootstrap shape.
-- The code paths are therefore un-exercised in CI, so a regression that
-- breaks the registrar path would ship unnoticed.
--
-- This migration is a RECONCILIATION, not a rewrite. It:
--   1. Ensures the registrar substrate tables exist in a minimal
--      canonical shape (idempotent CREATE TABLE IF NOT EXISTS +
--      ALTER TABLE ADD COLUMN IF NOT EXISTS).
--   2. Adds a readiness evaluator that mirrors the shape of
--      evaluate_module_quality(): returns a text[] of issues that
--      block a given academic_term from being registrar-ready.
--   3. Adds vw_registrar_critical_path — the per-term scorecard the
--      BLOCKING test suite asserts against.
--
-- It does NOT redefine enroll_student_in_section() or any of the
-- authority RPCs. Those live in their historical migrations; this
-- migration only reads them to decide whether the critical path is
-- addressable.
--
-- D4.1b (deferred) hardens the RPCs into fail-closed BLOCKING trigger
-- form, same shape as PR #2 did for module content authority.
-- =====================================================================

-- ---------- 0. Minimal canonical shape ------------------------------

-- academic_terms + academic_years already reconciled by
-- 20260907175900_suyas_calendar_substrate_reconciliation.sql (step 52).
-- We do not redeclare them here.

-- semesters is the legacy FK target for registration_windows.term_id.
-- Create minimal shape if absent so the CREATE TABLE IF NOT EXISTS
-- for registration_windows can attach its FK without failing.
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid,
  name text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  term_type text DEFAULT 'semester',
  registration_open boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Defensive ALTER for historical rows that pre-date the above columns.
ALTER TABLE public.semesters
  ADD COLUMN IF NOT EXISTS academic_year_id uuid,
  ADD COLUMN IF NOT EXISTS term_type text DEFAULT 'semester',
  ADD COLUMN IF NOT EXISTS registration_open boolean DEFAULT false;

-- ---------- 1. registration_windows ---------------------------------
CREATE TABLE IF NOT EXISTS public.registration_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid,
  open_at timestamptz NOT NULL DEFAULT now(),
  close_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  audience text NOT NULL DEFAULT 'all',
  rules_json jsonb DEFAULT '{}'::jsonb,
  priority_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  tier text NOT NULL DEFAULT 'normal',
  max_credits numeric(4,1) NOT NULL DEFAULT 18,
  min_credits numeric(4,1) NOT NULL DEFAULT 0,
  eligible_levels text[] DEFAULT ARRAY['undergraduate','graduate','doctoral'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.registration_windows
  ADD COLUMN IF NOT EXISTS term_id uuid,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS max_credits numeric(4,1) NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS min_credits numeric(4,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligible_levels text[] DEFAULT ARRAY['undergraduate','graduate','doctoral'],
  ADD COLUMN IF NOT EXISTS priority_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

CREATE INDEX IF NOT EXISTS registration_windows_term_idx
  ON public.registration_windows(term_id);
CREATE INDEX IF NOT EXISTS registration_windows_open_idx
  ON public.registration_windows(is_active, open_at, close_at);

-- ---------- 2. student_degree_enrollments ---------------------------
CREATE TABLE IF NOT EXISTS public.student_degree_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  degree_id uuid,
  program_id uuid,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_degree_enrollments
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS degree_id uuid,
  ADD COLUMN IF NOT EXISTS program_id uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS enrolled_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS student_degree_enrollments_user_status_idx
  ON public.student_degree_enrollments(user_id, status);

-- ---------- 3. student_academic_standing ----------------------------
CREATE TABLE IF NOT EXISTS public.student_academic_standing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  term_id uuid,
  standing text NOT NULL DEFAULT 'good',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  notes text
);

ALTER TABLE public.student_academic_standing
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS term_id uuid,
  ADD COLUMN IF NOT EXISTS standing text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS student_standing_user_idx
  ON public.student_academic_standing(user_id, recorded_at DESC);

-- ---------- 4. registrar_audit_log ----------------------------------
CREATE TABLE IF NOT EXISTS public.registrar_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  student_user_id uuid,
  section_id uuid,
  term_id uuid,
  event_kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registrar_audit_log
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS student_user_id uuid,
  ADD COLUMN IF NOT EXISTS section_id uuid,
  ADD COLUMN IF NOT EXISTS term_id uuid,
  ADD COLUMN IF NOT EXISTS event_kind text,
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS registrar_audit_student_idx
  ON public.registrar_audit_log(student_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS registrar_audit_section_idx
  ON public.registrar_audit_log(section_id, created_at DESC);

ALTER TABLE public.registrar_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin / superadmin / registrar can read the full audit log. We guard
-- against public.has_role being absent in CI by probing for it first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin reads registrar audit" ON public.registrar_audit_log';
    EXECUTE $policy$
      CREATE POLICY "Admin reads registrar audit"
        ON public.registrar_audit_log FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
          OR public.has_role(auth.uid(), 'registrar'::public.app_role)
        )
    $policy$;
  END IF;
END$$;

DROP POLICY IF EXISTS "Student reads own registrar audit" ON public.registrar_audit_log;
CREATE POLICY "Student reads own registrar audit"
  ON public.registrar_audit_log FOR SELECT TO authenticated
  USING (student_user_id = auth.uid());

-- ---------- 5. Minimal section_enrollments shape --------------------
-- course_sections + section_enrollments are reconciled historically.
-- Defensive ALTER for the columns the enroll RPC reads, in case CI
-- bootstrap stopped short of them.
DO $$
BEGIN
  IF to_regclass('public.section_enrollments') IS NOT NULL THEN
    ALTER TABLE public.section_enrollments
      ADD COLUMN IF NOT EXISTS term_id uuid,
      ADD COLUMN IF NOT EXISTS credit_hours numeric(4,1) DEFAULT 3,
      ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
      ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz,
      ADD COLUMN IF NOT EXISTS promoted_at timestamptz;
  END IF;

  IF to_regclass('public.course_sections') IS NOT NULL THEN
    ALTER TABLE public.course_sections
      ADD COLUMN IF NOT EXISTS term_id uuid,
      ADD COLUMN IF NOT EXISTS course_id uuid,
      ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'online',
      ADD COLUMN IF NOT EXISTS enrolled_count int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS waitlist_count int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS section_status text DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS seat_capacity int DEFAULT 25,
      ADD COLUMN IF NOT EXISTS waitlist_capacity int DEFAULT 10,
      ADD COLUMN IF NOT EXISTS credit_hours numeric(4,1) DEFAULT 3,
      ADD COLUMN IF NOT EXISTS meets_days text,
      ADD COLUMN IF NOT EXISTS meets_start time,
      ADD COLUMN IF NOT EXISTS meets_end time,
      ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
  END IF;
END$$;

-- ---------- 6. evaluate_registrar_readiness -------------------------
-- Returns a sorted text[] of issues blocking a given academic_term from
-- being registrar-ready. An empty array means the critical path is open.
-- Mirrors evaluate_module_quality() in shape; stable + side-effect free.
CREATE OR REPLACE FUNCTION public.evaluate_registrar_readiness(_term_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues text[] := ARRAY[]::text[];
  v_term_status text;
  v_window_count int;
  v_section_count int;
  v_rpc_present boolean;
BEGIN
  IF _term_id IS NULL THEN
    RETURN ARRAY['term_id_required'];
  END IF;

  SELECT status::text INTO v_term_status
    FROM public.academic_terms
   WHERE id = _term_id;

  IF v_term_status IS NULL THEN
    RETURN ARRAY['term_not_found'];
  END IF;

  IF v_term_status NOT IN ('open', 'in_session') THEN
    v_issues := array_append(v_issues, 'term_status_' || v_term_status || '_not_registrable');
  END IF;

  SELECT count(*) INTO v_window_count
    FROM public.registration_windows
   WHERE term_id = _term_id AND is_active
     AND now() BETWEEN open_at AND close_at;
  IF v_window_count = 0 THEN
    v_issues := array_append(v_issues, 'no_open_registration_window');
  END IF;

  IF to_regclass('public.course_sections') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.course_sections
              WHERE term_id = $1 AND COALESCE(active, true)
                AND COALESCE(section_status, ''open'') <> ''cancelled'''
      INTO v_section_count USING _term_id;
  ELSE
    v_section_count := 0;
  END IF;
  IF v_section_count = 0 THEN
    v_issues := array_append(v_issues, 'no_active_course_sections');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'enroll_student_in_section'
  ) INTO v_rpc_present;
  IF NOT v_rpc_present THEN
    v_issues := array_append(v_issues, 'enroll_student_in_section_rpc_missing');
  END IF;

  RETURN v_issues;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_registrar_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_registrar_readiness(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.evaluate_registrar_readiness(uuid) IS
  'D4.1a readiness evaluator. Returns the sorted list of issues blocking a given academic_term from being registrar-ready. Empty = ready.';

-- ---------- 7. vw_registrar_critical_path ---------------------------
-- Per-term scorecard. Reusable across every term; not Golden-Path-specific.
CREATE OR REPLACE VIEW public.vw_registrar_critical_path AS
SELECT
  t.id                                     AS term_id,
  t.code                                   AS term_code,
  t.name                                   AS term_name,
  t.status::text                           AS term_status,
  COALESCE(t.starts_on, t.start_date)      AS term_start,
  COALESCE(t.ends_on, t.end_date)          AS term_end,
  (SELECT count(*) FROM public.registration_windows w
     WHERE w.term_id = t.id AND w.is_active
       AND now() BETWEEN w.open_at AND w.close_at)   AS open_windows,
  (SELECT count(*) FROM public.course_sections cs
     WHERE cs.term_id = t.id AND COALESCE(cs.active, true)
       AND COALESCE(cs.section_status, 'open') <> 'cancelled') AS open_sections,
  public.evaluate_registrar_readiness(t.id) AS issues,
  (array_length(public.evaluate_registrar_readiness(t.id), 1) IS NULL
     OR array_length(public.evaluate_registrar_readiness(t.id), 1) = 0)
                                           AS is_registrar_ready
FROM public.academic_terms t;

COMMENT ON VIEW public.vw_registrar_critical_path IS
  'D4.1a per-term registrar critical-path scorecard. Surfaces whether each term has an open window, at least one active section, a reachable enroll RPC, and a registrable term status. Empty issues array = ready.';

GRANT SELECT ON public.vw_registrar_critical_path TO authenticated;
