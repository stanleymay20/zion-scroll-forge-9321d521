-- Truthful program status: programs with zero modules across all linked courses
-- should not be marketed as 'active_public'. Demote to 'internal_development'.
UPDATE public.degree_programs dp
SET program_status = 'internal_development',
    is_external_facing = false
WHERE dp.is_active
  AND dp.program_status = 'active_public'
  AND NOT EXISTS (
    SELECT 1 FROM public.degree_program_courses dpc
    JOIN public.course_modules cm ON cm.course_id = dpc.course_id
    WHERE dpc.degree_program_id = dp.id
  );