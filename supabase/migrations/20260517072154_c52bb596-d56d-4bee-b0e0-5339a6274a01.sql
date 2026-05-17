
-- ============================================================
-- PR2 Phase B — Tutor Pedagogy Engine
-- ============================================================

-- 1. tutor_student_memory ------------------------------------
CREATE TABLE IF NOT EXISTS public.tutor_student_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  misconceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weak_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_pace text NOT NULL DEFAULT 'balanced'
    CHECK (preferred_pace IN ('slow','balanced','fast')),
  current_mode text NOT NULL DEFAULT 'lecture'
    CHECK (current_mode IN ('lecture','socratic','coaching','revision','assessment_prep','practicum_reflection')),
  consecutive_low_scores integer NOT NULL DEFAULT 0,
  intervention_flag boolean NOT NULL DEFAULT false,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_tsm_user_course
  ON public.tutor_student_memory(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_tsm_intervention
  ON public.tutor_student_memory(intervention_flag) WHERE intervention_flag = true;

ALTER TABLE public.tutor_student_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tsm_student_select_own"
  ON public.tutor_student_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tsm_staff_select_all"
  ON public.tutor_student_memory FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'registrar')
  );

CREATE POLICY "tsm_student_upsert_own"
  ON public.tutor_student_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tsm_student_update_own"
  ON public.tutor_student_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_tutor_student_memory()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_tsm ON public.tutor_student_memory;
CREATE TRIGGER trg_touch_tsm
  BEFORE UPDATE ON public.tutor_student_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_tutor_student_memory();

-- 2. student_intervention_alerts -----------------------------
CREATE TABLE IF NOT EXISTS public.student_intervention_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trigger_reason text NOT NULL,
  recommended_action text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  assigned_faculty_id uuid REFERENCES public.profiles(id),
  resolution_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sia_user ON public.student_intervention_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sia_open ON public.student_intervention_alerts(status) WHERE status = 'open';

ALTER TABLE public.student_intervention_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sia_student_select_own"
  ON public.student_intervention_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "sia_staff_select_all"
  ON public.student_intervention_alerts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'registrar')
  );

CREATE POLICY "sia_staff_update"
  ON public.student_intervention_alerts FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'registrar')
  );
