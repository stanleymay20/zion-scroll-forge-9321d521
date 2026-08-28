-- Blocking launch regression: browser identities must not be able to promote
-- themselves or mutate authorization state, and has_role() must not trust the
-- legacy platform_owners GodMode path.

DO $$
DECLARE
  v_def text;
BEGIN
  IF to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION 'public.user_roles missing';
  END IF;

  IF has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
     OR has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.user_roles', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated can mutate user_roles';
  END IF;

  IF has_table_privilege('anon', 'public.user_roles', 'INSERT')
     OR has_table_privilege('anon', 'public.user_roles', 'UPDATE')
     OR has_table_privilege('anon', 'public.user_roles', 'DELETE') THEN
    RAISE EXCEPTION 'anon can mutate user_roles';
  END IF;

  IF to_regclass('public.platform_owners') IS NOT NULL THEN
    IF has_table_privilege('authenticated', 'public.platform_owners', 'INSERT')
       OR has_table_privilege('authenticated', 'public.platform_owners', 'UPDATE')
       OR has_table_privilege('authenticated', 'public.platform_owners', 'DELETE') THEN
      RAISE EXCEPTION 'authenticated can mutate platform_owners';
    END IF;
  END IF;

  SELECT pg_get_functiondef(p.oid)
    INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'has_role'
    AND pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _role app_role'
  LIMIT 1;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'canonical has_role(uuid, app_role) missing';
  END IF;

  IF lower(v_def) LIKE '%platform_owners%'
     OR lower(v_def) LIKE '%profiles%'
     OR lower(v_def) LIKE '%email%' THEN
    RAISE EXCEPTION 'has_role still trusts an implicit identity/owner bypass';
  END IF;

  IF lower(v_def) NOT LIKE '%public.user_roles%' THEN
    RAISE EXCEPTION 'has_role does not derive authority from public.user_roles';
  END IF;

  IF has_function_privilege('anon', 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute has_role';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute has_role for RLS authorization checks';
  END IF;
END $$;
