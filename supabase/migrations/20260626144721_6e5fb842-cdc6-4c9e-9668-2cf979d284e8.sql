
CREATE TABLE IF NOT EXISTS public.executive_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('institution','faculty','department','program')),
  scope_id uuid NOT NULL,
  exec_role text NOT NULL CHECK (exec_role IN ('vice_chancellor','registrar','dean','hod','qa_officer','provost')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_type, scope_id, exec_role)
);

GRANT SELECT ON public.executive_scopes TO authenticated;
GRANT ALL ON public.executive_scopes TO service_role;

ALTER TABLE public.executive_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own scopes"
  ON public.executive_scopes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage scopes"
  ON public.executive_scopes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_exec_scopes_user ON public.executive_scopes(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exec_scopes_lookup ON public.executive_scopes(scope_type, scope_id) WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.has_executive_scope(
  _user_id uuid, _scope_type text, _scope_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.executive_scopes
    WHERE user_id = _user_id AND scope_type = _scope_type
      AND scope_id = _scope_id AND revoked_at IS NULL
  ) OR public.has_role(_user_id, 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.has_executive_scope(uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._exec_scope_sections(
  _scope_type text, _scope_id uuid
) RETURNS TABLE (section_id uuid, program_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cs.id, cs.program_id
  FROM public.course_sections cs
  LEFT JOIN public.courses c ON c.id = cs.course_id
  LEFT JOIN public.degree_programs dp ON dp.id = cs.program_id
  WHERE CASE _scope_type
    WHEN 'institution' THEN dp.institution_id = _scope_id OR c.institution_id = _scope_id
    WHEN 'faculty'     THEN c.faculty_id = _scope_id
    WHEN 'department'  THEN c.department_id = _scope_id
    WHEN 'program'     THEN cs.program_id = _scope_id
    ELSE false END;
$$;
REVOKE ALL ON FUNCTION public._exec_scope_sections(text, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_institutional_kpis(
  p_scope_type text, p_scope_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sections uuid[]; v_programs uuid[];
  v_enrollment_total int := 0; v_enrollment_active int := 0;
  v_avg_gpa numeric := 0; v_probation_rate numeric := 0;
  v_at_risk_count int := 0; v_grade_turnaround_hours numeric := 0;
  v_outcome_attainment numeric := 0; v_graduation_candidates int := 0;
BEGIN
  IF NOT public.has_executive_scope(auth.uid(), p_scope_type, p_scope_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED_FOR_SCOPE: %/%', p_scope_type, p_scope_id USING ERRCODE = '42501';
  END IF;

  SELECT
    coalesce(array_agg(DISTINCT s.section_id) FILTER (WHERE s.section_id IS NOT NULL), '{}'),
    coalesce(array_agg(DISTINCT s.program_id) FILTER (WHERE s.program_id IS NOT NULL), '{}')
    INTO v_sections, v_programs
  FROM public._exec_scope_sections(p_scope_type, p_scope_id) s;

  SELECT count(*), count(*) FILTER (WHERE status = 'enrolled')
    INTO v_enrollment_total, v_enrollment_active
  FROM public.section_enrollments WHERE section_id = ANY(v_sections);

  BEGIN
    SELECT round(avg(cumulative_gpa)::numeric, 3) INTO v_avg_gpa
    FROM public.student_academic_standing sas
    WHERE EXISTS (
      SELECT 1 FROM public.section_enrollments se
      WHERE se.student_user_id = sas.user_id AND se.section_id = ANY(v_sections));
  EXCEPTION WHEN OTHERS THEN v_avg_gpa := 0; END;

  BEGIN
    SELECT round(100.0 * count(*) FILTER (WHERE standing IN ('probation','warning','suspension'))
      / nullif(count(*),0), 2) INTO v_probation_rate
    FROM public.student_academic_standing sas
    WHERE EXISTS (
      SELECT 1 FROM public.section_enrollments se
      WHERE se.student_user_id = sas.user_id AND se.section_id = ANY(v_sections));
  EXCEPTION WHEN OTHERS THEN v_probation_rate := 0; END;

  BEGIN
    SELECT count(DISTINCT user_id) INTO v_at_risk_count
    FROM public.student_intervention_alerts
    WHERE resolved_at IS NULL AND user_id IN (
      SELECT student_user_id FROM public.section_enrollments WHERE section_id = ANY(v_sections));
  EXCEPTION WHEN OTHERS THEN v_at_risk_count := 0; END;

  BEGIN
    SELECT round(avg(extract(epoch from (posted_at - created_at))/3600.0)::numeric, 1)
      INTO v_grade_turnaround_hours
    FROM public.grade_records
    WHERE section_id = ANY(v_sections) AND posted_at IS NOT NULL
      AND created_at > now() - interval '180 days';
  EXCEPTION WHEN OTHERS THEN v_grade_turnaround_hours := 0; END;

  BEGIN
    SELECT round(avg(attainment_pct)::numeric, 2) INTO v_outcome_attainment
    FROM public.cohort_outcome_metrics WHERE program_id = ANY(v_programs);
  EXCEPTION WHEN OTHERS THEN v_outcome_attainment := 0; END;

  BEGIN
    SELECT count(*) INTO v_graduation_candidates
    FROM public.graduation_candidates
    WHERE degree_program_id = ANY(v_programs)
      AND status IN ('pending','eligible','approved');
  EXCEPTION WHEN OTHERS THEN v_graduation_candidates := 0; END;

  RETURN jsonb_build_object(
    'scope', jsonb_build_object('type', p_scope_type, 'id', p_scope_id),
    'as_of', now(),
    'sections_in_scope', coalesce(array_length(v_sections,1), 0),
    'programs_in_scope', coalesce(array_length(v_programs,1), 0),
    'enrollment', jsonb_build_object('total', v_enrollment_total, 'active', v_enrollment_active),
    'academic', jsonb_build_object(
      'avg_gpa', coalesce(v_avg_gpa, 0),
      'probation_rate_pct', coalesce(v_probation_rate, 0),
      'at_risk_students', v_at_risk_count),
    'faculty', jsonb_build_object('avg_grade_turnaround_hours', coalesce(v_grade_turnaround_hours, 0)),
    'quality', jsonb_build_object('outcome_attainment_pct', coalesce(v_outcome_attainment, 0)),
    'graduation', jsonb_build_object('pending_candidates', v_graduation_candidates)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_institutional_kpis(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_executive_scopes()
RETURNS TABLE (scope_type text, scope_id uuid, exec_role text, label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT es.scope_type, es.scope_id, es.exec_role,
    CASE es.scope_type
      WHEN 'institution' THEN (SELECT name  FROM public.institutions    WHERE id = es.scope_id)
      WHEN 'faculty'     THEN (SELECT name  FROM public.faculties       WHERE id = es.scope_id)
      WHEN 'department'  THEN (SELECT name  FROM public.departments     WHERE id = es.scope_id)
      WHEN 'program'     THEN (SELECT title FROM public.degree_programs WHERE id = es.scope_id)
    END AS label
  FROM public.executive_scopes es
  WHERE es.user_id = auth.uid() AND es.revoked_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.list_my_executive_scopes() TO authenticated;

CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_executive_scopes_touch ON public.executive_scopes;
CREATE TRIGGER trg_executive_scopes_touch
  BEFORE UPDATE ON public.executive_scopes
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
