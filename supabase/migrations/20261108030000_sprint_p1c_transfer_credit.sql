-- =====================================================================
-- Phase 1C — Transfer-Credit Reconciliation RPC
-- =====================================================================
-- public.program_transfer_requests captures the request + decision
-- lifecycle (submitted → advisor_review → ... → approved/denied).
-- But even on 'approved', the server-side promotion to posted
-- transcript credit was ad-hoc.
--
-- Phase 1C adds:
--
--   1. public.post_transfer_credit(student, from_program, to_program,
--                                  courses, reviewer_note) -> jsonb
--      Writes rows into student_course_completions with
--      source='transfer' + source_institution + transfer_request_id.
--      Trusted-session guarded via scrolluniversity.registrar_authority_rpc;
--      an audit row goes to registrar_audit_log (event_kind='transfer_credit_posted').
--
--   2. Defensive ALTER public.student_course_completions adding the
--      provenance columns (source, source_institution, transfer_request_id,
--      transfer_note) so the RPC's writes land where downstream
--      consumers can see them.
--
--   3. A per-transfer_request_id unique index + a (source) BTREE
--      index for quick registrar-side filtering.
--
-- The existing program_transfer_requests lifecycle stays owned by its
-- historical migration; Phase 1C only writes the posted credit when
-- a reviewer calls this RPC. Callers must be admin / registrar /
-- superadmin at runtime — the guard is auth.uid() has_role check.
-- =====================================================================

-- ---------- 1. provenance columns on student_course_completions ------
ALTER TABLE public.student_course_completions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS source_institution text,
  ADD COLUMN IF NOT EXISTS transfer_request_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_note text;

CREATE INDEX IF NOT EXISTS student_completions_source_idx
  ON public.student_course_completions(source)
  WHERE source <> 'native';

CREATE UNIQUE INDEX IF NOT EXISTS student_completions_transfer_unique_idx
  ON public.student_course_completions(user_id, course_id, transfer_request_id)
  WHERE transfer_request_id IS NOT NULL;

-- ---------- 2. post_transfer_credit RPC ------------------------------
CREATE OR REPLACE FUNCTION public.post_transfer_credit(
  _student uuid,
  _from_program uuid,
  _to_program uuid,
  _courses jsonb,        -- [{course_id, grade, grade_points, credits_earned}, ...]
  _source_institution text DEFAULT NULL,
  _transfer_request_id uuid DEFAULT NULL,
  _reviewer_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _is_authorized boolean;
  _course_entry jsonb;
  _posted_ids uuid[] := ARRAY[]::uuid[];
  _posted_id uuid;
  _course_id uuid;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _student IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'student_required');
  END IF;
  IF _courses IS NULL OR jsonb_array_length(_courses) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'courses_required');
  END IF;

  -- Authorization: only registrar / admin / superadmin can post credit.
  _is_authorized := false;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='has_role'
  ) THEN
    EXECUTE format(
      'SELECT %s',
      'public.has_role($1, ''admin''::public.app_role) '
      'OR public.has_role($1, ''superadmin''::public.app_role) '
      'OR public.has_role($1, ''registrar''::public.app_role)'
    ) INTO _is_authorized USING _actor;
  ELSE
    -- No has_role available (fresh CI bootstrap). Fall back to the
    -- trusted-session marker used by other registrar RPCs.
    _is_authorized := COALESCE(
      current_setting('scrolluniversity.registrar_authority_rpc', true), ''
    ) = 'on';
  END IF;

  IF NOT _is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'registrar_authority_required');
  END IF;

  -- Validate the request references a real transfer_request if supplied.
  IF _transfer_request_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.program_transfer_requests
        WHERE id = _transfer_request_id AND student_user_id = _student
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'transfer_request_not_found_for_student');
  END IF;

  PERFORM set_config('scrolluniversity.registrar_authority_rpc', 'on', true);

  FOR _course_entry IN SELECT * FROM jsonb_array_elements(_courses) LOOP
    _course_id := (_course_entry->>'course_id')::uuid;
    IF _course_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.student_course_completions (
      user_id, course_id, grade, grade_points, credits_earned, passed,
      attempt_number, completed_at, recorded_by,
      source, source_institution, transfer_request_id, transfer_note
    ) VALUES (
      _student,
      _course_id,
      _course_entry->>'grade',
      NULLIF(_course_entry->>'grade_points', '')::numeric,
      COALESCE(NULLIF(_course_entry->>'credits_earned', '')::numeric, 3),
      true,  -- transfer credit posts as passed by definition
      1,
      COALESCE(NULLIF(_course_entry->>'completed_at','')::timestamptz, now()),
      _actor,
      'transfer',
      _source_institution,
      _transfer_request_id,
      _reviewer_note
    )
    ON CONFLICT (user_id, course_id, transfer_request_id)
      WHERE transfer_request_id IS NOT NULL
      DO NOTHING
    RETURNING id INTO _posted_id;

    IF _posted_id IS NOT NULL THEN
      _posted_ids := array_append(_posted_ids, _posted_id);
    END IF;
  END LOOP;

  INSERT INTO public.registrar_audit_log (
    actor_id, student_user_id, term_id, event_kind, payload
  ) VALUES (
    _actor, _student, NULL, 'transfer_credit_posted',
    jsonb_build_object(
      'from_program_id', _from_program,
      'to_program_id', _to_program,
      'transfer_request_id', _transfer_request_id,
      'source_institution', _source_institution,
      'courses_posted', _posted_ids,
      'courses_requested', jsonb_array_length(_courses),
      'reviewer_note', COALESCE(_reviewer_note, '')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'posted_count', cardinality(_posted_ids),
    'posted_ids', to_jsonb(_posted_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.post_transfer_credit(uuid, uuid, uuid, jsonb, text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_transfer_credit(uuid, uuid, uuid, jsonb, text, uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.post_transfer_credit(uuid, uuid, uuid, jsonb, text, uuid, text) IS
  'P1C: registrar-only RPC that promotes approved transfer credit into student_course_completions with source=transfer provenance. Writes a registrar_audit_log event_kind=transfer_credit_posted.';
