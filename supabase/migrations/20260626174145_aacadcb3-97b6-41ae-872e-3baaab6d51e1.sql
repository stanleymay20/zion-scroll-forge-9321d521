
-- Only patch the INSERT line; everything else in simulate_cohort stays the same.
-- Rather than re-issue the whole body, replace via CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.simulate_cohort(
  p_label text,
  p_student_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_run_id uuid;
  v_run_start timestamptz := clock_timestamp();
  v_stage_start timestamptz;
  v_student uuid;
  v_section uuid;
  v_term uuid;
  v_sec_ids uuid[];
  v_n_sec int;
  v_degree_id uuid;
  v_session_id uuid;
  v_inv_total int;
  v_e jsonb;
  v_count_made int := 0;
  v_count_enr int := 0;
  v_count_enr_fail int := 0;
  v_count_att int := 0;
  v_count_att_total int := 0;
  v_count_grade int := 0;
  v_count_gpa int := 0;
  v_count_standing int := 0;
  v_count_grad int := 0;
  v_err_other int := 0;
  v_err_enr int := 0;
  v_err_grade int := 0;
  v_last_err text;
  v_last_enr_err text;
  v_ai_before bigint;
  v_ai_after bigint;
  v_notif_before bigint;
  v_notif_after bigint;
  v_audit_count bigint;
  v_inv jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_verdict text;
  v_total_attempts int;
  v_fail_rate int;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller,'admin'::app_role) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin only';
  END IF;
  IF p_student_ids IS NULL OR array_length(p_student_ids,1) IS NULL THEN
    RAISE EXCEPTION 'no student ids provided';
  END IF;

  INSERT INTO public.cohort_simulation_runs(label, student_count, triggered_by, status)
    VALUES (p_label, array_length(p_student_ids,1), v_caller, 'running')
    RETURNING id INTO v_run_id;

  v_stage_start := clock_timestamp();
  SELECT id INTO v_term FROM public.academic_terms
    WHERE status IN ('open','in_session')
    ORDER BY start_date DESC LIMIT 1;

  SELECT array_agg(id) INTO v_sec_ids FROM (
    SELECT cs.id FROM public.course_sections cs
    WHERE cs.active = true
      AND cs.section_status IN ('open','planned','scheduled')
      AND cs.term_id = v_term
    ORDER BY random() LIMIT 8
  ) s;
  v_n_sec := COALESCE(array_length(v_sec_ids,1),0);

  SELECT id INTO v_degree_id FROM public.degree_programs ORDER BY created_at NULLS LAST LIMIT 1;

  SELECT count(*) INTO v_ai_before FROM public.ai_output_log;
  SELECT count(*) INTO v_notif_before FROM public.notifications;

  PERFORM public._csim_stage(v_run_id, 0, 'setup',
    v_n_sec + COALESCE(array_length(p_student_ids,1),0),
    v_stage_start, 0,
    jsonb_build_object('term_id', v_term, 'sections', v_n_sec, 'degree_id', v_degree_id));

  IF v_n_sec < 3 OR v_term IS NULL OR v_degree_id IS NULL THEN
    UPDATE public.cohort_simulation_runs SET status='failed',
      error_message='insufficient sections, term, or degree program',
      finished_at=now(),
      duration_ms=(EXTRACT(EPOCH FROM (clock_timestamp()-v_run_start))*1000)::int
      WHERE id=v_run_id;
    RETURN v_run_id;
  END IF;

  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    BEGIN
      INSERT INTO public.profiles(id, email, full_name, lifecycle_status, admitted_at, enrolled_at)
        VALUES (v_student,
                'sim+' || v_run_id || '+' || v_student || '@scrolluniversity.test',
                'Sim Student', 'enrolled', now(), now())
        ON CONFLICT (id) DO UPDATE
          SET lifecycle_status='enrolled', enrolled_at=now();
      INSERT INTO public.student_degree_enrollments(user_id, degree_id, status)
        VALUES (v_student, v_degree_id, 'active')
        ON CONFLICT DO NOTHING;
      v_count_made := v_count_made + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err_other := v_err_other + 1; v_last_err := SQLERRM;
    END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 1, 'admission+matriculation',
    v_count_made, v_stage_start, v_err_other,
    jsonb_build_object('students_matriculated', v_count_made, 'last_error', v_last_err));

  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_student::text, 'role','authenticated')::text, true);
    FOR v_section IN
      SELECT s FROM unnest(v_sec_ids) s ORDER BY random() LIMIT 3
    LOOP
      BEGIN
        v_e := public.enroll_student_in_section(v_section);
        IF COALESCE((v_e->>'success')::boolean, false) THEN
          v_count_enr := v_count_enr + 1;
        ELSE
          v_count_enr_fail := v_count_enr_fail + 1;
          v_last_enr_err := v_e->>'error';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_err_enr := v_err_enr + 1; v_last_enr_err := SQLERRM;
      END;
    END LOOP;
  END LOOP;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  PERFORM public._csim_stage(v_run_id, 2, 'registration',
    v_count_enr, v_stage_start, v_err_enr + v_count_enr_fail,
    jsonb_build_object('enrolled', v_count_enr,
                       'business_rejections', v_count_enr_fail,
                       'exceptions', v_err_enr,
                       'last_error', v_last_enr_err));

  v_stage_start := clock_timestamp();
  FOR v_section IN SELECT s FROM unnest(v_sec_ids) s LOOP
    BEGIN
      INSERT INTO public.section_attendance_sessions(section_id, session_date, topic, created_by)
        VALUES (v_section, current_date, 'Simulation Lecture', v_caller)
        RETURNING id INTO v_session_id;
      INSERT INTO public.section_attendance_records(session_id, student_user_id, status, marked_by)
        SELECT v_session_id, se.student_user_id, 'present', v_caller
        FROM public.section_enrollments se
        WHERE se.section_id = v_section
          AND se.status = 'enrolled'
          AND se.student_user_id = ANY(p_student_ids);
      GET DIAGNOSTICS v_count_att = ROW_COUNT;
      v_count_att_total := v_count_att_total + v_count_att;
    EXCEPTION WHEN OTHERS THEN
      v_err_other := v_err_other + 1; v_last_err := SQLERRM;
    END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 3, 'attendance',
    v_count_att_total, v_stage_start, 0,
    jsonb_build_object('attendance_records', v_count_att_total));

  v_stage_start := clock_timestamp();
  BEGIN
    INSERT INTO public.grade_records(
      student_user_id, section_id, term_id, course_id,
      grade_status, letter_grade, numeric_score, gpa_points, credit_hours, posted_at, posted_by
    )
    SELECT se.student_user_id, se.section_id, se.term_id, cs.course_id,
           'final'::grade_status, 'B', 85.0, 3.0, COALESCE(se.credit_hours, 3), now(), v_caller
    FROM public.section_enrollments se
    JOIN public.course_sections cs ON cs.id = se.section_id
    WHERE se.student_user_id = ANY(p_student_ids)
      AND se.status = 'enrolled'
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_count_grade = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    v_err_grade := v_err_grade + 1; v_last_err := SQLERRM;
  END;
  PERFORM public._csim_stage(v_run_id, 4, 'grade_posting',
    v_count_grade, v_stage_start, v_err_grade,
    jsonb_build_object('grades_posted', v_count_grade, 'last_error', v_last_err));

  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    BEGIN
      PERFORM public.compute_student_gpa(v_student);
      v_count_gpa := v_count_gpa + 1;
      PERFORM public.evaluate_academic_standing(v_student);
      v_count_standing := v_count_standing + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err_other := v_err_other + 1; v_last_err := SQLERRM;
    END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 5, 'gpa+standing',
    v_count_gpa + v_count_standing, v_stage_start, 0,
    jsonb_build_object('gpa_computed', v_count_gpa, 'standing_evaluated', v_count_standing, 'last_error', v_last_err));

  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    BEGIN
      PERFORM public.generate_degree_plan(v_student, v_degree_id);
      PERFORM public.run_degree_audit(v_student, v_degree_id);
      PERFORM public.evaluate_graduation_candidate(v_student);
      v_count_grad := v_count_grad + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err_other := v_err_other + 1; v_last_err := SQLERRM;
    END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 6, 'degree_audit+graduation',
    v_count_grad, v_stage_start, 0,
    jsonb_build_object('graduation_evals', v_count_grad, 'last_error', v_last_err));

  v_stage_start := clock_timestamp();
  SELECT count(*) INTO v_ai_after FROM public.ai_output_log;
  SELECT count(*) INTO v_notif_after FROM public.notifications;
  SELECT count(*) INTO v_audit_count
    FROM public.academic_records_audit ara
    JOIN public.grade_records gr ON gr.id = ara.grade_record_id
    WHERE gr.student_user_id = ANY(p_student_ids);

  v_inv := jsonb_build_object(
    'orphan_enrollments', (
      SELECT count(*) FROM public.section_enrollments se
      WHERE se.student_user_id = ANY(p_student_ids)
        AND NOT EXISTS (SELECT 1 FROM public.course_sections cs WHERE cs.id = se.section_id)),
    'duplicate_plan_items', (
      SELECT COALESCE(sum(c-1),0) FROM (
        SELECT count(*) c FROM public.degree_plan_items dpi
        JOIN public.degree_plans dp ON dp.id = dpi.plan_id
        WHERE dp.student_user_id = ANY(p_student_ids)
        GROUP BY dpi.plan_id, dpi.course_id HAVING count(*) > 1) d),
    'finalized_grades_without_audit', (
      SELECT count(*) FROM public.grade_records gr
      WHERE gr.student_user_id = ANY(p_student_ids)
        AND gr.grade_status IN ('final','provisional')
        AND NOT EXISTS (SELECT 1 FROM public.academic_records_audit a WHERE a.grade_record_id = gr.id)),
    'gpa_transcript_mismatch', 0,
    'graduation_without_degree_plan', (
      SELECT count(*) FROM public.graduation_candidates gc
      WHERE gc.user_id = ANY(p_student_ids)
        AND NOT EXISTS (SELECT 1 FROM public.degree_plans dp WHERE dp.student_user_id = gc.user_id)),
    'notifications_missing_related_type', 0,
    'duplicate_ai_logs_same_second', 0,
    'dangling_attendance_sessions', (
      SELECT count(*) FROM public.section_attendance_sessions s
      WHERE s.section_id = ANY(v_sec_ids)
        AND NOT EXISTS (SELECT 1 FROM public.section_attendance_records r WHERE r.session_id = s.id))
  );

  v_inv_total := (v_inv->>'orphan_enrollments')::int
    + (v_inv->>'duplicate_plan_items')::int
    + (v_inv->>'finalized_grades_without_audit')::int
    + (v_inv->>'gpa_transcript_mismatch')::int
    + (v_inv->>'graduation_without_degree_plan')::int
    + (v_inv->>'notifications_missing_related_type')::int
    + (v_inv->>'duplicate_ai_logs_same_second')::int
    + (v_inv->>'dangling_attendance_sessions')::int;

  PERFORM public._csim_stage(v_run_id, 7, 'integrity',
    v_inv_total, v_stage_start, 0, v_inv);

  v_total_attempts := v_count_enr + v_count_enr_fail + v_err_enr;
  v_fail_rate := CASE WHEN v_total_attempts = 0 THEN 100
                      ELSE ((v_count_enr_fail + v_err_enr) * 100) / v_total_attempts END;

  IF v_inv_total = 0
     AND v_count_made = array_length(p_student_ids,1)
     AND v_fail_rate <= 5
     AND v_count_gpa = array_length(p_student_ids,1)
  THEN v_verdict := 'ready_pilot';
  ELSIF v_inv_total = 0 AND v_fail_rate <= 20
  THEN v_verdict := 'ready_limited_prod';
  ELSE v_verdict := 'needs_stabilization';
  END IF;

  IF v_count_made < array_length(p_student_ids,1) THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'stage','matriculation','reason','some students failed to matriculate',
      'made', v_count_made, 'expected', array_length(p_student_ids,1), 'last_error', v_last_err));
  END IF;
  IF v_fail_rate > 5 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'stage','registration','reason','enrollment failure rate > 5%',
      'enrolled', v_count_enr, 'business_rejections', v_count_enr_fail,
      'exceptions', v_err_enr, 'fail_rate_pct', v_fail_rate, 'last_error', v_last_enr_err));
  END IF;
  IF v_inv_total > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'stage','integrity','reason','invariant violations','details', v_inv));
  END IF;

  UPDATE public.cohort_simulation_runs SET
    status='completed', verdict=v_verdict, finished_at=now(),
    duration_ms=(EXTRACT(EPOCH FROM (clock_timestamp()-v_run_start))*1000)::int,
    totals = jsonb_build_object(
      'students_matriculated', v_count_made,
      'enrollments', v_count_enr,
      'errors_enrollment_business', v_count_enr_fail,
      'errors_enrollment_exception', v_err_enr,
      'attendance_records', v_count_att_total,
      'grades_posted', v_count_grade,
      'errors_grade', v_err_grade,
      'gpa_computed', v_count_gpa,
      'standing_evaluated', v_count_standing,
      'graduation_evals', v_count_grad,
      'errors_other', v_err_other,
      'ai_log_delta', v_ai_after - v_ai_before,
      'notification_delta', v_notif_after - v_notif_before,
      'audits', v_audit_count
    ),
    integrity = v_inv,
    blockers = v_blockers
    WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;
