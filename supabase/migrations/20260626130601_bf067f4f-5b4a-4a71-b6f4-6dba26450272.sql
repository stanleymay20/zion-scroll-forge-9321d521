
CREATE TABLE IF NOT EXISTS public.section_attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  topic text,
  meets_start time,
  meets_end time,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section_id, session_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_attendance_sessions TO authenticated;
GRANT ALL ON public.section_attendance_sessions TO service_role;
ALTER TABLE public.section_attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty manage own section attendance sessions" ON public.section_attendance_sessions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.course_sections cs WHERE cs.id = section_id AND cs.instructor_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
WITH CHECK (EXISTS (SELECT 1 FROM public.course_sections cs WHERE cs.id = section_id AND cs.instructor_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "students view own attendance sessions" ON public.section_attendance_sessions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.section_enrollments se WHERE se.section_id = section_attendance_sessions.section_id AND se.student_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.section_attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.section_attendance_sessions(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes text,
  marked_by uuid NOT NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_attendance_records TO authenticated;
GRANT ALL ON public.section_attendance_records TO service_role;
ALTER TABLE public.section_attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty manage attendance records" ON public.section_attendance_records FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.section_attendance_sessions s JOIN public.course_sections cs ON cs.id = s.section_id
  WHERE s.id = session_id AND cs.instructor_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
WITH CHECK (EXISTS (SELECT 1 FROM public.section_attendance_sessions s JOIN public.course_sections cs ON cs.id = s.section_id
  WHERE s.id = session_id AND cs.instructor_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "students view own attendance records" ON public.section_attendance_records FOR SELECT TO authenticated
USING (student_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.student_advising_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL,
  faculty_user_id uuid NOT NULL,
  section_id uuid REFERENCES public.course_sections(id) ON DELETE SET NULL,
  course_id uuid,
  program_id uuid,
  note text NOT NULL,
  visibility text NOT NULL DEFAULT 'faculty_only' CHECK (visibility IN ('faculty_only','registrar_visible','student_visible')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_advising_notes TO authenticated;
GRANT ALL ON public.student_advising_notes TO service_role;
ALTER TABLE public.student_advising_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty manage own advising notes" ON public.student_advising_notes FOR ALL TO authenticated
USING (faculty_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
WITH CHECK (faculty_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "registrar reads registrar_visible notes" ON public.student_advising_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'registrar') AND visibility IN ('registrar_visible','student_visible'));
CREATE POLICY "students read student_visible notes" ON public.student_advising_notes FOR SELECT TO authenticated
USING (student_user_id = auth.uid() AND visibility = 'student_visible');

CREATE TABLE IF NOT EXISTS public.student_advising_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL,
  flagged_by uuid NOT NULL,
  flag_type text NOT NULL CHECK (flag_type IN ('at_risk','needs_support','academic_warning','attendance','outcome_gap','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  reason text,
  recommended_action text,
  section_id uuid REFERENCES public.course_sections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_advising_flags TO authenticated;
GRANT ALL ON public.student_advising_flags TO service_role;
ALTER TABLE public.student_advising_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty manage advising flags they raised" ON public.student_advising_flags FOR ALL TO authenticated
USING (flagged_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
WITH CHECK (flagged_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "students view own flags" ON public.student_advising_flags FOR SELECT TO authenticated
USING (student_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.faculty_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_kind text,
  target_id uuid,
  section_id uuid,
  student_user_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.faculty_audit_log TO authenticated;
GRANT ALL ON public.faculty_audit_log TO service_role;
ALTER TABLE public.faculty_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actor inserts own audit" ON public.faculty_audit_log FOR INSERT TO authenticated
WITH CHECK (actor_user_id = auth.uid());
CREATE POLICY "actor reads own audit" ON public.faculty_audit_log FOR SELECT TO authenticated
USING (actor_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

CREATE OR REPLACE FUNCTION public.section_attendance_summary(_section_id uuid)
RETURNS TABLE (student_user_id uuid, total_sessions int, present int, absent int, late int, excused int, attendance_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH sess AS (SELECT id FROM public.section_attendance_sessions WHERE section_id = _section_id),
  enrolled AS (SELECT student_user_id FROM public.section_enrollments WHERE section_id = _section_id AND status = 'enrolled')
  SELECT e.student_user_id,
    (SELECT count(*)::int FROM sess) AS total_sessions,
    count(*) FILTER (WHERE r.status = 'present')::int,
    count(*) FILTER (WHERE r.status = 'absent')::int,
    count(*) FILTER (WHERE r.status = 'late')::int,
    count(*) FILTER (WHERE r.status = 'excused')::int,
    CASE WHEN (SELECT count(*) FROM sess) = 0 THEN NULL
         ELSE round(100.0 * count(*) FILTER (WHERE r.status IN ('present','late','excused')) / (SELECT count(*) FROM sess), 1)
    END
  FROM enrolled e
  LEFT JOIN public.section_attendance_records r ON r.student_user_id = e.student_user_id AND r.session_id IN (SELECT id FROM sess)
  GROUP BY e.student_user_id;
$$;

CREATE TRIGGER trg_sas_updated BEFORE UPDATE ON public.section_attendance_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_san_updated BEFORE UPDATE ON public.student_advising_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saf_updated BEFORE UPDATE ON public.student_advising_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.section_attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.section_attendance_records(student_user_id);
CREATE INDEX IF NOT EXISTS idx_advising_notes_student ON public.student_advising_notes(student_user_id);
CREATE INDEX IF NOT EXISTS idx_advising_flags_student ON public.student_advising_flags(student_user_id);
CREATE INDEX IF NOT EXISTS idx_advising_flags_status ON public.student_advising_flags(status);
CREATE INDEX IF NOT EXISTS idx_faculty_audit_actor ON public.faculty_audit_log(actor_user_id, created_at DESC);
