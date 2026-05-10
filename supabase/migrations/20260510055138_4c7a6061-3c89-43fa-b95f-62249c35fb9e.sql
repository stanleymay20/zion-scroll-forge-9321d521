ALTER TABLE public.student_holds DROP CONSTRAINT IF EXISTS student_holds_hold_type_check;
ALTER TABLE public.student_holds ADD CONSTRAINT student_holds_hold_type_check
  CHECK (hold_type = ANY (ARRAY[
    'financial','disciplinary','academic','administrative',
    'prerequisite','document','program_assignment_required'
  ]));

INSERT INTO public.student_holds (
  user_id, hold_type, reason,
  blocks_registration, blocks_graduation, blocks_transcript,
  notes, is_active
)
SELECT s.user_id,
       'program_assignment_required',
       'Accepted student record has no official degree_program_id. Awaiting Registrar review and assignment.',
       true, true, true,
       'Auto-flagged by total academic realignment audit (10 May 2026).',
       true
FROM public.students s
WHERE s.application_status = 'accepted'
  AND s.degree_program_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.student_holds h
    WHERE h.user_id = s.user_id
      AND h.hold_type = 'program_assignment_required'
      AND h.resolved_at IS NULL
  );