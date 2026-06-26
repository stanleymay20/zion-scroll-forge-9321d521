
DROP FUNCTION IF EXISTS public.accreditation_readiness_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.course_outcome_attainment(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.program_outcome_attainment(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_student_clo_mastery(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_student_plo_mastery(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.record_graduation_override(uuid, uuid, text) CASCADE;

ALTER TABLE public.clo_plo_mapping
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS weight numeric(5,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS contribution_pct numeric(5,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS mapping_strength text NOT NULL DEFAULT 'primary' CHECK (mapping_strength IN ('primary','secondary','supporting')),
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS uq_clo_plo_pair ON public.clo_plo_mapping(clo_id, plo_id);

ALTER TABLE public.student_outcome_mastery
  ADD COLUMN IF NOT EXISTS clo_id uuid,
  ADD COLUMN IF NOT EXISTS plo_id uuid,
  ADD COLUMN IF NOT EXISTS program_id uuid,
  ADD COLUMN IF NOT EXISTS mastery_level text,
  ADD COLUMN IF NOT EXISTS evidence_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_evidence_at timestamptz,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trend text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_som_user_clo ON public.student_outcome_mastery(user_id, clo_id);
CREATE INDEX IF NOT EXISTS idx_som_user_plo ON public.student_outcome_mastery(user_id, plo_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_som_user_clo ON public.student_outcome_mastery(user_id, clo_id) WHERE clo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_som_user_plo ON public.student_outcome_mastery(user_id, plo_id) WHERE plo_id IS NOT NULL AND clo_id IS NULL;

CREATE TABLE IF NOT EXISTS public.assessment_outcome_alignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL, clo_id uuid NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 1.0,
  mastery_threshold numeric(5,2) NOT NULL DEFAULT 70,
  rubric_criteria jsonb, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, clo_id)
);
GRANT SELECT ON public.assessment_outcome_alignment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assessment_outcome_alignment TO authenticated;
GRANT ALL ON public.assessment_outcome_alignment TO service_role;
ALTER TABLE public.assessment_outcome_alignment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read alignment" ON public.assessment_outcome_alignment;
CREATE POLICY "Anyone read alignment" ON public.assessment_outcome_alignment FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Faculty admin manage alignment" ON public.assessment_outcome_alignment;
CREATE POLICY "Faculty admin manage alignment" ON public.assessment_outcome_alignment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'registrar'));

CREATE TABLE IF NOT EXISTS public.outcome_intervention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('clo','plo','course','program')),
  scope_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
  finding text NOT NULL, recommendation text,
  baseline_metric numeric, target_metric numeric, current_metric numeric,
  opened_by uuid, opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid, closed_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.outcome_intervention TO authenticated;
GRANT ALL ON public.outcome_intervention TO service_role;
ALTER TABLE public.outcome_intervention ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read interventions" ON public.outcome_intervention;
CREATE POLICY "Staff read interventions" ON public.outcome_intervention FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));
DROP POLICY IF EXISTS "Staff write interventions" ON public.outcome_intervention;
CREATE POLICY "Staff write interventions" ON public.outcome_intervention FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));
DROP POLICY IF EXISTS "Staff update interventions" ON public.outcome_intervention;
CREATE POLICY "Staff update interventions" ON public.outcome_intervention FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE IF NOT EXISTS public.outcome_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  student_id uuid, course_id uuid, program_id uuid, clo_id uuid, plo_id uuid,
  actor_id uuid, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.outcome_audit_log TO authenticated;
GRANT ALL ON public.outcome_audit_log TO service_role;
ALTER TABLE public.outcome_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Self staff read outcome audit" ON public.outcome_audit_log;
CREATE POLICY "Self staff read outcome audit" ON public.outcome_audit_log FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));
DROP POLICY IF EXISTS "System write outcome audit" ON public.outcome_audit_log;
CREATE POLICY "System write outcome audit" ON public.outcome_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.graduation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, program_id uuid NOT NULL, reason text NOT NULL,
  granted_by uuid NOT NULL, granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz, revoked_by uuid,
  UNIQUE(student_id, program_id)
);
GRANT SELECT, INSERT, UPDATE ON public.graduation_overrides TO authenticated;
GRANT ALL ON public.graduation_overrides TO service_role;
ALTER TABLE public.graduation_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Self staff read overrides" ON public.graduation_overrides;
CREATE POLICY "Self staff read overrides" ON public.graduation_overrides FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));
DROP POLICY IF EXISTS "Registrar write overrides" ON public.graduation_overrides;
CREATE POLICY "Registrar write overrides" ON public.graduation_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));
DROP POLICY IF EXISTS "Registrar update overrides" ON public.graduation_overrides;
CREATE POLICY "Registrar update overrides" ON public.graduation_overrides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE FUNCTION public.recompute_student_clo_mastery(_student_id uuid, _course_id uuid DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0;
BEGIN
  WITH clo_scope AS (
    SELECT clo.id AS clo_id, clo.course_id FROM public.course_learning_outcomes clo
    WHERE _course_id IS NULL OR clo.course_id = _course_id
  ),
  per_clo AS (
    SELECT cs.clo_id, cs.course_id,
      COALESCE(
        SUM(gr.percentage * COALESCE(aoa.weight,1)) FILTER (WHERE aoa.clo_id IS NOT NULL)
        / NULLIF(SUM(COALESCE(aoa.weight,1)) FILTER (WHERE aoa.clo_id IS NOT NULL),0),
        AVG(gr.percentage)
      ) AS pct,
      COUNT(*) FILTER (WHERE gr.percentage IS NOT NULL) AS evidence_count,
      MAX(COALESCE(gr.finalized_at, gr.graded_at)) AS last_evidence
    FROM clo_scope cs
    LEFT JOIN public.grade_records gr ON gr.student_id=_student_id AND gr.course_id=cs.course_id
    LEFT JOIN public.assessment_outcome_alignment aoa ON aoa.assignment_id=gr.assessment_id AND aoa.clo_id=cs.clo_id
    GROUP BY cs.clo_id, cs.course_id
  )
  INSERT INTO public.student_outcome_mastery(
    user_id, course_id, clo_id, score_pct, mastery_level,
    evidence_count, last_evidence_at, confidence, attempts, last_attempt_at, updated_at
  )
  SELECT _student_id, course_id, clo_id,
    GREATEST(0, LEAST(100, ROUND(COALESCE(pct,0))))::int,
    CASE WHEN pct IS NULL THEN 'no_evidence' WHEN pct >= 85 THEN 'advanced'
         WHEN pct >= 70 THEN 'proficient' WHEN pct >= 60 THEN 'developing' ELSE 'beginning' END,
    COALESCE(evidence_count,0), last_evidence,
    LEAST(1.0, COALESCE(evidence_count,0)::numeric / 3),
    COALESCE(evidence_count,0), last_evidence, now()
  FROM per_clo
  ON CONFLICT (user_id, clo_id) WHERE clo_id IS NOT NULL DO UPDATE SET
    score_pct=EXCLUDED.score_pct, mastery_level=EXCLUDED.mastery_level,
    evidence_count=EXCLUDED.evidence_count, last_evidence_at=EXCLUDED.last_evidence_at,
    confidence=EXCLUDED.confidence, attempts=EXCLUDED.attempts,
    last_attempt_at=EXCLUDED.last_attempt_at, updated_at=now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.outcome_audit_log(event_type, student_id, course_id, actor_id, payload)
  VALUES ('clo_mastery_recomputed', _student_id, _course_id, auth.uid(), jsonb_build_object('rows', v_count));
  RETURN v_count;
END $$;

CREATE FUNCTION public.recompute_student_plo_mastery(_student_id uuid, _program_id uuid DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0; v_program uuid := _program_id;
BEGIN
  IF v_program IS NULL THEN
    SELECT degree_id INTO v_program FROM public.student_degree_enrollments
     WHERE user_id=_student_id AND status='active' ORDER BY enrolled_at DESC LIMIT 1;
  END IF;
  IF v_program IS NULL THEN RETURN 0; END IF;

  WITH plo_rollup AS (
    SELECT plo.id AS plo_id,
      SUM(som.score_pct * cpm.weight * cpm.contribution_pct/100) / NULLIF(SUM(cpm.weight * cpm.contribution_pct/100),0) AS pct,
      SUM(som.evidence_count) AS evidence_count,
      MAX(som.last_evidence_at) AS last_evidence
    FROM public.program_learning_outcomes plo
    JOIN public.clo_plo_mapping cpm ON cpm.plo_id=plo.id
    LEFT JOIN public.student_outcome_mastery som ON som.user_id=_student_id AND som.clo_id=cpm.clo_id
    WHERE plo.program_id=v_program GROUP BY plo.id
  )
  INSERT INTO public.student_outcome_mastery(
    user_id, program_id, plo_id, score_pct, mastery_level,
    evidence_count, last_evidence_at, confidence, attempts, last_attempt_at, updated_at
  )
  SELECT _student_id, v_program, plo_id,
    GREATEST(0, LEAST(100, ROUND(COALESCE(pct,0))))::int,
    CASE WHEN pct IS NULL THEN 'no_evidence' WHEN pct >= 85 THEN 'advanced'
         WHEN pct >= 70 THEN 'proficient' WHEN pct >= 60 THEN 'developing' ELSE 'beginning' END,
    COALESCE(evidence_count,0), last_evidence,
    LEAST(1.0, COALESCE(evidence_count,0)::numeric / 5),
    COALESCE(evidence_count,0), last_evidence, now()
  FROM plo_rollup
  ON CONFLICT (user_id, plo_id) WHERE plo_id IS NOT NULL AND clo_id IS NULL DO UPDATE SET
    score_pct=EXCLUDED.score_pct, mastery_level=EXCLUDED.mastery_level,
    evidence_count=EXCLUDED.evidence_count, last_evidence_at=EXCLUDED.last_evidence_at,
    confidence=EXCLUDED.confidence, attempts=EXCLUDED.attempts,
    last_attempt_at=EXCLUDED.last_attempt_at, updated_at=now();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.student_academic_standing sas
    SET plo_attainment_rate = (
      SELECT AVG(score_pct) FROM public.student_outcome_mastery
      WHERE user_id=_student_id AND plo_id IS NOT NULL AND clo_id IS NULL AND program_id=v_program
    ), updated_at = now()
   WHERE sas.user_id=_student_id;

  INSERT INTO public.outcome_audit_log(event_type, student_id, program_id, actor_id, payload)
  VALUES ('plo_mastery_recomputed', _student_id, v_program, auth.uid(), jsonb_build_object('rows', v_count));
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.trg_grade_recompute_mastery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_student_clo_mastery(NEW.student_id, NEW.course_id);
  PERFORM public.recompute_student_plo_mastery(NEW.student_id, NULL);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS grade_to_mastery ON public.grade_records;
CREATE TRIGGER grade_to_mastery AFTER INSERT OR UPDATE ON public.grade_records
FOR EACH ROW EXECUTE FUNCTION public.trg_grade_recompute_mastery();

CREATE FUNCTION public.course_outcome_attainment(_course_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH per_clo AS (
    SELECT clo.id AS clo_id, clo.code, clo.statement,
      ROUND(AVG(som.score_pct)::numeric, 2) AS avg_mastery,
      COUNT(*) FILTER (WHERE som.score_pct >= 70) AS students_proficient,
      COUNT(*) FILTER (WHERE som.score_pct < 60)  AS students_at_risk,
      COUNT(som.id) AS total_students,
      COALESCE(SUM(som.evidence_count),0) AS evidence_count
    FROM public.course_learning_outcomes clo
    LEFT JOIN public.student_outcome_mastery som ON som.clo_id = clo.id
    WHERE clo.course_id = _course_id
    GROUP BY clo.id, clo.code, clo.statement
  )
  SELECT jsonb_build_object(
    'course_id', _course_id,
    'clo_stats', COALESCE(jsonb_agg(jsonb_build_object(
      'clo_id', clo_id, 'code', code, 'statement', statement,
      'avg_mastery', avg_mastery, 'students_proficient', students_proficient,
      'students_at_risk', students_at_risk, 'total_students', total_students,
      'evidence_count', evidence_count
    )), '[]'::jsonb)
  ) FROM per_clo;
$$;

CREATE FUNCTION public.program_outcome_attainment(_program_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH per_plo AS (
    SELECT plo.id AS plo_id, plo.code, plo.statement,
      ROUND(AVG(som.score_pct)::numeric, 2) AS avg_attainment,
      COUNT(*) FILTER (WHERE som.score_pct >= 70) AS students_proficient,
      COUNT(*) FILTER (WHERE som.score_pct < 60)  AS students_at_risk,
      COUNT(som.id) AS total_students
    FROM public.program_learning_outcomes plo
    LEFT JOIN public.student_outcome_mastery som ON som.plo_id = plo.id AND som.clo_id IS NULL
    WHERE plo.program_id = _program_id
    GROUP BY plo.id, plo.code, plo.statement
  )
  SELECT jsonb_build_object(
    'program_id', _program_id,
    'plo_stats', COALESCE(jsonb_agg(jsonb_build_object(
      'plo_id', plo_id, 'code', code, 'statement', statement,
      'avg_attainment', avg_attainment, 'students_proficient', students_proficient,
      'students_at_risk', students_at_risk, 'total_students', total_students
    )), '[]'::jsonb)
  ) FROM per_plo;
$$;

CREATE FUNCTION public.accreditation_readiness_score(_program_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plo_count int; v_clo_count int; v_mapped_clo int;
  v_avg_plo_attainment numeric; v_evidence_count int;
  v_total_grades int; v_score numeric;
BEGIN
  SELECT COUNT(*) INTO v_plo_count FROM public.program_learning_outcomes WHERE program_id=_program_id;
  SELECT COUNT(DISTINCT clo.id), COUNT(DISTINCT clo.id) FILTER (WHERE cpm.plo_id IS NOT NULL)
    INTO v_clo_count, v_mapped_clo
  FROM public.course_learning_outcomes clo
  LEFT JOIN public.clo_plo_mapping cpm ON cpm.clo_id=clo.id
  JOIN public.degree_program_courses dpc ON dpc.course_id=clo.course_id
  WHERE dpc.degree_program_id=_program_id;
  SELECT AVG(score_pct) INTO v_avg_plo_attainment
  FROM public.student_outcome_mastery som
  JOIN public.program_learning_outcomes plo ON plo.id=som.plo_id
  WHERE plo.program_id=_program_id AND som.clo_id IS NULL;
  SELECT COUNT(*) INTO v_evidence_count FROM public.outcome_evidence_links;
  SELECT COUNT(*) INTO v_total_grades FROM public.grade_records gr
   JOIN public.degree_program_courses dpc ON dpc.course_id=gr.course_id
   WHERE dpc.degree_program_id=_program_id;
  v_score := (
    (CASE WHEN v_plo_count >= 5 THEN 25 ELSE v_plo_count*5 END) +
    (CASE WHEN v_clo_count > 0 THEN 25.0 * v_mapped_clo / v_clo_count ELSE 0 END) +
    (CASE WHEN v_avg_plo_attainment IS NULL THEN 0 ELSE LEAST(25, v_avg_plo_attainment * 25/100) END) +
    (CASE WHEN v_total_grades > 0 THEN 25 ELSE 0 END)
  );
  RETURN jsonb_build_object(
    'program_id', _program_id,
    'plo_count', v_plo_count, 'clo_count', v_clo_count, 'mapped_clo_count', v_mapped_clo,
    'mapping_coverage_pct', CASE WHEN v_clo_count>0 THEN ROUND(100.0*v_mapped_clo/v_clo_count,2) ELSE 0 END,
    'avg_plo_attainment', ROUND(COALESCE(v_avg_plo_attainment,0),2),
    'evidence_count', v_evidence_count, 'graded_credits', v_total_grades,
    'readiness_score', ROUND(v_score,2), 'computed_at', now()
  );
END $$;

CREATE FUNCTION public.record_graduation_override(_student_id uuid, _program_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.graduation_overrides(student_id, program_id, reason, granted_by)
  VALUES (_student_id, _program_id, _reason, auth.uid())
  ON CONFLICT (student_id, program_id) DO UPDATE
    SET reason=EXCLUDED.reason, granted_by=auth.uid(), granted_at=now(), revoked_at=NULL, revoked_by=NULL
  RETURNING id INTO v_id;
  INSERT INTO public.outcome_audit_log(event_type, student_id, program_id, actor_id, payload)
  VALUES ('graduation_override_granted', _student_id, _program_id, auth.uid(), jsonb_build_object('reason',_reason));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.evaluate_graduation_candidate(_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_summary jsonb; v_program_id uuid; v_eligible boolean; v_status text;
  v_completion numeric; v_check_id uuid; v_candidate_id uuid;
  v_avg_plo numeric; v_plo_met boolean; v_has_override boolean;
BEGIN
  v_summary := public.run_degree_audit(_student_id, NULL);
  IF v_summary ? 'error' THEN RETURN v_summary; END IF;
  v_program_id := (v_summary->>'degree_program_id')::uuid;
  PERFORM public.recompute_student_plo_mastery(_student_id, v_program_id);

  SELECT AVG(score_pct) INTO v_avg_plo
  FROM public.student_outcome_mastery som
  JOIN public.program_learning_outcomes plo ON plo.id=som.plo_id
  WHERE som.user_id=_student_id AND plo.program_id=v_program_id AND som.clo_id IS NULL;

  SELECT EXISTS(SELECT 1 FROM public.graduation_overrides
    WHERE student_id=_student_id AND program_id=v_program_id AND revoked_at IS NULL) INTO v_has_override;

  v_plo_met := COALESCE(v_avg_plo,0) >= 70 OR v_has_override;
  v_eligible := (v_summary->>'eligible_for_graduation')::boolean AND v_plo_met;
  v_completion := (v_summary->>'completion_percentage')::numeric;
  v_status := CASE WHEN v_eligible THEN 'eligible'
                   WHEN v_completion >= 90 THEN 'pending_review'
                   ELSE 'blocked' END;
  v_summary := v_summary || jsonb_build_object('avg_plo_attainment', COALESCE(v_avg_plo,0),
                          'plo_attainment_met', v_plo_met, 'has_override', v_has_override);

  INSERT INTO public.graduation_eligibility_checks(
    user_id, program_id, is_eligible, credits_met, plo_attainment_met,
    capstone_approved, thesis_approved, faculty_signoff, no_blocking_holds, details
  ) VALUES (
    _student_id, v_program_id, v_eligible,
    (v_summary->>'credits_completed')::numeric >= (v_summary->>'credits_required')::numeric,
    v_plo_met, true, true, true,
    (v_summary->>'blocking_holds')::int = 0, v_summary
  ) RETURNING id INTO v_check_id;

  INSERT INTO public.graduation_candidates(
    user_id, degree_program_id, status, requirements_met,
    gpa_requirement_met, credits_requirement_met,
    spiritual_formation_met, capstone_completed, financial_clearance
  ) VALUES (
    _student_id, v_program_id, v_status, v_summary,
    (v_summary->>'cumulative_gpa')::numeric >= (v_summary->>'min_gpa_required')::numeric,
    (v_summary->>'credits_completed')::numeric >= (v_summary->>'credits_required')::numeric,
    true, true, (v_summary->>'blocking_holds')::int = 0
  )
  ON CONFLICT (user_id, degree_program_id) DO UPDATE SET
    status=EXCLUDED.status, requirements_met=EXCLUDED.requirements_met,
    gpa_requirement_met=EXCLUDED.gpa_requirement_met,
    credits_requirement_met=EXCLUDED.credits_requirement_met,
    financial_clearance=EXCLUDED.financial_clearance, updated_at=now()
  RETURNING id INTO v_candidate_id;

  INSERT INTO public.outcome_audit_log(event_type, student_id, program_id, actor_id, payload)
  VALUES ('graduation_evaluated', _student_id, v_program_id, auth.uid(),
          jsonb_build_object('status',v_status,'plo_met',v_plo_met,'avg_plo',v_avg_plo));

  RETURN jsonb_build_object('status',v_status,'candidate_id',v_candidate_id,'check_id',v_check_id,'summary',v_summary);
END $$;
