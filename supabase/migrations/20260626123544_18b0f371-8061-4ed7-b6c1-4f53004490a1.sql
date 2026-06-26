
-- Phase E: Degree Plans + Graduation Engine

-- 1. Extend degree_plans
ALTER TABLE public.degree_plans
  ADD COLUMN IF NOT EXISTS degree_program_id uuid,
  ADD COLUMN IF NOT EXISTS last_audit_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_audit_summary jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_degree_plans_student_program
  ON public.degree_plans(student_user_id, degree_program_id);

-- 2. Extend degree_plan_items
ALTER TABLE public.degree_plan_items
  ADD COLUMN IF NOT EXISTS student_id uuid,
  ADD COLUMN IF NOT EXISTS degree_program_id uuid,
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS requirement_type text DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS recommended_year int,
  ADD COLUMN IF NOT EXISTS recommended_term text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS fulfilled_by_grade_record_id uuid,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS letter_grade text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_plan_items_student ON public.degree_plan_items(student_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_course ON public.degree_plan_items(course_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_course ON public.degree_plan_items(plan_id, course_id);

-- 3. Audit log
CREATE TABLE IF NOT EXISTS public.degree_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  student_id uuid,
  degree_program_id uuid,
  plan_id uuid,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.degree_audit_log TO authenticated;
GRANT ALL ON public.degree_audit_log TO service_role;
ALTER TABLE public.degree_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self or staff view degree audit"
  ON public.degree_audit_log FOR SELECT TO authenticated
  USING (student_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "System insert degree audit"
  ON public.degree_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_degree_audit_student ON public.degree_audit_log(student_id, created_at DESC);

-- 4. generate_degree_plan
CREATE OR REPLACE FUNCTION public.generate_degree_plan(_student_id uuid, _program_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id uuid;
  v_title text;
BEGIN
  SELECT 'Degree Plan: ' || title INTO v_title FROM public.degree_programs WHERE id=_program_id;

  INSERT INTO public.degree_plans(student_user_id, degree_program_id, title, status)
  VALUES (_student_id, _program_id, COALESCE(v_title,'Degree Plan'), 'draft')
  ON CONFLICT (student_user_id, degree_program_id) DO UPDATE
    SET title = EXCLUDED.title, updated_at = now()
  RETURNING id INTO v_plan_id;

  -- Populate items from program curriculum
  INSERT INTO public.degree_plan_items(
    plan_id, student_id, degree_program_id, course_id,
    course_code, course_title, credit_hours,
    requirement_type, required, sequence,
    recommended_year, recommended_term, status
  )
  SELECT
    v_plan_id, _student_id, _program_id, c.id,
    c.id::text, c.title, COALESCE(c.credit_hours,3),
    CASE WHEN dpc.is_required THEN 'core' ELSE 'elective' END,
    COALESCE(dpc.is_required, true),
    dpc.sequence_order,
    dpc.recommended_year, dpc.recommended_term,
    'planned'
  FROM public.degree_program_courses dpc
  JOIN public.courses c ON c.id = dpc.course_id
  WHERE dpc.degree_program_id = _program_id
    AND NOT EXISTS (
      SELECT 1 FROM public.degree_plan_items dpi
      WHERE dpi.plan_id = v_plan_id AND dpi.course_id = c.id
    );

  INSERT INTO public.degree_audit_log(event_type, student_id, degree_program_id, plan_id, actor_id, payload)
  VALUES ('plan_generated', _student_id, _program_id, v_plan_id, auth.uid(),
          jsonb_build_object('items_count', (SELECT count(*) FROM public.degree_plan_items WHERE plan_id=v_plan_id)));

  RETURN v_plan_id;
END $$;

-- 5. run_degree_audit
CREATE OR REPLACE FUNCTION public.run_degree_audit(_student_id uuid, _program_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_program_id uuid := _program_id;
  v_plan_id uuid;
  v_required_total numeric := 0;
  v_required_done numeric := 0;
  v_elective_total numeric := 0;
  v_elective_done numeric := 0;
  v_credits_total numeric := 0;
  v_credits_done numeric := 0;
  v_required_remaining jsonb;
  v_elective_remaining int := 0;
  v_failed jsonb;
  v_program_min_gpa numeric;
  v_program_total_credits int;
  v_gpa_stats jsonb;
  v_cum_gpa numeric;
  v_standing text;
  v_holds_count int := 0;
  v_completion_pct numeric := 0;
  v_eligible boolean := false;
  v_missing jsonb := '[]'::jsonb;
  v_summary jsonb;
BEGIN
  IF v_program_id IS NULL THEN
    SELECT degree_id INTO v_program_id
    FROM public.student_degree_enrollments
    WHERE user_id=_student_id AND status='active'
    ORDER BY enrolled_at DESC LIMIT 1;
  END IF;

  IF v_program_id IS NULL THEN
    RETURN jsonb_build_object('error','no_active_program');
  END IF;

  SELECT id INTO v_plan_id FROM public.degree_plans
   WHERE student_user_id=_student_id AND degree_program_id=v_program_id LIMIT 1;
  IF v_plan_id IS NULL THEN
    v_plan_id := public.generate_degree_plan(_student_id, v_program_id);
  END IF;

  SELECT min_gpa, total_credits INTO v_program_min_gpa, v_program_total_credits
  FROM public.degree_programs WHERE id=v_program_id;
  v_program_min_gpa := COALESCE(v_program_min_gpa, 2.0);
  v_program_total_credits := COALESCE(v_program_total_credits, 120);

  -- Credits done by requirement type
  SELECT
    COALESCE(SUM(credit_hours) FILTER (WHERE required), 0),
    COALESCE(SUM(credit_hours) FILTER (WHERE required AND status='completed'), 0),
    COALESCE(SUM(credit_hours) FILTER (WHERE NOT required), 0),
    COALESCE(SUM(credit_hours) FILTER (WHERE NOT required AND status='completed'), 0)
  INTO v_required_total, v_required_done, v_elective_total, v_elective_done
  FROM public.degree_plan_items WHERE plan_id=v_plan_id;

  v_credits_total := v_required_total + v_elective_total;
  v_credits_done  := v_required_done + v_elective_done;

  SELECT jsonb_agg(jsonb_build_object('course_id',course_id,'course_title',course_title,'credit_hours',credit_hours))
    INTO v_required_remaining
  FROM public.degree_plan_items
  WHERE plan_id=v_plan_id AND required AND status NOT IN ('completed','waived','transferred');

  SELECT count(*) INTO v_elective_remaining
  FROM public.degree_plan_items
  WHERE plan_id=v_plan_id AND NOT required AND status NOT IN ('completed','waived','transferred');

  SELECT jsonb_agg(jsonb_build_object('course_id',course_id,'course_title',course_title,'letter',letter_grade))
    INTO v_failed
  FROM public.degree_plan_items
  WHERE plan_id=v_plan_id AND status='failed';

  v_gpa_stats := public.compute_student_gpa(_student_id, NULL);
  v_cum_gpa := COALESCE((v_gpa_stats->>'cumulative_gpa')::numeric, 0);

  SELECT standing INTO v_standing
  FROM public.student_academic_standing
  WHERE user_id=_student_id ORDER BY updated_at DESC LIMIT 1;
  v_standing := COALESCE(v_standing, 'good_standing');

  SELECT count(*) INTO v_holds_count
  FROM public.student_holds
  WHERE user_id=_student_id AND is_active=true AND blocks_graduation=true;

  v_completion_pct := CASE WHEN v_program_total_credits > 0
    THEN LEAST(100, ROUND((v_credits_done / v_program_total_credits) * 100, 2))
    ELSE 0 END;

  -- Eligibility gates
  IF v_credits_done >= v_program_total_credits THEN ELSE
    v_missing := v_missing || jsonb_build_array(jsonb_build_object('rule','total_credits',
       'required',v_program_total_credits,'have',v_credits_done));
  END IF;
  IF v_required_remaining IS NULL OR jsonb_array_length(v_required_remaining)=0 THEN ELSE
    v_missing := v_missing || jsonb_build_array(jsonb_build_object('rule','required_courses_remaining',
       'count',jsonb_array_length(v_required_remaining)));
  END IF;
  IF v_cum_gpa >= v_program_min_gpa THEN ELSE
    v_missing := v_missing || jsonb_build_array(jsonb_build_object('rule','min_gpa',
       'required',v_program_min_gpa,'have',v_cum_gpa));
  END IF;
  IF v_standing IN ('academic_suspension','academic_probation') THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object('rule','academic_standing','have',v_standing));
  END IF;
  IF v_holds_count > 0 THEN
    v_missing := v_missing || jsonb_build_array(jsonb_build_object('rule','active_blocking_holds','count',v_holds_count));
  END IF;

  v_eligible := jsonb_array_length(v_missing) = 0;

  v_summary := jsonb_build_object(
    'student_id', _student_id,
    'degree_program_id', v_program_id,
    'plan_id', v_plan_id,
    'credits_required', v_program_total_credits,
    'credits_completed', v_credits_done,
    'required_credits_completed', v_required_done,
    'elective_credits_completed', v_elective_done,
    'required_remaining', COALESCE(v_required_remaining,'[]'::jsonb),
    'elective_remaining_count', v_elective_remaining,
    'failed', COALESCE(v_failed,'[]'::jsonb),
    'cumulative_gpa', v_cum_gpa,
    'min_gpa_required', v_program_min_gpa,
    'academic_standing', v_standing,
    'blocking_holds', v_holds_count,
    'completion_percentage', v_completion_pct,
    'eligible_for_graduation', v_eligible,
    'missing_requirements', v_missing,
    'computed_at', now()
  );

  UPDATE public.degree_plans
    SET last_audit_at = now(), last_audit_summary = v_summary, updated_at = now()
    WHERE id = v_plan_id;

  UPDATE public.student_degree_enrollments
    SET credits_completed = v_credits_done::int,
        credits_required = v_program_total_credits,
        gpa = v_cum_gpa,
        updated_at = now()
    WHERE user_id=_student_id AND degree_id=v_program_id;

  INSERT INTO public.degree_audit_log(event_type, student_id, degree_program_id, plan_id, actor_id, payload)
  VALUES ('audit_run', _student_id, v_program_id, v_plan_id, auth.uid(), v_summary);

  RETURN v_summary;
END $$;

-- 6. Grade -> degree_plan_item sync trigger
CREATE OR REPLACE FUNCTION public.trg_sync_plan_from_grade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_status text;
BEGIN
  v_new_status := CASE
    WHEN NEW.letter_grade IN ('W') THEN 'withdrawn'
    WHEN NEW.letter_grade = 'I' THEN 'enrolled'
    WHEN NEW.letter_grade = 'F' THEN 'failed'
    WHEN NEW.percentage IS NOT NULL AND NEW.percentage >= 60 THEN 'completed'
    ELSE 'enrolled'
  END;

  UPDATE public.degree_plan_items
    SET status = v_new_status,
        fulfilled_by_grade_record_id = CASE WHEN v_new_status='completed' THEN NEW.id ELSE fulfilled_by_grade_record_id END,
        fulfilled_at = CASE WHEN v_new_status='completed' THEN COALESCE(NEW.finalized_at, NEW.graded_at, now()) ELSE fulfilled_at END,
        letter_grade = NEW.letter_grade,
        updated_at = now()
    WHERE student_id = NEW.student_id AND course_id = NEW.course_id;

  INSERT INTO public.degree_audit_log(event_type, student_id, plan_id, actor_id, payload)
  SELECT 'plan_item_updated', NEW.student_id, dpi.plan_id, auth.uid(),
         jsonb_build_object('course_id',NEW.course_id,'status',v_new_status,'letter',NEW.letter_grade)
  FROM public.degree_plan_items dpi
  WHERE dpi.student_id=NEW.student_id AND dpi.course_id=NEW.course_id LIMIT 1;

  PERFORM public.run_degree_audit(NEW.student_id, NULL);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS grade_to_plan_sync ON public.grade_records;
CREATE TRIGGER grade_to_plan_sync
AFTER INSERT OR UPDATE ON public.grade_records
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_plan_from_grade();

-- 7. Enrollment -> auto plan trigger
CREATE OR REPLACE FUNCTION public.trg_auto_generate_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.degree_id IS NOT NULL THEN
    PERFORM public.generate_degree_plan(NEW.user_id, NEW.degree_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS auto_generate_plan ON public.student_degree_enrollments;
CREATE TRIGGER auto_generate_plan
AFTER INSERT OR UPDATE OF status, degree_id ON public.student_degree_enrollments
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_generate_plan();

-- 8. evaluate_graduation_candidate
CREATE OR REPLACE FUNCTION public.evaluate_graduation_candidate(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_summary jsonb;
  v_program_id uuid;
  v_eligible boolean;
  v_status text;
  v_completion numeric;
  v_check_id uuid;
  v_candidate_id uuid;
BEGIN
  v_summary := public.run_degree_audit(_student_id, NULL);
  IF v_summary ? 'error' THEN RETURN v_summary; END IF;

  v_program_id := (v_summary->>'degree_program_id')::uuid;
  v_eligible   := (v_summary->>'eligible_for_graduation')::boolean;
  v_completion := (v_summary->>'completion_percentage')::numeric;

  v_status := CASE
    WHEN v_eligible THEN 'eligible'
    WHEN v_completion >= 90 THEN 'pending_review'
    ELSE 'blocked'
  END;

  INSERT INTO public.graduation_eligibility_checks(
    user_id, program_id, is_eligible, credits_met, plo_attainment_met,
    capstone_approved, thesis_approved, faculty_signoff, no_blocking_holds, details
  ) VALUES (
    _student_id, v_program_id, v_eligible,
    (v_summary->>'credits_completed')::numeric >= (v_summary->>'credits_required')::numeric,
    true, -- PLO mastery: placeholder until Phase F
    true, true, true,
    (v_summary->>'blocking_holds')::int = 0,
    v_summary
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
    status = EXCLUDED.status,
    requirements_met = EXCLUDED.requirements_met,
    gpa_requirement_met = EXCLUDED.gpa_requirement_met,
    credits_requirement_met = EXCLUDED.credits_requirement_met,
    financial_clearance = EXCLUDED.financial_clearance,
    updated_at = now()
  RETURNING id INTO v_candidate_id;

  INSERT INTO public.degree_audit_log(event_type, student_id, degree_program_id, actor_id, payload)
  VALUES ('graduation_evaluated', _student_id, v_program_id, auth.uid(),
          jsonb_build_object('status',v_status,'eligibility_check_id',v_check_id,'candidate_id',v_candidate_id));

  RETURN jsonb_build_object('status',v_status,'candidate_id',v_candidate_id,'check_id',v_check_id,'summary',v_summary);
END $$;

-- 8b. unique for candidate upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_grad_candidates_user_program
  ON public.graduation_candidates(user_id, degree_program_id);
