
-- drop any prior overloads so return-type changes are accepted
DROP FUNCTION IF EXISTS public.enroll_student_in_section(uuid);
DROP FUNCTION IF EXISTS public.drop_section_enrollment(uuid, text);
DROP FUNCTION IF EXISTS public.drop_section_enrollment(uuid);
DROP FUNCTION IF EXISTS public.promote_waitlist(uuid);
DROP FUNCTION IF EXISTS public.sections_overlap(uuid, uuid);

-- 1) Extend course_sections
ALTER TABLE public.course_sections
  ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.degree_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS campus text DEFAULT 'ScrollArk Virtual',
  ADD COLUMN IF NOT EXISTS enrolled_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS section_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS meets_days text,
  ADD COLUMN IF NOT EXISTS meets_start time,
  ADD COLUMN IF NOT EXISTS meets_end time,
  ADD COLUMN IF NOT EXISTS recommended_year int,
  ADD COLUMN IF NOT EXISTS instructor_label text;

CREATE UNIQUE INDEX IF NOT EXISTS course_sections_term_course_section_key
  ON public.course_sections (term_id, course_id, section_code)
  WHERE term_id IS NOT NULL AND course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_sections_term_idx ON public.course_sections (term_id);
CREATE INDEX IF NOT EXISTS course_sections_course_idx ON public.course_sections (course_id);

-- 2) Extend section_enrollments
ALTER TABLE public.section_enrollments
  ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS credit_hours numeric(4,1) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

CREATE INDEX IF NOT EXISTS section_enrollments_term_idx ON public.section_enrollments (term_id);
CREATE INDEX IF NOT EXISTS section_enrollments_student_idx ON public.section_enrollments (student_user_id, term_id);
CREATE UNIQUE INDEX IF NOT EXISTS section_enrollments_unique_active
  ON public.section_enrollments (section_id, student_user_id)
  WHERE status IN ('enrolled','waitlisted','requested');

-- 3) Registrar audit log
CREATE TABLE IF NOT EXISTS public.registrar_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  student_user_id uuid,
  section_id uuid,
  term_id uuid,
  event_kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.registrar_audit_log TO authenticated;
GRANT ALL ON public.registrar_audit_log TO service_role;
ALTER TABLE public.registrar_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads registrar audit" ON public.registrar_audit_log;
CREATE POLICY "Admin reads registrar audit" ON public.registrar_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role) OR has_role(auth.uid(),'registrar'::app_role));
DROP POLICY IF EXISTS "Student reads own registrar audit" ON public.registrar_audit_log;
CREATE POLICY "Student reads own registrar audit" ON public.registrar_audit_log
  FOR SELECT TO authenticated USING (student_user_id = auth.uid());
CREATE INDEX IF NOT EXISTS registrar_audit_student_idx ON public.registrar_audit_log (student_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS registrar_audit_section_idx ON public.registrar_audit_log (section_id, created_at DESC);

-- 4) Extend registration_windows
ALTER TABLE public.registration_windows
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS max_credits numeric(4,1) NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS min_credits numeric(4,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligible_levels text[] DEFAULT ARRAY['undergraduate','graduate','doctoral'];

-- 5) timetable overlap helper
CREATE FUNCTION public.sections_overlap(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_sections a, course_sections b
    WHERE a.id=_a AND b.id=_b
      AND a.meets_days IS NOT NULL AND b.meets_days IS NOT NULL
      AND a.meets_start IS NOT NULL AND b.meets_start IS NOT NULL
      AND a.meets_days ~* ('(' || regexp_replace(b.meets_days,'[^A-Za-z]','','g') || ')')
      AND tstzrange((current_date + a.meets_start)::timestamptz,
                    (current_date + a.meets_end)::timestamptz)
       && tstzrange((current_date + b.meets_start)::timestamptz,
                    (current_date + b.meets_end)::timestamptz)
  );
$$;

-- 6) Core enrollment RPC
CREATE FUNCTION public.enroll_student_in_section(_section_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

  IF _sec.course_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = _sec.course_id
        AND jsonb_typeof(c.prerequisite_courses) = 'array'
        AND jsonb_array_length(c.prerequisite_courses) > 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(c.prerequisite_courses) AS req(req_id)
          WHERE NOT EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.user_id = _user
              AND e.course_id::text = req.req_id
              AND e.completed_at IS NOT NULL
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

  RETURN jsonb_build_object('success',true,'status',_new_status,'enrollment_id',_new_id,'waitlist_position',_waitlist_pos);
END $$;
GRANT EXECUTE ON FUNCTION public.enroll_student_in_section(uuid) TO authenticated;

-- 7) Waitlist promotion
CREATE FUNCTION public.promote_waitlist(_section_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _next record; _sec record;
BEGIN
  SELECT * INTO _sec FROM course_sections WHERE id=_section_id;
  IF NOT FOUND OR _sec.enrolled_count >= _sec.seat_capacity THEN RETURN NULL; END IF;

  SELECT * INTO _next FROM section_enrollments
   WHERE section_id=_section_id AND status='waitlisted'
   ORDER BY waitlist_position ASC NULLS LAST, waitlisted_at ASC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE section_enrollments SET status='enrolled', promoted_at=now(), waitlist_position=NULL
   WHERE id=_next.id;
  UPDATE course_sections SET enrolled_count=enrolled_count+1,
                             waitlist_count=GREATEST(0,waitlist_count-1)
   WHERE id=_section_id;
  UPDATE section_enrollments SET waitlist_position = waitlist_position - 1
   WHERE section_id=_section_id AND status='waitlisted' AND waitlist_position IS NOT NULL;

  INSERT INTO registrar_audit_log (actor_id, student_user_id, section_id, term_id, event_kind, payload)
  VALUES (NULL, _next.student_user_id, _section_id, _next.term_id, 'waitlist_promoted',
          jsonb_build_object('enrollment_id',_next.id));
  RETURN _next.id;
END $$;
GRANT EXECUTE ON FUNCTION public.promote_waitlist(uuid) TO authenticated;

-- 8) Drop / Withdraw RPC
CREATE FUNCTION public.drop_section_enrollment(_enrollment_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _user uuid := auth.uid();
  _e record; _t record; _kind text; _new_status section_enrollment_status;
BEGIN
  SELECT * INTO _e FROM section_enrollments WHERE id = _enrollment_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','not_found'); END IF;
  IF _e.student_user_id <> _user
     AND NOT (has_role(_user,'admin'::app_role) OR has_role(_user,'registrar'::app_role)) THEN
    RETURN jsonb_build_object('success',false,'error','forbidden');
  END IF;
  SELECT * INTO _t FROM academic_terms WHERE id = _e.term_id;

  IF _t.add_drop_ends_on IS NULL OR current_date <= _t.add_drop_ends_on THEN
    _new_status := 'dropped'; _kind := 'student_dropped';
    UPDATE section_enrollments SET status='dropped', dropped_at=now() WHERE id=_e.id;
  ELSIF _t.withdraw_ends_on IS NULL OR current_date <= _t.withdraw_ends_on THEN
    _new_status := 'withdrawn'; _kind := 'student_withdrawn';
    UPDATE section_enrollments SET status='withdrawn', withdrawn_at=now() WHERE id=_e.id;
  ELSE
    RETURN jsonb_build_object('success',false,'error','past_withdrawal_deadline');
  END IF;

  IF _e.status = 'enrolled' THEN
    UPDATE course_sections SET enrolled_count = GREATEST(0,enrolled_count - 1),
           section_status = CASE WHEN enrolled_count - 1 < seat_capacity THEN 'open' ELSE section_status END
     WHERE id = _e.section_id;
  ELSIF _e.status = 'waitlisted' THEN
    UPDATE course_sections SET waitlist_count = GREATEST(0,waitlist_count - 1)
     WHERE id = _e.section_id;
  END IF;

  INSERT INTO registrar_audit_log (actor_id, student_user_id, section_id, term_id, event_kind, payload)
  VALUES (_user, _e.student_user_id, _e.section_id, _e.term_id, _kind,
          jsonb_build_object('enrollment_id',_e.id,'reason',_reason,'prior_status',_e.status));

  IF _new_status = 'dropped' AND _e.status = 'enrolled' THEN
    PERFORM public.promote_waitlist(_e.section_id);
  END IF;

  RETURN jsonb_build_object('success',true,'status',_new_status);
END $$;
GRANT EXECUTE ON FUNCTION public.drop_section_enrollment(uuid,text) TO authenticated;

-- 9) Views
CREATE OR REPLACE VIEW public.student_schedule_v
WITH (security_invoker=on) AS
SELECT se.id AS enrollment_id, se.student_user_id, se.term_id, se.status,
       cs.id AS section_id, cs.section_code, cs.course_code, cs.course_title,
       cs.meets_days, cs.meets_start, cs.meets_end, cs.room, cs.campus,
       cs.delivery_mode, cs.credit_hours, cs.instructor_label,
       t.name AS term_name, t.starts_on, t.ends_on
  FROM section_enrollments se
  JOIN course_sections cs ON cs.id = se.section_id
  LEFT JOIN academic_terms t ON t.id = se.term_id
 WHERE se.status IN ('enrolled','waitlisted');
GRANT SELECT ON public.student_schedule_v TO authenticated;

CREATE OR REPLACE VIEW public.section_utilization_v
WITH (security_invoker=on) AS
SELECT cs.id, cs.section_code, cs.course_code, cs.course_title, cs.term_id,
       cs.seat_capacity, cs.enrolled_count, cs.waitlist_count, cs.section_status,
       CASE WHEN cs.seat_capacity > 0
            THEN ROUND(100.0 * cs.enrolled_count / cs.seat_capacity, 1)
            ELSE 0 END AS utilization_pct
  FROM course_sections cs;
GRANT SELECT ON public.section_utilization_v TO authenticated;
