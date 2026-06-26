
REVOKE EXECUTE ON FUNCTION public.enroll_student_in_section(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.drop_section_enrollment(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_waitlist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sections_overlap(uuid,uuid) FROM PUBLIC, anon;
