-- Verified Learning P0 — academic truth boundary
-- Students may observe their verified results and record benign activity,
-- but may not manufacture authoritative scores, mastery, completion, rewards,
-- or demonstrated skill evidence.

-- ---------------------------------------------------------------------
-- 1) Protect every historical quiz answer-key column from Data API reads.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='answer'
  ) THEN
    EXECUTE 'REVOKE SELECT (answer) ON public.quiz_questions FROM authenticated, anon';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='correct_answer'
  ) THEN
    EXECUTE 'REVOKE SELECT (correct_answer) ON public.quiz_questions FROM authenticated, anon';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Outcome mastery is a derived academic record: read-only to students.
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.student_outcome_mastery FROM authenticated;
GRANT SELECT ON public.student_outcome_mastery TO authenticated;

DROP POLICY IF EXISTS "Students manage their own outcome mastery" ON public.student_outcome_mastery;
DROP POLICY IF EXISTS "Students read their own outcome mastery" ON public.student_outcome_mastery;
CREATE POLICY "Students read their own outcome mastery"
  ON public.student_outcome_mastery
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Existing faculty/admin read policy is intentionally preserved.

-- ---------------------------------------------------------------------
-- 3) Module activity and verified module mastery are separate concerns.
--    Students may create a benign activity row and update activity telemetry,
--    but mastery/status/completion are system-owned.
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.student_module_progress FROM authenticated;
GRANT SELECT ON public.student_module_progress TO authenticated;
GRANT INSERT (user_id, module_id, time_spent, last_accessed)
  ON public.student_module_progress TO authenticated;
GRANT UPDATE (time_spent, last_accessed)
  ON public.student_module_progress TO authenticated;

DROP POLICY IF EXISTS "Users can manage own module progress" ON public.student_module_progress;
DROP POLICY IF EXISTS "Users can insert own module activity" ON public.student_module_progress;
DROP POLICY IF EXISTS "Users can update own module activity" ON public.student_module_progress;

CREATE POLICY "Users can insert own module activity"
  ON public.student_module_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND COALESCE(mastery_level,0) = 0
    AND COALESCE(status,'not_started') IN ('not_started','in_progress')
    AND completed_at IS NULL
  );

CREATE POLICY "Users can update own module activity"
  ON public.student_module_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) quiz_submissions.score drives reward issuance in the legacy reward
--    trigger, therefore submission creation must be trusted-server only.
-- ---------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.quiz_submissions FROM authenticated;
GRANT SELECT ON public.quiz_submissions TO authenticated;
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.quiz_submissions;

-- ---------------------------------------------------------------------
-- 5) Skill evidence ledger is append-only AND authority-bound.
--    Direct learner inserts are removed. Self-attestation remains possible
--    only through record_skill_evidence as low-authority inferred evidence.
-- ---------------------------------------------------------------------
REVOKE INSERT ON public.student_skill_events FROM authenticated;
DROP POLICY IF EXISTS "sse_service_insert" ON public.student_skill_events;

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
  v_is_privileged boolean := false;
  v_is_advisor boolean := false;
  v_confidence numeric;
  _id uuid;
BEGIN
  BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  PERFORM public.assert_not_maintenance();

  v_is_privileged :=
       public.has_role(v_actor,'faculty')
    OR public.has_role(v_actor,'admin')
    OR public.has_role(v_actor,'superadmin');

  SELECT EXISTS (
    SELECT 1 FROM public.advising_assignments
     WHERE student_user_id = _student
       AND advisor_user_id = v_actor
       AND active
  ) INTO v_is_advisor;

  IF NOT (_student = v_actor OR v_is_privileged OR v_is_advisor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _mastery < 0 OR _mastery > 100 THEN
    RAISE EXCEPTION 'mastery out of range';
  END IF;

  -- A learner may report only a low-authority inference about themselves.
  -- They cannot self-issue demonstrated evidence or impersonate trusted sources.
  IF _student = v_actor AND NOT v_is_privileged AND NOT v_is_advisor THEN
    IF _evidence_kind <> 'inferred' THEN
      RAISE EXCEPTION 'self_attestation_must_be_inferred';
    END IF;
    IF _source_type NOT IN ('self_claim','manual') THEN
      RAISE EXCEPTION 'self_attestation_source_not_allowed';
    END IF;
    v_confidence := LEAST(0.20, GREATEST(0, COALESCE(_confidence,0.20)));
  ELSE
    IF _evidence_kind NOT IN ('demonstrated','inferred') THEN
      RAISE EXCEPTION 'invalid evidence_kind';
    END IF;
    v_confidence := GREATEST(0, LEAST(1, COALESCE(_confidence,0.5)));
  END IF;

  INSERT INTO public.student_skill_events(
    user_id, skill_id, evidence_kind, source_type, source_id,
    mastery_score, confidence, occurred_at
  )
  VALUES (
    _student, _skill, _evidence_kind, _source_type, _source_id,
    _mastery, v_confidence, COALESCE(_occurred_at, now())
  )
  ON CONFLICT (user_id, skill_id, source_type,
               COALESCE(source_id,'00000000-0000-0000-0000-000000000000'::uuid))
    DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NOT NULL THEN
    PERFORM public.ops_log_write(
      'rpc', 'skill.evidence_recorded', 'info',
      format('Skill evidence %s (%s) for student %s', _id, _evidence_kind, _student),
      jsonb_build_object(
        'event_id', _id,
        'user_id', _student,
        'skill_id', _skill,
        'evidence_kind', _evidence_kind,
        'source_type', _source_type,
        'source_id', _source_id,
        'mastery', _mastery,
        'confidence', v_confidence,
        'actor_id', v_actor,
        'self_attested', (_student = v_actor AND NOT v_is_privileged AND NOT v_is_advisor)
      )
    );
  END IF;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.record_skill_evidence(uuid,uuid,text,text,uuid,numeric,numeric,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_skill_evidence(uuid,uuid,text,text,uuid,numeric,numeric,timestamptz)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.record_skill_evidence(uuid,uuid,text,text,uuid,numeric,numeric,timestamptz) IS
  'Verified Learning P0: direct skill-event insert is closed. Learners may self-attest only inferred self_claim/manual evidence capped at confidence 0.20; demonstrated evidence requires faculty/admin/advisor or trusted server context.';
