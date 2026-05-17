
REVOKE ALL ON FUNCTION public.start_assessment_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_assessment_attempt(uuid, jsonb, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_faculty_review(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transcript_with_attainment(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_assessment_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment_attempt(uuid, jsonb, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_faculty_review(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transcript_with_attainment(uuid) TO authenticated;
