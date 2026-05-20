CREATE TYPE public.section_enrollment_status AS ENUM ('requested','enrolled','waitlisted','dropped','withdrawn');

-- REGISTRATION PERIODS
CREATE TABLE public.registration_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_label TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'general',
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT registration_periods_window_chk CHECK (closes_at > opens_at)
);
CREATE INDEX idx_regper_term ON public.registration_periods(term_label);

ALTER TABLE public.registration_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views periods" ON public.registration_periods FOR SELECT USING (true);
CREATE POLICY "Admin manages periods" ON public.registration_periods FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- COURSE SECTIONS
CREATE TABLE public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_label TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_title TEXT,
  section_code TEXT NOT NULL,
  instructor_user_id UUID,
  seat_capacity INTEGER NOT NULL DEFAULT 30,
  waitlist_capacity INTEGER NOT NULL DEFAULT 10,
  meeting_info TEXT,
  credit_hours NUMERIC(4,2) NOT NULL DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_label, course_code, section_code)
);
CREATE INDEX idx_sections_term ON public.course_sections(term_label);
CREATE INDEX idx_sections_instructor ON public.course_sections(instructor_user_id);

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views sections" ON public.course_sections FOR SELECT USING (true);
CREATE POLICY "Admin manages sections" ON public.course_sections FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- SECTION ENROLLMENTS
CREATE TABLE public.section_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL,
  status public.section_enrollment_status NOT NULL DEFAULT 'requested',
  waitlist_position INTEGER,
  enrolled_at TIMESTAMPTZ,
  dropped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, student_user_id)
);
CREATE INDEX idx_secenr_student ON public.section_enrollments(student_user_id);

ALTER TABLE public.section_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student views own enrollments" ON public.section_enrollments
  FOR SELECT USING (auth.uid() = student_user_id);
CREATE POLICY "Instructor views roster" ON public.section_enrollments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.course_sections s WHERE s.id = section_id AND s.instructor_user_id = auth.uid()
  ));
CREATE POLICY "Admin manages enrollments" ON public.section_enrollments FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- ENROLLMENT EVENTS (immutable audit)
CREATE TABLE public.enrollment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.section_enrollments(id) ON DELETE CASCADE,
  event_kind TEXT NOT NULL,
  note TEXT,
  actor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enrev_enr ON public.enrollment_events(enrollment_id);

ALTER TABLE public.enrollment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views events" ON public.enrollment_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.section_enrollments e WHERE e.id = enrollment_id AND e.student_user_id = auth.uid()
  ));
CREATE POLICY "Admin views events" ON public.enrollment_events FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "Authorized inserts events" ON public.enrollment_events FOR INSERT
  WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_enrev_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Enrollment events are immutable'; END $$;
CREATE TRIGGER tg_enrev_no_update BEFORE UPDATE ON public.enrollment_events FOR EACH ROW EXECUTE FUNCTION public.tg_enrev_immutable();
CREATE TRIGGER tg_enrev_no_delete BEFORE DELETE ON public.enrollment_events FOR EACH ROW EXECUTE FUNCTION public.tg_enrev_immutable();

-- updated_at
CREATE TRIGGER tg_secenr_updated_at
  BEFORE UPDATE ON public.section_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REQUEST ENROLLMENT (with hold + period + capacity checks)
CREATE OR REPLACE FUNCTION public.request_section_enrollment(_section_id UUID)
RETURNS public.section_enrollments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_section public.course_sections;
  v_now TIMESTAMPTZ := now();
  v_open BOOLEAN;
  v_blocking_hold BOOLEAN;
  v_seats_taken INTEGER;
  v_waitlist_count INTEGER;
  v_status public.section_enrollment_status;
  v_position INTEGER;
  v_enrollment public.section_enrollments;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_section FROM public.course_sections WHERE id = _section_id AND active;
  IF v_section.id IS NULL THEN RAISE EXCEPTION 'Section not found or inactive'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.registration_periods
    WHERE term_label = v_section.term_label
      AND v_now BETWEEN opens_at AND closes_at
  ) INTO v_open;
  IF NOT v_open THEN RAISE EXCEPTION 'Registration is not open for term %', v_section.term_label; END IF;

  -- Best-effort: check for active blocking holds if table exists
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.account_holds
      WHERE student_user_id = v_uid AND released_at IS NULL
    ) INTO v_blocking_hold;
  EXCEPTION WHEN undefined_table THEN
    v_blocking_hold := false;
  END;
  IF v_blocking_hold THEN RAISE EXCEPTION 'Active hold blocks registration'; END IF;

  SELECT COUNT(*) INTO v_seats_taken
    FROM public.section_enrollments
   WHERE section_id = _section_id AND status = 'enrolled';

  IF v_seats_taken < v_section.seat_capacity THEN
    v_status := 'enrolled';
    v_position := NULL;
  ELSE
    SELECT COUNT(*) INTO v_waitlist_count
      FROM public.section_enrollments
     WHERE section_id = _section_id AND status = 'waitlisted';
    IF v_waitlist_count >= v_section.waitlist_capacity THEN
      RAISE EXCEPTION 'Section full and waitlist closed';
    END IF;
    v_status := 'waitlisted';
    v_position := v_waitlist_count + 1;
  END IF;

  INSERT INTO public.section_enrollments (section_id, student_user_id, status, waitlist_position, enrolled_at)
  VALUES (_section_id, v_uid, v_status, v_position,
          CASE WHEN v_status = 'enrolled' THEN v_now ELSE NULL END)
  RETURNING * INTO v_enrollment;

  INSERT INTO public.enrollment_events (enrollment_id, event_kind, note, actor_id)
  VALUES (v_enrollment.id, v_status::TEXT,
          CASE WHEN v_status = 'waitlisted' THEN 'Position ' || v_position ELSE 'Enrolled' END,
          v_uid);

  RETURN v_enrollment;
END $$;

-- DROP ENROLLMENT (student-initiated)
CREATE OR REPLACE FUNCTION public.drop_section_enrollment(_enrollment_id UUID, _reason TEXT)
RETURNS public.section_enrollments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_enrollment public.section_enrollments;
  v_promoted public.section_enrollments;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_enrollment FROM public.section_enrollments WHERE id = _enrollment_id;
  IF v_enrollment.id IS NULL THEN RAISE EXCEPTION 'Enrollment not found'; END IF;
  IF v_enrollment.student_user_id <> v_uid AND NOT (
       public.has_role(v_uid,'admin') OR public.has_role(v_uid,'superadmin') OR public.has_role(v_uid,'registrar'))
  THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_enrollment.status IN ('dropped','withdrawn') THEN RAISE EXCEPTION 'Already terminated'; END IF;

  UPDATE public.section_enrollments
     SET status = 'dropped', dropped_at = now()
   WHERE id = _enrollment_id
  RETURNING * INTO v_enrollment;

  INSERT INTO public.enrollment_events (enrollment_id, event_kind, note, actor_id)
  VALUES (_enrollment_id, 'dropped', _reason, v_uid);

  -- Promote top waitlister if a seat freed
  IF v_enrollment.status = 'dropped' THEN
    SELECT * INTO v_promoted FROM public.section_enrollments
     WHERE section_id = v_enrollment.section_id AND status = 'waitlisted'
     ORDER BY waitlist_position ASC NULLS LAST LIMIT 1;
    IF v_promoted.id IS NOT NULL THEN
      UPDATE public.section_enrollments
         SET status = 'enrolled', enrolled_at = now(), waitlist_position = NULL
       WHERE id = v_promoted.id;
      INSERT INTO public.enrollment_events (enrollment_id, event_kind, note, actor_id)
      VALUES (v_promoted.id, 'promoted_from_waitlist', 'Auto-promoted on seat release', v_uid);
    END IF;
  END IF;

  RETURN v_enrollment;
END $$;