
-- Same legacy-NOT-NULL drift: attempts/first_attempt_at/last_attempt_at are module-attempt
-- concepts; CLO/PLO mastery aggregates have no individual "attempt" semantics.
ALTER TABLE public.student_outcome_mastery ALTER COLUMN first_attempt_at DROP NOT NULL;
ALTER TABLE public.student_outcome_mastery ALTER COLUMN last_attempt_at DROP NOT NULL;
ALTER TABLE public.student_outcome_mastery ALTER COLUMN attempts SET DEFAULT 0;
