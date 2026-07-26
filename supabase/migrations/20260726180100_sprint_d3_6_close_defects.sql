-- =====================================================================
-- Sprint D3.6-close — Skill Taxonomy defect fixes
-- =====================================================================
-- Findings from the D3.6-close audit against the D2 governance gate:
--
--  1. record_skill_evidence is SECURITY DEFINER with NO authorization
--     gate. Any authenticated user could insert evidence for any
--     student. RLS is bypassed by SECURITY DEFINER — the RLS policy
--     shape on student_skill_events is not a defence here. Add an
--     explicit gate: self-attest OR faculty/admin/superadmin OR the
--     active advisor of that student. Matches the sse_self_read
--     policy shape.
--
--  2. recompute_student_skill_mastery has the same issue and calls
--     record_skill_evidence internally. Gate identically.
--
--  3. Neither mutation RPC emits ops_log events. The spec required
--     audit for all mastery mutations. Add ops_log_write to both,
--     with a correlation_id in recompute so the batch is traceable.
--
--  4. Neither RPC gates on maintenance mode. Add
--     assert_not_maintenance() to both.
--
-- Skill mastery remains complementary to CLO/PLO — no changes to
-- grade_records, degree_audit, standing, or graduation clearance.
-- =====================================================================

-- ---------- 0. Substrate shims (D3.1/D3.4 pattern) --------------------
DO $shim$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='assert_not_maintenance'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.assert_not_maintenance() RETURNS void
      LANGUAGE plpgsql AS $f$ BEGIN RETURN; END $f$;
    $body$;
  END IF;
END$shim$;

DO $shim$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='ops_log_write'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.ops_log_write(
        _source text, _event text, _severity text DEFAULT 'info',
        _message text DEFAULT NULL, _context jsonb DEFAULT '{}'::jsonb,
        _correlation_id uuid DEFAULT NULL, _duration_ms integer DEFAULT NULL,
        _http_status integer DEFAULT NULL, _fingerprint text DEFAULT NULL
      ) RETURNS bigint LANGUAGE plpgsql AS $f$
      DECLARE _id bigint;
      BEGIN
        INSERT INTO public.ops_log (correlation_id, source, event, severity, actor_id,
                                    fingerprint, duration_ms, http_status, message, context)
        VALUES (COALESCE(_correlation_id, gen_random_uuid()), _source, _event, _severity,
                auth.uid(), _fingerprint, _duration_ms, _http_status, _message,
                COALESCE(_context,'{}'::jsonb))
        RETURNING id INTO _id;
        RETURN _id;
      END $f$
    $body$;
  END IF;
END$shim$;

-- ---------- 1. Shared authorization predicate -------------------------
CREATE OR REPLACE FUNCTION public.can_attest_skill_for(_student uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL AND (
         _student = auth.uid()
      OR public.has_role(auth.uid(),'faculty')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'superadmin')
      OR EXISTS (
        SELECT 1 FROM public.advising_assignments
         WHERE student_user_id = _student
           AND advisor_user_id = auth.uid()
           AND active
      )
    )
$$;
COMMENT ON FUNCTION public.can_attest_skill_for(uuid) IS
  'D3.6-close: shared predicate used by record_skill_evidence and '
  'recompute_student_skill_mastery to enforce the same authorization '
  'contract as the sse_self_read RLS policy, since SECURITY DEFINER '
  'RPCs bypass RLS by design.';

-- ---------- 2. record_skill_evidence (gated + audited) ---------------
CREATE OR REPLACE FUNCTION public.record_skill_evidence(
  _student uuid,
  _skill uuid,
  _evidence_kind text,
  _source_type text,
  _source_id uuid,
  _mastery numeric,
  _confidence numeric DEFAULT 0.5,
  _occurred_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid;
  _id uuid;
BEGIN
  BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  PERFORM public.assert_not_maintenance();

  IF NOT public.can_attest_skill_for(_student) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _evidence_kind NOT IN ('demonstrated','inferred') THEN
    RAISE EXCEPTION 'invalid evidence_kind';
  END IF;
  IF _mastery < 0 OR _mastery > 100 THEN
    RAISE EXCEPTION 'mastery out of range';
  END IF;

  INSERT INTO public.student_skill_events(
    user_id, skill_id, evidence_kind, source_type, source_id,
    mastery_score, confidence, occurred_at
  )
  VALUES (_student, _skill, _evidence_kind, _source_type, _source_id,
          _mastery, GREATEST(0, LEAST(1, _confidence)), COALESCE(_occurred_at, now()))
  ON CONFLICT (user_id, skill_id, source_type, COALESCE(source_id,'00000000-0000-0000-0000-000000000000'::uuid))
    DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NOT NULL THEN
    PERFORM public.ops_log_write(
      'rpc', 'skill.evidence_recorded', 'info',
      format('Skill evidence %s (%s) for student %s', _id, _evidence_kind, _student),
      jsonb_build_object(
        'event_id', _id, 'user_id', _student, 'skill_id', _skill,
        'evidence_kind', _evidence_kind, 'source_type', _source_type,
        'source_id', _source_id, 'mastery', _mastery, 'confidence', _confidence
      )
    );
  END IF;

  RETURN _id;
END $$;

-- ---------- 3. recompute_student_skill_mastery (gated + audited) -----
CREATE OR REPLACE FUNCTION public.recompute_student_skill_mastery(_student uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid;
  v_corr  uuid := gen_random_uuid();
  _inserted integer := 0;
  _row_id uuid;
  r record;
BEGIN
  BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  PERFORM public.assert_not_maintenance();

  IF NOT public.can_attest_skill_for(_student) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.ops_log_write(
    'rpc', 'skill.recompute_started', 'info',
    format('Recomputing skill mastery for student %s', _student),
    jsonb_build_object('user_id', _student),
    v_corr
  );

  -- module_progress evidence (demonstrated when mastery >= 70).
  -- Uses direct insert to avoid re-entering the outer RPC (which would
  -- re-do the gate and correlation-id per row); the ops_log detail row
  -- ships once per batch below.
  FOR r IN
    SELECT smp.user_id, ms.skill_id, smp.mastery_level, smp.updated_at, smp.module_id
      FROM public.student_module_progress smp
      JOIN public.module_skills ms ON ms.module_id = smp.module_id
     WHERE smp.user_id = _student AND smp.mastery_level >= 70
  LOOP
    INSERT INTO public.student_skill_events(
      user_id, skill_id, evidence_kind, source_type, source_id,
      mastery_score, confidence, occurred_at
    )
    VALUES (r.user_id, r.skill_id, 'demonstrated', 'module_progress', r.module_id,
            r.mastery_level, 0.6, r.updated_at)
    ON CONFLICT (user_id, skill_id, source_type, COALESCE(source_id,'00000000-0000-0000-0000-000000000000'::uuid))
      DO NOTHING
    RETURNING id INTO _row_id;

    IF _row_id IS NOT NULL THEN _inserted := _inserted + 1; END IF;
  END LOOP;

  PERFORM public.ops_log_write(
    'rpc', 'skill.recompute_completed', 'info',
    format('Skill mastery recompute finished: %s new event(s)', _inserted),
    jsonb_build_object('user_id', _student, 'inserted', _inserted),
    v_corr
  );

  RETURN _inserted;
END $$;

COMMENT ON FUNCTION public.record_skill_evidence(uuid,uuid,text,text,uuid,numeric,numeric,timestamptz) IS
  'Sprint D3.6 (closed by D3.6-close): auth-required, maintenance-gated, '
  'authorized (self OR faculty/admin OR active advisor), audited via ops_log. '
  'Skills are complementary to CLO/PLO — no impact on GPA, standing, or grading.';

COMMENT ON FUNCTION public.recompute_student_skill_mastery(uuid) IS
  'Sprint D3.6 (closed by D3.6-close): auth-required, maintenance-gated, '
  'authorized, audited with correlated ops_log batch.';
