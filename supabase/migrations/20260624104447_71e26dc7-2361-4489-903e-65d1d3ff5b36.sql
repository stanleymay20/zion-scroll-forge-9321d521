-- Phase 2: tag quiz questions to learning outcomes & make them addressable per module
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS learning_objective_id UUID REFERENCES public.course_learning_outcomes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bloom_level TEXT,
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module ON public.quiz_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_course ON public.quiz_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_objective ON public.quiz_questions(learning_objective_id);