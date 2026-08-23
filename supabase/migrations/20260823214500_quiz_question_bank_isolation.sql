-- ============================================================================
-- Verified Learning P0 — question-bank isolation
-- ============================================================================
-- Students receive assessment items only through trusted Edge Functions.
-- Direct Data API reads of public.quiz_questions are reserved for academic staff;
-- service_role bypasses RLS for the grading/delivery boundary.
-- ============================================================================

DO $$
DECLARE
  p record;
BEGIN
  IF to_regclass('public.quiz_questions') IS NULL THEN
    RETURN;
  END IF;

  -- Historical migrations accumulated permissive SELECT policies (including
  -- "Anyone can view quiz questions"). RLS policies are OR-combined, so leaving
  -- even one permissive policy would defeat a restrictive policy added later.
  FOR p IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname='public'
       AND tablename='quiz_questions'
       AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.quiz_questions', p.policyname);
  END LOOP;

  CREATE POLICY "Academic staff read quiz question bank"
    ON public.quiz_questions
    FOR SELECT TO authenticated
    USING (
      public.has_role(auth.uid(),'faculty')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'superadmin')
    );
END $$;

COMMENT ON TABLE public.quiz_questions IS
  'Protected assessment question bank. Learners do not read rows directly; trusted assessment services return only the items appropriate to the active assessment and never expose answer-key fields before grading.';
