-- Phase 3: per-outcome mastery
CREATE TABLE IF NOT EXISTS public.student_outcome_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  learning_objective_id UUID NOT NULL REFERENCES public.course_learning_outcomes(id) ON DELETE CASCADE,
  score_pct INTEGER NOT NULL DEFAULT 0 CHECK (score_pct BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id, learning_objective_id)
);

CREATE INDEX IF NOT EXISTS idx_som_user ON public.student_outcome_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_som_course ON public.student_outcome_mastery(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_som_module ON public.student_outcome_mastery(user_id, module_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_outcome_mastery TO authenticated;
GRANT ALL ON public.student_outcome_mastery TO service_role;

ALTER TABLE public.student_outcome_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage their own outcome mastery"
  ON public.student_outcome_mastery
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Faculty and admins read all outcome mastery"
  ON public.student_outcome_mastery
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'faculty'::public.app_role)
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_som_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.score_pct >= 70 AND OLD.achieved_at IS NULL THEN
    NEW.achieved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_som_updated_at ON public.student_outcome_mastery;
CREATE TRIGGER trg_som_updated_at
  BEFORE UPDATE ON public.student_outcome_mastery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_som_updated_at();

-- set achieved_at on insert when score_pct >= 70
CREATE OR REPLACE FUNCTION public.set_som_achieved_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.score_pct >= 70 AND NEW.achieved_at IS NULL THEN
    NEW.achieved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_som_achieved_insert ON public.student_outcome_mastery;
CREATE TRIGGER trg_som_achieved_insert
  BEFORE INSERT ON public.student_outcome_mastery
  FOR EACH ROW
  EXECUTE FUNCTION public.set_som_achieved_on_insert();