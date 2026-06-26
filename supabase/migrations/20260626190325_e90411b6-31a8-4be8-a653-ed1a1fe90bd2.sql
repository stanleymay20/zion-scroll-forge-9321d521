CREATE OR REPLACE FUNCTION public.enroll_student_in_section(_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _sec record; _term record; _window record;
  _current_credits numeric; _conflict_id uuid; _new_id uuid;
  _new_status section_enrollment_status; _waitlist_pos int;
BEGIN
  IF _user IS NULL THEN RETURN jsonb_build_object('success',false,'error','not_authenticated'); END IF;

  SELECT * INTO _sec FROM course_sections WHERE id = _section_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','section_not_found'); END IF;
  IF NOT _sec.active OR _sec.section_status = 'cancelled' THEN
    RETURN jsonb_build_object('success',false,'error','section_inactive');
  END IF;

  SELECT * INTO _term FROM academic_terms WHERE id = _sec.term_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','term_missing'); END IF;
  IF _term.status NOT IN ('open','in_session') THEN
    RETURN jsonb_build_object('success',false,'error','term_not_open');
  END IF;

  SELECT * INTO _window FROM registration_windows
   WHERE term_id = _sec.term_id AND is_active
     AND now() BETWEEN open_at AND close_at
   ORDER BY priority_order ASC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','no_open_window'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM student_degree_enrollments
    WHERE user_id = _user AND status IN ('active','enrolled')
  ) THEN
    RETURN jsonb_build_object('success',false,'error','no_active_degree_enrollment');
  END IF;

  IF EXISTS (
    SELECT 1 FROM section_enrollments
    WHERE section_id = _section_id AND student_user_id = _user
      AND status IN ('enrolled','waitlisted','requested')
  ) THEN
    RETURN jsonb_build_object('success',false,'error','already_enrolled_or_waitlisted');
  END IF;

  IF EXISTS (
    SELECT 1 FROM student_academic_standing
    WHERE user_id = _user AND standing IN ('suspended','dismissed')
  ) THEN
    RETURN jsonb_build_object('success',false,'error','academic_standing_blocked');
  END IF;

  -- Prerequisite check: satisfied by 100% course progress OR a finalized passing grade.
  IF _sec.course_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = _sec.course_id
        AND jsonb_typeof(c.prerequisite_courses) = 'array'
        AND jsonb_array_length(c.prerequisite_courses) > 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(c.prerequisite_courses) AS req(req_id)
          WHERE NOT (
            EXISTS (
              SELECT 1 FROM enrollments e
              WHERE e.user_id = _user
                AND e.course_id::text = req.req_id
                AND COALESCE(e.progress,0) >= 100
            )
            OR EXISTS (
              SELECT 1 FROM grade_records gr
              WHERE gr.student_id = _user
                AND gr.course_id::text = req.req_id
                AND COALESCE(gr.is_final,false) = true
                AND COALESCE(gr.grade_points,0) >= 1.0
            )
          )
        )
    ) THEN
      RETURN jsonb_build_object('success',false,'error','missing_prerequisites');
    END IF;
  END IF;

  SELECT COALESCE(SUM(credit_hours),0) INTO _current_credits
    FROM section_enrollments
   WHERE student_user_id = _user AND term_id = _sec.term_id
     AND status IN ('enrolled','waitlisted');
  IF _current_credits + COALESCE(_sec.credit_hours,3) > _window.max_credits THEN
    RETURN jsonb_build_object('success',false,'error','credit_limit_exceeded',
      'current_credits',_current_credits,'max_credits',_window.max_credits);
  END IF;

  SELECT se.section_id INTO _conflict_id
    FROM section_enrollments se
    JOIN course_sections cs ON cs.id = se.section_id
   WHERE se.student_user_id = _user AND se.term_id = _sec.term_id
     AND se.status = 'enrolled' AND cs.id <> _sec.id
     AND public.sections_overlap(cs.id, _sec.id)
   LIMIT 1;
  IF _conflict_id IS NOT NULL THEN
    RETURN jsonb_build_object('success',false,'error','timetable_conflict','conflicts_with',_conflict_id);
  END IF;

  IF _sec.enrolled_count < _sec.seat_capacity THEN
    _new_status := 'enrolled'; _waitlist_pos := NULL;
  ELSIF _sec.waitlist_count < COALESCE(_sec.waitlist_capacity,10) THEN
    _new_status := 'waitlisted'; _waitlist_pos := _sec.waitlist_count + 1;
  ELSE
    RETURN jsonb_build_object('success',false,'error','section_and_waitlist_full');
  END IF;

  INSERT INTO section_enrollments (section_id, student_user_id, status, waitlist_position,
                                   term_id, credit_hours, waitlisted_at)
  VALUES (_section_id, _user, _new_status, _waitlist_pos, _sec.term_id, COALESCE(_sec.credit_hours,3),
          CASE WHEN _new_status='waitlisted' THEN now() END)
  RETURNING id INTO _new_id;

  IF _new_status = 'enrolled' THEN
    UPDATE course_sections SET enrolled_count = enrolled_count + 1,
           section_status = CASE WHEN enrolled_count + 1 >= seat_capacity THEN 'full' ELSE 'open' END
     WHERE id = _section_id;
  ELSE
    UPDATE course_sections SET waitlist_count = waitlist_count + 1 WHERE id = _section_id;
  END IF;

  INSERT INTO registrar_audit_log (actor_id, student_user_id, section_id, term_id, event_kind, payload)
  VALUES (_user, _user, _section_id, _sec.term_id,
          CASE WHEN _new_status='enrolled' THEN 'student_enrolled' ELSE 'student_waitlisted' END,
          jsonb_build_object('enrollment_id',_new_id,'waitlist_position',_waitlist_pos));

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', _new_id,
    'status', _new_status,
    'waitlist_position', _waitlist_pos
  );
END
$function$;