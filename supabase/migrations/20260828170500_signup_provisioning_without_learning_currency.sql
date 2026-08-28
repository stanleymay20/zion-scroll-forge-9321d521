-- ============================================================================
-- Launch signup provisioning without learning currency
-- ============================================================================
-- New accounts receive a minimal profile only. Auth remains the authority for
-- email identity; profiles must not duplicate or depend on an email column.
-- ScrollCoin/ScrollGold is retired and must never be recreated as a signup side
-- effect. Keep this trigger deliberately minimal so schema evolution cannot
-- break account creation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Launch provisioning: creates only the minimal profile row keyed by auth.users.id. Email remains in Auth; retired learning-currency wallets are never provisioned.';
