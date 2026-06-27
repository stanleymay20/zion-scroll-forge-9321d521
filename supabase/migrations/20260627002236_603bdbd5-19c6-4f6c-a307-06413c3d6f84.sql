
-- ============================================================================
-- Phase C tooling: SQL-callable cohort simulation harness
-- Lets the validation harness provision synthetic auth users and trigger
-- simulate_cohort without going through the edge function.
-- Admin only. SECURITY DEFINER so it can write to auth schema.
-- ============================================================================

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
      v_email, crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), jsonb_build_object('provider','sim','providers',ARRAY['sim']),
      jsonb_build_object('simulation', true, 'run_tag', p_run_tag),
      now(), now(), '', '', '', ''
    );
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END $$;

REVOKE ALL ON FUNCTION public._provision_synthetic_auth_users(int, text) FROM public;
GRANT EXECUTE ON FUNCTION public._provision_synthetic_auth_users(int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public._run_cohort_simulation_provisioned(
  p_label text, p_size int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_tag text := replace(gen_random_uuid()::text, '-', '');
  v_ids uuid[];
  v_run_id uuid;
  v_auth_ms int;
  v_sim_ms int;
  v_t timestamptz;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller,'admin'::app_role) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='admin only';
  END IF;

  v_t := clock_timestamp();
  v_ids := public._provision_synthetic_auth_users(p_size, v_tag);
  v_auth_ms := (EXTRACT(EPOCH FROM (clock_timestamp()-v_t))*1000)::int;

  v_t := clock_timestamp();
  v_run_id := public.simulate_cohort(p_label, v_ids);
  v_sim_ms := (EXTRACT(EPOCH FROM (clock_timestamp()-v_t))*1000)::int;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'run_tag', v_tag,
    'auth_users_created', array_length(v_ids,1),
    'auth_ms', v_auth_ms,
    'sim_ms', v_sim_ms
  );
END $$;

REVOKE ALL ON FUNCTION public._run_cohort_simulation_provisioned(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public._run_cohort_simulation_provisioned(text, int) TO authenticated;
