-- Revoke anon EXECUTE on admin-only / privileged SECURITY DEFINER functions.
-- Public helper functions (has_role, can_access_course, catalog scoring) remain
-- intentionally callable for unauthenticated catalog browsing and RLS checks.

REVOKE EXECUTE ON FUNCTION public.admin_override_enrollment(uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reassign_program(uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.award_by_rule(uuid, text, numeric, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.award_scrollcoins(uuid, text, integer, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.earn_scrollcoin(uuid, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decide_integrity_appeal(uuid, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.advance_transfer_request(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decide_transfer_request(uuid, text, jsonb, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.archive_academic_year(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_post_likes(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decrement_post_likes(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_loan(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.checkout_loan(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.drop_section_enrollment(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enroll_with_gates(uuid, uuid, uuid) FROM anon, public;