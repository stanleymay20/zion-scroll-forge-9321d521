-- P0 regression: student-supplied IDs must never execute privileged degree
-- state writers or inspect a stranger's credential eligibility.
\set ON_ERROR_STOP on
BEGIN;

DO $test$
DECLARE
  v_signature text;
  v_fn regprocedure;
  v_eligibility regprocedure;
  v_denied boolean := false;
  v_def text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.generate_degree_plan(uuid,uuid)',
    'public.run_degree_audit(uuid,uuid)',
    'public.evaluate_graduation_candidate(uuid)'
  ] LOOP
    v_fn := to_regprocedure(v_signature);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION 'P0: missing required academic RPC %',v_signature;
    END IF;
    IF NOT (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=v_fn) THEN
      RAISE EXCEPTION 'P0: academic RPC lost expected definer contract %',v_signature;
    END IF;
    IF has_function_privilege('anon',v_fn,'EXECUTE')
       OR has_function_privilege('authenticated',v_fn,'EXECUTE') THEN
      RAISE EXCEPTION 'P0: browser can run privileged academic RPC %',v_signature;
    END IF;
    IF NOT has_function_privilege('service_role',v_fn,'EXECUTE') THEN
      RAISE EXCEPTION 'P0: internal academic service cannot execute %',v_signature;
    END IF;
  END LOOP;

  v_eligibility := to_regprocedure(
    'public.check_credential_eligibility(uuid,public.issued_credential_kind)'
  );
  IF v_eligibility IS NULL THEN
    RAISE EXCEPTION 'P0: credential eligibility function missing';
  END IF;
  IF has_function_privilege('anon',v_eligibility,'EXECUTE') THEN
    RAISE EXCEPTION 'P0: anonymous user can query student credential eligibility';
  END IF;
  IF NOT has_function_privilege('authenticated',v_eligibility,'EXECUTE')
     OR NOT has_function_privilege('service_role',v_eligibility,'EXECUTE') THEN
    RAISE EXCEPTION 'P0: staff UI or service cannot query eligibility';
  END IF;

  SELECT pg_get_functiondef(v_eligibility) INTO v_def;
  IF position('credential_eligibility_forbidden' in v_def)=0
     OR position('has_role' in v_def)=0 THEN
    RAISE EXCEPTION 'P0: credential eligibility lacks mandatory role guard';
  END IF;

  -- Deliberately no real student IDs, data writes, or production exploit.
  -- Simulate a JWT without an active institutional role.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub',gen_random_uuid()::text,'role','authenticated')::text,true
  );
  BEGIN
    PERFORM eligible FROM public.check_credential_eligibility(
      gen_random_uuid(),'certificate'::public.issued_credential_kind
    );
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := SQLERRM LIKE '%credential_eligibility_forbidden%';
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'P0: ordinary authenticated caller bypassed credential eligibility guard';
  END IF;
  PERFORM set_config('request.jwt.claims','',true);
  RAISE NOTICE 'PASS: privileged degree RPCs private; only staff/service can check eligibility';
END
$test$;

ROLLBACK;
