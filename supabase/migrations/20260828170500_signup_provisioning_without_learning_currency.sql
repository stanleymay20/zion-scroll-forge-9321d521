-- ============================================================================
-- Launch signup provisioning without learning currency
-- ============================================================================
-- New accounts receive a profile only. ScrollCoin/ScrollGold is retired and
-- must never be recreated as a signup side effect. This is forward-safe and
-- preserves all existing profile/wallet history.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = now();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Launch provisioning: creates/refreshes the user profile only. Retired learning-currency wallets are not provisioned.';
