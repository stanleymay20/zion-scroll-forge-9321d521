-- Launch P0: reassert the skill-evidence authority boundary in the live schema.
-- This forward migration exists because production drift showed an older
-- SECURITY DEFINER body could survive even while the repository regression
-- suite was green. Learners may self-attest only low-confidence inferred
-- evidence; demonstrated evidence requires trusted academic authority.

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_is_service boolean := false;
  v_is_privileged boolean := false;
  v_is_advisor boolean := false;
  v_confidence numeric;
  v_id uuid;
  v_claim_role text;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  v_claim_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '')
  );
  v_is_service := (v_claim_role = 'service_role');

  IF v_actor IS NULL AND NOT v_is_service THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  PERFORM public.assert_not_maintenance();

  IF v_actor IS NOT NULL THEN
    v_is_privileged :=
         public.has_role(v_actor, 'faculty'::public.app_role)
      OR public.has_role(v_actor, 'admin'::public.app_role)
      OR public.has_role(v_actor, 'superadmin'::public.app_role);

    SELECT EXISTS (
      SELECT 1
      FROM public.advising_assignments
      WHERE student_user_id = _student
        AND advisor_user_id = v_actor
        AND active
    ) INTO v_is_advisor;
  END IF;

  IF NOT v_is_service
     AND NOT (_student = v_actor OR v_is_privileged OR v_is_advisor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _mastery < 0 OR _mastery > 100 THEN
    RAISE EXCEPTION 'mastery out of range';
  END IF;

  -- Ordinary learners can only self-report low-authority inferred evidence.
  IF NOT v_is_service
     AND _student = v_actor
     AND NOT v_is_privileged
     AND NOT v_is_advisor THEN
    IF _evidence_kind <> 'inferred' THEN
      RAISE EXCEPTION 'self_attestation_must_be_inferred';
    END IF;
    IF _source_type NOT IN ('self_claim', 'manual') THEN
      RAISE EXCEPTION 'self_attestation_source_not_allowed';
    END IF;
    v_confidence := LEAST(0.20, GREATEST(0, COALESCE(_confidence, 0.20)));
  ELSE
    IF _evidence_kind NOT IN ('demonstrated', 'inferred') THEN
      RAISE EXCEPTION 'invalid evidence_kind';
    END IF;
    v_confidence := GREATEST(0, LEAST(1, COALESCE(_confidence, 0.5)));
  END IF;

  INSERT INTO public.student_skill_events(
    user_id, skill_id, evidence_kind, source_type, source_id,
    mastery_score, confidence, occurred_at
  ) VALUES (
    _student, _skill, _evidence_kind, _source_type, _source_id,
    _mastery, v_confidence, COALESCE(_occurred_at, now())
  )
  ON CONFLICT (
    user_id,
    skill_id,
    source_type,
    COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    PERFORM public.ops_log_write(
      'rpc',
      'skill.evidence_recorded',
      'info',
      format('Skill evidence %s (%s) for student %s', v_id, _evidence_kind, _student),
      jsonb_build_object(
        'event_id', v_id,
        'user_id', _student,
        'skill_id', _skill,
        'evidence_kind', _evidence_kind,
        'source_type', _source_type,
        'source_id', _source_id,
        'mastery', _mastery,
        'confidence', v_confidence,
        'actor_id', v_actor,
        'service_role', v_is_service,
        'self_attested', (
          NOT v_is_service
          AND _student = v_actor
          AND NOT v_is_privileged
          AND NOT v_is_advisor
        )
      )
    );
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_skill_evidence(
  uuid, uuid, text, text, uuid, numeric, numeric, timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_skill_evidence(
  uuid, uuid, text, text, uuid, numeric, numeric, timestamptz
) TO authenticated, service_role;

COMMENT ON FUNCTION public.record_skill_evidence(
  uuid, uuid, text, text, uuid, numeric, numeric, timestamptz
) IS 'Launch P0: learners may self-attest only inferred self_claim/manual evidence capped at confidence 0.20; demonstrated evidence requires faculty/admin/advisor or trusted service authority.';
