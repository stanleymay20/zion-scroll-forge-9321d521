
ALTER TABLE public.classroom_sessions
  ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lecturer_identity TEXT,
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'awaiting-publisher'
    CHECK (delivery_mode IN ('awaiting-publisher','avatar','audio','text','offline')),
  ADD COLUMN IF NOT EXISTS last_bootstrap_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_classroom_sessions_faculty ON public.classroom_sessions(faculty_id);

GRANT SELECT, INSERT, UPDATE ON public.classroom_sessions TO authenticated;
GRANT ALL ON public.classroom_sessions TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_sessions;
ALTER TABLE public.classroom_sessions REPLICA IDENTITY FULL;
