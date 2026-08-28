-- ============================================================================
-- Launch academic authority boundary
-- ============================================================================
-- Fail closed on stale browser completion paths and generic credential minting.
-- This migration is intentionally forward-only and preserves historical rows.
-- ============================================================================

-- 1) Legacy module-completion projections may be read for compatibility but may
-- never be authored by browser roles.
DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.module_completions') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.module_completions FROM anon, authenticated;
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename='module_completions' AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.module_completions', p.policyname);
    END LOOP;
  END IF;
END $$;

-- 2) Enrollment progress is an academic projection. Even if a historical policy
-- grants broad UPDATE, an authenticated browser cannot change progress directly.
CREATE OR REPLACE FUNCTION public.enforce_enrollment_progress_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin')
     AND COALESCE(auth.role(), 'anon') <> 'service_role'
     AND NEW.progress IS DISTINCT FROM OLD.progress THEN
    RAISE EXCEPTION 'enrollment_progress_is_system_owned';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.enrollments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS enforce_enrollment_progress_authority ON public.enrollments;
    CREATE TRIGGER enforce_enrollment_progress_authority
      BEFORE UPDATE ON public.enrollments
      FOR EACH ROW EXECUTE FUNCTION public.enforce_enrollment_progress_authority();
  END IF;
END $$;

-- 3) The historical generic credential issuer has no embedded course/degree audit.
-- Retire execution entirely until the dedicated Credential Authority replaces it.
DO $$
BEGIN
  IF to_regprocedure('public.issue_certificate(uuid,text,text,uuid,jsonb)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.issue_certificate(uuid,text,text,uuid,jsonb)
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END $$;

-- 4) Browser roles may never mutate credential/conferment rows.
DO $$
BEGIN
  IF to_regclass('public.course_certificates') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.course_certificates FROM anon, authenticated;
  END IF;
  IF to_regclass('public.certificate_verifications') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.certificate_verifications FROM anon, authenticated;
  END IF;
  IF to_regclass('public.graduations') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.graduations FROM anon, authenticated;
  END IF;
END $$;

COMMENT ON FUNCTION public.enforce_enrollment_progress_authority() IS
  'Launch truth boundary: browser roles cannot manufacture enrollment progress; trusted server evidence owns the projection.';
