
CREATE OR REPLACE FUNCTION public._provision_synthetic_auth_users(
  p_count int, p_run_tag text
) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_email text;
  i int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='admin only';
  END IF;
  IF p_count IS NULL OR p_count < 1 OR p_count > 5000 THEN
    RAISE EXCEPTION 'count must be 1..5000';
  END IF;

  FOR i IN 1..p_count LOOP
    v_id := gen_random_uuid();
    v_email := 'sim+' || p_run_tag || '+' || i || '@scrolluniversity.test';
    INSERT INTO auth.users(
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated','authenticated',
      v_email, 'SIMULATED_NO_LOGIN_' || v_id::text,
      now(), jsonb_build_object('provider','sim','providers',ARRAY['sim']),
      jsonb_build_object('simulation', true, 'run_tag', p_run_tag),
      now(), now(), '', '', '', ''
    );
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END $$;
