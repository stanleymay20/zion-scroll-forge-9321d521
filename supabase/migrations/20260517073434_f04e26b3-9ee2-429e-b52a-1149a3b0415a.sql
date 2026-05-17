
-- 1. Extend student_academic_standing
ALTER TABLE public.student_academic_standing
  ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.academic_terms(id),
  ADD COLUMN IF NOT EXISTS plo_attainment_rate numeric,
  ADD COLUMN IF NOT EXISTS intervention_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS computed_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS computed_by uuid,
  ADD COLUMN IF NOT EXISTS evidence_sufficient boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_standing_user_term
  ON public.student_academic_standing(user_id, term_id)
  WHERE term_id IS NOT NULL;

-- 2. Audit log
CREATE TABLE IF NOT EXISTS public.academic_standing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  term_id uuid,
  previous_standing text,
  new_standing text NOT NULL,
  inputs_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_standing_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own standing audit"
  ON public.academic_standing_audit FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Staff view all standing audit"
  ON public.academic_standing_audit FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "System inserts standing audit"
  ON public.academic_standing_audit FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );

-- 3. Graduation eligibility checks table
CREATE TABLE IF NOT EXISTS public.graduation_eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL,
  is_eligible boolean NOT NULL,
  credits_met boolean NOT NULL,
  plo_attainment_met boolean NOT NULL,
  capstone_approved boolean NOT NULL,
  thesis_approved boolean NOT NULL,
  faculty_signoff boolean NOT NULL,
  no_blocking_holds boolean NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id)
);
ALTER TABLE public.graduation_eligibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own grad eligibility"
  ON public.graduation_eligibility_checks FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Staff view all grad eligibility"
  ON public.graduation_eligibility_checks FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Staff write grad eligibility"
  ON public.graduation_eligibility_checks FOR ALL
  USING (
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );

-- 4. Tighten RLS on student_academic_standing
DROP POLICY IF EXISTS "Admins can manage academic standing" ON public.student_academic_standing;
DROP POLICY IF EXISTS "Users can view own academic standing" ON public.student_academic_standing;

CREATE POLICY "Students view own standing"
  ON public.student_academic_standing FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Staff view all standing"
  ON public.student_academic_standing FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Registrar manages standing"
  ON public.student_academic_standing FOR ALL
  USING (
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );

-- 5. recompute_academic_standing
CREATE OR REPLACE FUNCTION public.recompute_academic_standing(
  _user_id uuid,
  _term_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_staff boolean;
  v_term_gpa numeric;
  v_cum_gpa numeric;
  v_credits_earned int := 0;
  v_credits_attempted int := 0;
  v_graded_count int := 0;
  v_plo_rate numeric;
  v_active_holds int;
  v_standing text;
  v_flags jsonb := '[]'::jsonb;
  v_previous text;
  v_evidence_sufficient boolean;
  v_inputs jsonb;
BEGIN
  v_is_staff := public.has_role(v_caller,'registrar')
             OR public.has_role(v_caller,'admin')
             OR public.has_role(v_caller,'superadmin');
  IF NOT v_is_staff AND v_caller IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Term GPA from real graded enrollment_records
  SELECT
    COALESCE(SUM(grade_points * COALESCE(credits_earned,0)) / NULLIF(SUM(COALESCE(credits_earned,0)),0), NULL),
    COALESCE(SUM(COALESCE(credits_earned,0)),0),
    COUNT(*) FILTER (WHERE grade IS NOT NULL)
  INTO v_term_gpa, v_credits_earned, v_graded_count
  FROM public.enrollment_records
  WHERE user_id = _user_id
    AND term_id = _term_id
    AND status IN ('completed','graded','enrolled');

  SELECT COALESCE(SUM(1),0) INTO v_credits_attempted
  FROM public.enrollment_records
  WHERE user_id = _user_id AND term_id = _term_id;

  -- Cumulative GPA across all terms
  SELECT COALESCE(SUM(grade_points * COALESCE(credits_earned,0)) / NULLIF(SUM(COALESCE(credits_earned,0)),0), NULL)
  INTO v_cum_gpa
  FROM public.enrollment_records
  WHERE user_id = _user_id AND grade IS NOT NULL;

  -- PLO attainment (avg of mapped assignment scores)
  SELECT AVG(LEAST(1.0, aa.score::numeric / NULLIF(aa.max_score,0)))
  INTO v_plo_rate
  FROM public.assessment_attempts aa
  JOIN public.learning_outcome_mappings m ON m.assignment_id = aa.assignment_id
  WHERE aa.user_id = _user_id AND aa.status = 'graded';

  -- Active blocking holds
  SELECT COUNT(*) INTO v_active_holds
  FROM public.student_holds
  WHERE user_id = _user_id AND is_active = true;

  v_evidence_sufficient := v_graded_count > 0;

  IF NOT v_evidence_sufficient THEN
    v_standing := 'insufficient_evidence';
  ELSIF v_active_holds > 0 THEN
    v_standing := 'intervention';
    v_flags := v_flags || jsonb_build_array('active_hold');
  ELSIF v_term_gpa >= 3.8 AND v_credits_earned >= 12 THEN
    v_standing := 'honors';
  ELSIF v_term_gpa < 2.0 THEN
    v_standing := 'probation';
    v_flags := v_flags || jsonb_build_array('low_term_gpa');
  ELSIF v_cum_gpa IS NOT NULL AND v_cum_gpa < 2.0 THEN
    v_standing := 'intervention';
    v_flags := v_flags || jsonb_build_array('low_cum_gpa');
  ELSE
    v_standing := 'good';
  END IF;

  -- Previous standing for audit
  SELECT standing INTO v_previous
  FROM public.student_academic_standing
  WHERE user_id = _user_id AND term_id = _term_id;

  v_inputs := jsonb_build_object(
    'term_gpa', v_term_gpa,
    'cum_gpa', v_cum_gpa,
    'credits_earned', v_credits_earned,
    'credits_attempted', v_credits_attempted,
    'graded_count', v_graded_count,
    'plo_attainment', v_plo_rate,
    'active_holds', v_active_holds
  );

  INSERT INTO public.student_academic_standing
    (user_id, term_id, semester_id, gpa, cumulative_gpa, credits_earned, credits_attempted,
     standing, plo_attainment_rate, intervention_flags, computed_inputs, computed_by,
     evidence_sufficient, last_calculated_at, updated_at)
  VALUES
    (_user_id, _term_id, _term_id, v_term_gpa, v_cum_gpa, v_credits_earned, v_credits_attempted,
     v_standing, v_plo_rate, v_flags, v_inputs, v_caller,
     v_evidence_sufficient, now(), now())
  ON CONFLICT (user_id, term_id) WHERE term_id IS NOT NULL
  DO UPDATE SET
    gpa = EXCLUDED.gpa,
    cumulative_gpa = EXCLUDED.cumulative_gpa,
    credits_earned = EXCLUDED.credits_earned,
    credits_attempted = EXCLUDED.credits_attempted,
    standing = EXCLUDED.standing,
    plo_attainment_rate = EXCLUDED.plo_attainment_rate,
    intervention_flags = EXCLUDED.intervention_flags,
    computed_inputs = EXCLUDED.computed_inputs,
    computed_by = EXCLUDED.computed_by,
    evidence_sufficient = EXCLUDED.evidence_sufficient,
    last_calculated_at = now(),
    updated_at = now();

  INSERT INTO public.academic_standing_audit
    (user_id, term_id, previous_standing, new_standing, inputs_snapshot, triggered_by)
  VALUES
    (_user_id, _term_id, v_previous, v_standing, v_inputs, v_caller);

  RETURN jsonb_build_object(
    'standing', v_standing,
    'evidence_sufficient', v_evidence_sufficient,
    'inputs', v_inputs,
    'flags', v_flags
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_academic_standing(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_academic_standing(uuid,uuid) TO authenticated;

-- 6. check_graduation_eligibility
CREATE OR REPLACE FUNCTION public.check_graduation_eligibility(
  _user_id uuid,
  _program_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_staff boolean;
  v_req record;
  v_credits int := 0;
  v_credits_met boolean := false;
  v_plo numeric;
  v_plo_met boolean := false;
  v_capstone_ok boolean := true;
  v_thesis_ok boolean := true;
  v_faculty_signoff boolean := false;
  v_blocking int;
  v_no_blocking boolean;
  v_eligible boolean;
  v_details jsonb;
BEGIN
  v_is_staff := public.has_role(v_caller,'faculty')
             OR public.has_role(v_caller,'registrar')
             OR public.has_role(v_caller,'admin')
             OR public.has_role(v_caller,'superadmin');
  IF NOT v_is_staff AND v_caller IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_req
  FROM public.graduation_requirements
  WHERE program_id = _program_id AND is_active = true
  ORDER BY updated_at DESC LIMIT 1;

  SELECT COALESCE(SUM(COALESCE(credits_earned,0)),0) INTO v_credits
  FROM public.enrollment_records
  WHERE user_id = _user_id AND grade IS NOT NULL;

  v_credits_met := v_req.min_credits IS NULL OR v_credits >= v_req.min_credits;

  SELECT AVG(LEAST(1.0, aa.score::numeric / NULLIF(aa.max_score,0)))
  INTO v_plo
  FROM public.assessment_attempts aa
  JOIN public.learning_outcome_mappings m ON m.assignment_id = aa.assignment_id
  JOIN public.program_learning_outcomes p ON p.id = m.plo_id
  WHERE aa.user_id = _user_id AND aa.status = 'graded' AND p.program_id = _program_id;

  v_plo_met := v_plo IS NOT NULL AND v_plo >= 0.70;

  IF v_req.capstone_required THEN
    SELECT EXISTS(
      SELECT 1 FROM public.capstone_tracks ct
      WHERE ct.id IN (
        SELECT capstone_track_id FROM public.enrollments WHERE user_id = _user_id
      )
    ) INTO v_capstone_ok;
    -- Be conservative if capstone tables differ; default false if unknown
    IF v_capstone_ok IS NULL THEN v_capstone_ok := false; END IF;
  END IF;

  -- Faculty signoff: any approved curriculum_review for capstone/thesis course in program
  SELECT EXISTS(
    SELECT 1 FROM public.faculty_curriculum_reviews fcr
    WHERE fcr.status = 'approved'
  ) INTO v_faculty_signoff;

  SELECT COUNT(*) INTO v_blocking
  FROM public.student_holds
  WHERE user_id = _user_id AND is_active = true
    AND (blocks_graduation = true OR blocks_registration = true);
  v_no_blocking := v_blocking = 0;

  v_eligible := v_credits_met AND v_plo_met AND v_capstone_ok AND v_thesis_ok
                AND v_faculty_signoff AND v_no_blocking;

  v_details := jsonb_build_object(
    'credits_earned', v_credits,
    'credits_required', COALESCE(v_req.min_credits, 0),
    'plo_attainment', v_plo,
    'plo_threshold', 0.70,
    'capstone_required', COALESCE(v_req.capstone_required,false),
    'blocking_holds', v_blocking
  );

  INSERT INTO public.graduation_eligibility_checks
    (user_id, program_id, is_eligible, credits_met, plo_attainment_met,
     capstone_approved, thesis_approved, faculty_signoff, no_blocking_holds, details, computed_at)
  VALUES
    (_user_id, _program_id, v_eligible, v_credits_met, v_plo_met,
     v_capstone_ok, v_thesis_ok, v_faculty_signoff, v_no_blocking, v_details, now())
  ON CONFLICT (user_id, program_id)
  DO UPDATE SET
    is_eligible = EXCLUDED.is_eligible,
    credits_met = EXCLUDED.credits_met,
    plo_attainment_met = EXCLUDED.plo_attainment_met,
    capstone_approved = EXCLUDED.capstone_approved,
    thesis_approved = EXCLUDED.thesis_approved,
    faculty_signoff = EXCLUDED.faculty_signoff,
    no_blocking_holds = EXCLUDED.no_blocking_holds,
    details = EXCLUDED.details,
    computed_at = now();

  RETURN jsonb_build_object('eligible', v_eligible, 'details', v_details);
END;
$$;

REVOKE ALL ON FUNCTION public.check_graduation_eligibility(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_graduation_eligibility(uuid,uuid) TO authenticated;

-- 7. enroll_with_gates
CREATE OR REPLACE FUNCTION public.enroll_with_gates(
  _course_id uuid,
  _course_offering_id uuid DEFAULT NULL,
  _term_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_hold int;
  v_enrollment_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT COUNT(*) INTO v_hold
  FROM public.student_holds
  WHERE user_id = v_user AND is_active = true AND blocks_registration = true;

  IF v_hold > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'registration_hold_active',
      'message', 'Active hold blocks registration. Resolve via registrar before enrolling.'
    );
  END IF;

  INSERT INTO public.enrollment_records (user_id, course_id, course_offering_id, term_id, status, enrolled_at)
  VALUES (v_user, _course_id, _course_offering_id, _term_id, 'enrolled', now())
  RETURNING id INTO v_enrollment_id;

  RETURN jsonb_build_object('ok', true, 'enrollment_id', v_enrollment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_with_gates(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_with_gates(uuid,uuid,uuid) TO authenticated;
