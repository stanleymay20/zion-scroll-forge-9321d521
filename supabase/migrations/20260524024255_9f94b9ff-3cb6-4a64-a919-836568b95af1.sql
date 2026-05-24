
-- ─── live_lecture_sessions ───────────────────────────────────────────────
CREATE TYPE public.lecture_mode AS ENUM ('live', 'recorded_ai', 'semi_live');
CREATE TYPE public.lecture_end_reason AS ENUM (
  'completed', 'student_left', 'provider_failed', 'fallback_exhausted',
  'timeout', 'kicked', 'error', 'unknown'
);

CREATE TABLE public.live_lecture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID,
  module_id UUID,
  faculty_id UUID,
  tutor_id UUID,
  lecture_mode public.lecture_mode NOT NULL DEFAULT 'live',
  provider_used TEXT,                 -- e.g. 'did', 'tavus', 'heygen', 'sovereign-musetalk', 'voice-only', 'text-only'
  provider_capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  end_reason public.lecture_end_reason,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lls_user ON public.live_lecture_sessions(user_id);
CREATE INDEX idx_lls_course ON public.live_lecture_sessions(course_id);
CREATE INDEX idx_lls_faculty ON public.live_lecture_sessions(faculty_id);
CREATE INDEX idx_lls_started ON public.live_lecture_sessions(started_at DESC);

ALTER TABLE public.live_lecture_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students view own lecture sessions"
  ON public.live_lecture_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins view all lecture sessions"
  ON public.live_lecture_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── live_lecture_events ─────────────────────────────────────────────────
CREATE TABLE public.live_lecture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_lecture_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,           -- provider_selected | fallback | mode_change | latency_degradation | intervention | disconnect | moderation | teaching_mode_change
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  estimated_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lle_session ON public.live_lecture_events(session_id);
CREATE INDEX idx_lle_type ON public.live_lecture_events(event_type);
CREATE INDEX idx_lle_created ON public.live_lecture_events(created_at DESC);

ALTER TABLE public.live_lecture_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students view own lecture events"
  ON public.live_lecture_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.live_lecture_sessions s
    WHERE s.id = live_lecture_events.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "admins view all lecture events"
  ON public.live_lecture_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
