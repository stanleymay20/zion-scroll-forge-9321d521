-- Verified Learning P0: credentials are academic consequences, never client-mintable.
-- The historical issue_certificate() function is SECURITY DEFINER and accepts a target
-- user id. Keep it available to trusted server code, but remove browser/API execution.

REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text, uuid, jsonb) TO service_role;

-- Learners may read credentials that RLS exposes to them, but credential rows themselves
-- must only be created/changed by trusted issuance services.
DO $$
BEGIN
  IF to_regclass('public.course_certificates') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.course_certificates FROM anon, authenticated;
  END IF;
  IF to_regclass('public.certificate_verifications') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.certificate_verifications FROM anon, authenticated;
  END IF;
  IF to_regclass('public.graduations') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.graduations FROM anon, authenticated;
  END IF;
END $$;

COMMENT ON FUNCTION public.issue_certificate(uuid, text, text, uuid, jsonb) IS
  'Trusted credential issuer. EXECUTE restricted to service_role; callers must validate verified academic eligibility before issuance.';
