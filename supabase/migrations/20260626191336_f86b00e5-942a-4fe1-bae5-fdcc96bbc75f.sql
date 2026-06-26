
-- student_outcome_mastery legacy columns (module_id, course_id, learning_objective_id) were
-- designed for module-level mastery before the Phase E academic spine introduced
-- course-level CLO and program-level PLO mastery rows. The new rows have no module/objective.
-- Relax NOT NULL so canonical CLO/PLO mastery writes succeed.
ALTER TABLE public.student_outcome_mastery ALTER COLUMN module_id DROP NOT NULL;
ALTER TABLE public.student_outcome_mastery ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.student_outcome_mastery ALTER COLUMN learning_objective_id DROP NOT NULL;

-- Integrity: every row must still reference at least one outcome dimension.
ALTER TABLE public.student_outcome_mastery
  DROP CONSTRAINT IF EXISTS student_outcome_mastery_dim_present_chk;
ALTER TABLE public.student_outcome_mastery
  ADD CONSTRAINT student_outcome_mastery_dim_present_chk
  CHECK (learning_objective_id IS NOT NULL OR clo_id IS NOT NULL OR plo_id IS NOT NULL);
