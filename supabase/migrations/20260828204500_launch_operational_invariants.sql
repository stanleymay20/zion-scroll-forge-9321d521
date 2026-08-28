-- Launch P0: repair operational invariants exposed by clean-schema CI.
-- 1) maintenance_settings must always contain its singleton row so the
--    kill-switch cannot silently read false because an older migration failed
--    after CREATE TABLE but before INSERT.
-- 2) profile creation analytics must not depend on a legacy profiles.email
--    column; Auth remains the source of email identity.

DO $$
BEGIN
  IF to_regclass('public.maintenance_settings') IS NULL THEN
    RAISE EXCEPTION 'launch operational invariants require public.maintenance_settings';
  END IF;

  INSERT INTO public.maintenance_settings (id, is_enabled)
  VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.log_profile_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF to_regclass('public.scroll_analytics') IS NOT NULL THEN
    INSERT INTO public.scroll_analytics(user_id, event_type, event_payload)
    VALUES (
      NEW.id,
      'user_created',
      jsonb_build_object('source', 'profile_created')
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_profile_creation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_profile_creation() TO service_role;

COMMENT ON FUNCTION public.log_profile_creation()
IS 'Launch-safe profile analytics trigger: records profile creation without duplicating or assuming an email column on public.profiles.';
