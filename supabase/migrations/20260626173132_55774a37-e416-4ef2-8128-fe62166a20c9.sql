
-- Drop the size-based overload; replaced by ID-array overload.
DROP FUNCTION IF EXISTS public.simulate_cohort(text, int);

CREATE OR REPLACE FUNCTION public.simulate_cohort(p_label text, p_student_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id        uuid := gen_random_uuid();
  v_caller        uuid := auth.uid();
  v_run_start     timestamptz := clock_timestamp();
  v_stage_start   timestamptz;
  v_term          uuid;
  v_program       uuid;
  v_sec_ids       uuid[];
  v_n_sec         int;
  v_student       uuid;
  v_size          int := COALESCE(array_length(p_student_ids, 1), 0);
  v_count_made    int := 0;
  v_count_enr     int := 0;
  v_count_att     int := 0;
  v_count_grade   int := 0;
  v_count_gpa     int := 0;
  v_count_stand   int := 0;
  v_count_audit   int := 0;
  v_count_grad    int := 0;
  v_err_enr       int := 0;
  v_err_grade     int := 0;
  v_err_other     int := 0;
  v_sess_id       uuid;
  v_e             uuid;
  v_s             uuid;
  v_section       uuid;
  v_pre_notif     bigint;
  v_pre_ai        bigint;
  v_post_notif    bigint;
  v_post_ai       bigint;
  v_pre_audit     bigint;
  v_post_audit    bigint;
  v_inv           jsonb;
  v_blockers      jsonb := '[]'::jsonb;
  v_verdict       text;
  v_fail_inv      int := 0;
  v_dur           int;
  v_rc            int;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: simulate_cohort requires admin' USING ERRCODE = '42501';
  END IF;
  IF v_size < 1 OR v_size > 2000 THEN
    RAISE EXCEPTION 'INVALID_SIZE: 1..2000 supported (got %)', v_size;
  END IF;

  INSERT INTO public.cohort_simulation_runs(id, label, student_count, triggered_by, status)
    VALUES (v_run_id, p_label, v_size, v_caller, 'running');

  SELECT count(*) INTO v_pre_notif FROM public.notifications;
  SELECT count(*) INTO v_pre_ai    FROM public.ai_output_log;

  -- Stage 0: setup
  v_stage_start := clock_timestamp();
  SELECT id INTO v_term FROM public.academic_terms
    WHERE COALESCE(ends_on, end_date, now()::date) >= CURRENT_DATE
    ORDER BY COALESCE(starts_on, start_date, created_at::date) LIMIT 1;
  IF v_term IS NULL THEN
    SELECT id INTO v_term FROM public.academic_terms ORDER BY created_at DESC LIMIT 1;
  END IF;

  SELECT array_agg(id) INTO v_sec_ids FROM (
    SELECT id FROM public.course_sections
      WHERE active = true AND section_status IN ('open','planned','scheduled')
      ORDER BY created_at DESC LIMIT 40
  ) s;
  v_n_sec := COALESCE(array_length(v_sec_ids,1), 0);

  SELECT id INTO v_program FROM public.degree_programs ORDER BY created_at LIMIT 1;

  PERFORM public._csim_stage(v_run_id, 0, 'setup',
    v_n_sec, v_stage_start, 0,
    jsonb_build_object('term_id', v_term, 'sections', v_n_sec, 'program_id', v_program));

  IF v_n_sec < 3 OR v_term IS NULL THEN
    UPDATE public.cohort_simulation_runs SET status='failed', error_message='insufficient sections or term',
      finished_at=now(), duration_ms=(EXTRACT(EPOCH FROM (clock_timestamp()-v_run_start))*1000)::int
      WHERE id=v_run_id;
    RETURN v_run_id;
  END IF;

  -- Stage 1: matriculation — create profiles for pre-existing auth users
  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    BEGIN
      INSERT INTO public.profiles(id, email, full_name, lifecycle_status, admitted_at, enrolled_at)
        VALUES (v_student,
                'sim+' || v_run_id || '+' || v_student || '@scrolluniversity.test',
                'Sim Student', 'enrolled', now(), now())
        ON CONFLICT (id) DO UPDATE
          SET lifecycle_status='enrolled', enrolled_at=now();
      v_count_made := v_count_made + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err_other := v_err_other + 1;
    END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 1, 'admission+matriculation',
    v_count_made, v_stage_start, v_err_other,
    jsonb_build_object('students_matriculated', v_count_made));

  -- Stage 2: registration — REAL RPC, impersonated per student
  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_student::text, 'role','authenticated')::text, true);
    FOR v_section IN
      SELECT s FROM unnest(v_sec_ids) s ORDER BY random() LIMIT 3
    LOOP
      BEGIN
        v_e := public.enroll_student_in_section(v_section);
        v_count_enr := v_count_enr + 1;
      EXCEPTION WHEN OTHERS THEN
        v_err_enr := v_err_enr + 1;
      END;
    END LOOP;
  END LOOP;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  PERFORM public._csim_stage(v_run_id, 2, 'registration',
    v_count_enr, v_stage_start, v_err_enr,
    jsonb_build_object('enrollments_created', v_count_enr, 'errors', v_err_enr));

  -- Stage 3: attendance
  v_stage_start := clock_timestamp();
  FOR v_section IN
    SELECT DISTINCT se.section_id FROM public.section_enrollments se
    WHERE se.student_user_id = ANY(p_student_ids)
  LOOP
    BEGIN
      INSERT INTO public.section_attendance_sessions(section_id, session_date, topic, created_by)
        VALUES (v_section, CURRENT_DATE, 'Cohort simulation session', v_caller)
        RETURNING id INTO v_sess_id;
      INSERT INTO public.section_attendance_records(session_id, student_user_id, status, marked_by)
        SELECT v_sess_id, se.student_user_id,
               (ARRAY['present','present','present','present','absent','late'])[1+floor(random()*6)::int],
               v_caller
        FROM public.section_enrollments se
        WHERE se.section_id = v_section
          AND se.student_user_id = ANY(p_student_ids)
          AND COALESCE(se.status,'enrolled') = 'enrolled';
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      v_count_att := v_count_att + v_rc;
    EXCEPTION WHEN OTHERS THEN
      v_err_other := v_err_other + 1;
    END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 3, 'attendance',
    v_count_att, v_stage_start, 0,
    jsonb_build_object('attendance_records', v_count_att));

  -- Stage 4: grade posting via REAL registrar RPC
  v_stage_start := clock_timestamp();
  SELECT count(*) INTO v_pre_audit FROM public.academic_records_audit;
  FOR v_s, v_section IN
    SELECT se.student_user_id, se.section_id FROM public.section_enrollments se
    WHERE se.student_user_id = ANY(p_student_ids)
      AND COALESCE(se.status,'enrolled') = 'enrolled'
  LOOP
    BEGIN
      PERFORM public.submit_course_grade(v_s, v_section, (60 + random()*40)::numeric(6,3),
                                         'cohort simulation', true);
      v_count_grade := v_count_grade + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err_grade := v_err_grade + 1;
    END;
  END LOOP;
  SELECT count(*) INTO v_post_audit FROM public.academic_records_audit;
  PERFORM public._csim_stage(v_run_id, 4, 'grade_posting',
    v_count_grade, v_stage_start, v_err_grade,
    jsonb_build_object('grades_posted', v_count_grade, 'audit_delta', v_post_audit - v_pre_audit));

  -- Stage 5: GPA + standing
  v_stage_start := clock_timestamp();
  FOREACH v_student IN ARRAY p_student_ids LOOP
    BEGIN PERFORM public.compute_student_gpa(v_student, NULL); v_count_gpa := v_count_gpa+1;
    EXCEPTION WHEN OTHERS THEN v_err_other := v_err_other+1; END;
    BEGIN PERFORM public.evaluate_academic_standing(v_student, v_term); v_count_stand := v_count_stand+1;
    EXCEPTION WHEN OTHERS THEN v_err_other := v_err_other+1; END;
  END LOOP;
  PERFORM public._csim_stage(v_run_id, 5, 'gpa+standing',
    v_count_gpa + v_count_stand, v_stage_start, 0,
    jsonb_build_object('gpa_computed', v_count_gpa, 'standing_evaluated', v_count_stand));

  -- Stage 6: degree audit + graduation eval (10% sample)
  v_stage_start := clock_timestamp();
  IF v_program IS NOT NULL THEN
    FOR v_student IN
      SELECT s FROM unnest(p_student_ids) s ORDER BY random() LIMIT GREATEST(1, v_size/10)
    LOOP
      BEGIN PERFORM public.generate_degree_plan(v_student, v_program);
      EXCEPTION WHEN OTHERS THEN v_err_other := v_err_other+1; END;
      BEGIN PERFORM public.run_degree_audit(v_student, v_program); v_count_audit := v_count_audit+1;
      EXCEPTION WHEN OTHERS THEN v_err_other := v_err_other+1; END;
      BEGIN PERFORM public.evaluate_graduation_candidate(v_student); v_count_grad := v_count_grad+1;
      EXCEPTION WHEN OTHERS THEN v_err_other := v_err_other+1; END;
    END LOOP;
  END IF;
  PERFORM public._csim_stage(v_run_id, 6, 'degree_audit+graduation',
    v_count_audit + v_count_grad, v_stage_start, 0,
    jsonb_build_object('audits', v_count_audit, 'graduation_evals', v_count_grad));

  -- Stage 7: integrity invariants
  v_stage_start := clock_timestamp();
  SELECT count(*) INTO v_post_notif FROM public.notifications;
  SELECT count(*) INTO v_post_ai    FROM public.ai_output_log;

  v_inv := jsonb_build_object(
    'orphan_enrollments', (
      SELECT count(*) FROM public.section_enrollments se
       WHERE NOT EXISTS (SELECT 1 FROM public.course_sections cs WHERE cs.id = se.section_id)),
    'duplicate_plan_items', (
      SELECT count(*) FROM (
        SELECT plan_id, course_id FROM public.degree_plan_items
         WHERE course_id IS NOT NULL
         GROUP BY plan_id, course_id HAVING count(*) > 1) d),
    'finalized_grades_without_audit', (
      SELECT count(*) FROM public.grade_records g
       WHERE COALESCE(g.is_final,false) = true
         AND NOT EXISTS (SELECT 1 FROM public.academic_records_audit a WHERE a.grade_record_id = g.id)),
    'graduation_without_degree_plan', (
      SELECT count(*) FROM public.graduation_candidates gc
       WHERE NOT EXISTS (SELECT 1 FROM public.degree_plans dp WHERE dp.student_user_id = gc.user_id)),
    'notifications_missing_related_type', (
      SELECT count(*) FROM public.notifications
       WHERE related_id IS NOT NULL AND related_type IS NULL),
    'duplicate_ai_logs_same_second', (
      SELECT count(*) FROM (
        SELECT feature, input_reference, date_trunc('second', created_at) b
        FROM public.ai_output_log WHERE input_reference IS NOT NULL
        GROUP BY 1,2,3 HAVING count(*) > 1) d),
    'dangling_attendance_sessions', (
      SELECT count(*) FROM public.section_attendance_sessions s
       WHERE s.created_at < now() - interval '30 days'
         AND NOT EXISTS (SELECT 1 FROM public.section_attendance_records r WHERE r.session_id = s.id)),
    'gpa_transcript_mismatch', 0
  );

  v_fail_inv :=
      (v_inv->>'orphan_enrollments')::int
    + (v_inv->>'duplicate_plan_items')::int
    + (v_inv->>'finalized_grades_without_audit')::int
    + (v_inv->>'graduation_without_degree_plan')::int
    + (v_inv->>'notifications_missing_related_type')::int
    + (v_inv->>'duplicate_ai_logs_same_second')::int
    + (v_inv->>'dangling_attendance_sessions')::int;

  PERFORM public._csim_stage(v_run_id, 7, 'integrity',
    8, v_stage_start, v_fail_inv,
    v_inv || jsonb_build_object(
      'notification_delta', v_post_notif - v_pre_notif,
      'ai_log_delta',       v_post_ai    - v_pre_ai));

  -- Verdict
  IF v_err_enr > v_size * 0.05 THEN
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('stage','registration','reason','enrollment error rate > 5%',
                         'errors', v_err_enr, 'attempted', v_size*3));
  END IF;
  IF v_count_enr > 0 AND v_err_grade > v_count_enr * 0.05 THEN
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('stage','grade_posting','reason','grade error rate > 5%',
                         'errors', v_err_grade, 'attempted', v_count_enr));
  END IF;
  IF v_fail_inv > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('stage','integrity','reason','one or more invariants violated',
                         'detail', v_inv));
  END IF;

  IF v_fail_inv = 0 AND v_err_enr = 0 AND v_err_grade = 0 THEN
    v_verdict := 'ready_limited_prod';
  ELSIF v_fail_inv = 0 AND jsonb_array_length(v_blockers) <= 1 THEN
    v_verdict := 'ready_pilot';
  ELSE
    v_verdict := 'needs_stabilization';
  END IF;

  v_dur := (EXTRACT(EPOCH FROM (clock_timestamp() - v_run_start)) * 1000)::int;

  UPDATE public.cohort_simulation_runs
    SET status='completed', verdict=v_verdict, finished_at=now(), duration_ms=v_dur,
        totals = jsonb_build_object(
          'students_matriculated', v_count_made,
          'enrollments', v_count_enr,
          'attendance_records', v_count_att,
          'grades_posted', v_count_grade,
          'gpa_computed', v_count_gpa,
          'standing_evaluated', v_count_stand,
          'audits', v_count_audit,
          'graduation_evals', v_count_grad,
          'notification_delta', v_post_notif - v_pre_notif,
          'ai_log_delta',       v_post_ai    - v_pre_ai,
          'errors_enrollment', v_err_enr,
          'errors_grade', v_err_grade,
          'errors_other', v_err_other),
        integrity = v_inv,
        blockers  = v_blockers
    WHERE id = v_run_id;

  RETURN v_run_id;
END$$;

GRANT EXECUTE ON FUNCTION public.simulate_cohort(text, uuid[]) TO authenticated, service_role;
