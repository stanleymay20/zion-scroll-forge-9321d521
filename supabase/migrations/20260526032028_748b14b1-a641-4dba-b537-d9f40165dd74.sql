CREATE TABLE IF NOT EXISTS public.classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL UNIQUE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lecture_title TEXT NOT NULL,
  lecturer_bot_status TEXT NOT NULL DEFAULT 'idle' CHECK (lecturer_bot_status IN ('idle','joining','live','ended','error')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_sessions_course ON public.classroom_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_classroom_sessions_status ON public.classroom_sessions(status);

ALTER TABLE public.classroom_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled or faculty can view sessions"
ON public.classroom_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'faculty'::app_role)
  OR (
    course_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = classroom_sessions.course_id
        AND e.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Faculty can create sessions"
ON public.classroom_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'faculty'::app_role))
  AND created_by = auth.uid()
);

CREATE POLICY "Faculty can update sessions"
ON public.classroom_sessions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Admins can delete sessions"
ON public.classroom_sessions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_classroom_sessions_updated_at
BEFORE UPDATE ON public.classroom_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();