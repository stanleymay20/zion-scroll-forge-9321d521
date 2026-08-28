-- Blocking launch regression: account creation must provision a minimal profile
-- without depending on legacy profile columns or recreating learning currency.
-- The transaction is rolled back so the suite leaves no fixture behind.

BEGIN;

DO $$
DECLARE
  v_user uuid := '00000000-0000-0000-0009-000000000901'::uuid;
  v_trigger_count integer;
  v_def text;
  v_wallet_rows bigint := 0;
BEGIN
  SELECT count(*)
    INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created'
    AND NOT t.tgisinternal;

  IF v_trigger_count <> 1 THEN
    RAISE EXCEPTION 'signup trigger on_auth_user_created missing or duplicated: %', v_trigger_count;
  END IF;

  SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure)
    INTO v_def;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'handle_new_user missing';
  END IF;

  IF lower(v_def) ~ 'wallet|scrollcoin|scrollgold' THEN
    RAISE EXCEPTION 'signup provisioning reintroduced learning currency';
  END IF;

  -- This is the important assertion: exercise the real trigger rather than
  -- merely inspecting SQL text. The current canonical auth stub guarantees
  -- id/email; handle_new_user must not depend on any optional profile column.
  INSERT INTO auth.users (id, email)
  VALUES (v_user, 'signup-provisioning-regression@test.local');

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    RAISE EXCEPTION 'signup completed without creating profile';
  END IF;

  -- Legacy wallet tables may exist in historical installations. If one exists,
  -- a new auth user must not receive a row as a signup side effect.
  IF to_regclass('public.scrollcoin_wallets') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.scrollcoin_wallets WHERE user_id = $1'
      INTO v_wallet_rows USING v_user;
    IF v_wallet_rows <> 0 THEN
      RAISE EXCEPTION 'signup created scrollcoin_wallets row';
    END IF;
  END IF;

  IF to_regclass('public.wallets') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.wallets WHERE user_id = $1'
      INTO v_wallet_rows USING v_user;
    IF v_wallet_rows <> 0 THEN
      RAISE EXCEPTION 'signup created legacy wallets row';
    END IF;
  END IF;

  RAISE NOTICE 'SIGNUP PROVISIONING PASS: trigger creates minimal profile without learning currency';
END;
$$;

ROLLBACK;
