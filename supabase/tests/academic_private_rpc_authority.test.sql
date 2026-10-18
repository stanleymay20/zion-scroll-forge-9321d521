-- Blocking release regression: no anonymous / cross-student GPA,
-- academic standing or transcript RPC access. No data writes are performed.
\set ON_ERROR_STOP on
BEGIN;

DO $test$
DECLARE
  v_gpa regprocedure := to_regprocedure('public.compute_student_gpa(uuid,uuid)');
  v_standing regprocedure := to_regprocedure('public.evaluate_academic_standing(uuid,uuid)');
  v_transcript regprocedure := to_regprocedure('public.generate_transcript(uuid)');
  v_student uuid := gen_random_uuid();
  v_target uuid := gen_random_uuid();
  v_forbidden boolean;
  v_fn regprocedure;
  v_text text;
BEGIN
  IF v_gpa IS NULL OR v_standing IS NULL OR v_transcript IS NULL THEN
    RAISE EXCEPTION 'P0: academic RPC prerequisite missing';
  END IF;

  FOREACH v_fn IN ARRAY ARRAY[v_gpa,v_standing,v_transcript] LOOP
    IF has_function_privilege('anon',v_fn,'EXECUTE') THEN
      RAISE EXCEPTION 'P0: anonymous caller can execute %',v_fn;
    END IF;
    IF NOT has_function_privilege('service_role',v_fn,'EXECUTE') THEN
      RAISE EXCEPTION 'P0: trusted academic service lost %',v_fn;
    END IF;
    IF NOT (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=v_fn) THEN
      RAISE EXCEPTION 'P0: expected internal definer behavior lost: %',v_fn;
    END IF;
  END LOOP;

  IF has_function_privilege('authenticated',v_standing,'EXECUTE') THEN
    RAISE EXCEPTION 'P0: learners can directly change academic standing';
  END IF;
  IF NOT has_function_privilege('authenticated',v_gpa,'EXECUTE')
     OR NOT has_function_privilege('authenticated',v_transcript,'EXECUTE') THEN
    RAISE EXCEPTION 'P0: student GPA/transcript self-service unexpectedly lost';
  END IF;

  -- SQL JWT simulation contains no real user IDs and does not create records.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub',v_student::text,'role','authenticated')::text,true
  );

  v_forbidden := false;
  BEGIN
    PERFORM public.compute_student_gpa(v_target,NULL);
  EXCEPTION WHEN insufficient_privilege THEN
    v_forbidden := SQLERRM LIKE '%gpa_access_forbidden%';
  END;
  IF NOT v_forbidden THEN
    RAISE EXCEPTION 'P0: forged cross-student GPA lookup was not denied';
  END IF;

  v_forbidden := false;
  BEGIN
    PERFORM public.evaluate_academic_standing(v_target,NULL);
  EXCEPTION WHEN insufficient_privilege THEN
    v_forbidden := SQLERRM LIKE '%academic_standing_forbidden%';
  END;
  IF NOT v_forbidden THEN
    RAISE EXCEPTION 'P0: ordinary caller can trigger academic standing recomputation';
  END IF;

  v_forbidden := false;
  BEGIN
    PERFORM public.generate_transcript(v_target);
  EXCEPTION WHEN insufficient_privilege THEN
    v_forbidden := SQLERRM LIKE '%transcript_access_forbidden%';
  END;
  IF NOT v_forbidden THEN
    RAISE EXCEPTION 'P0: cross-student transcript generation was not denied';
  END IF;

  -- Valid anonymous JWT shape; never set an empty string, which is invalid JSON.
  PERFORM set_config('request.jwt.claims',json_build_object('role','anon')::text,true);
  v_forbidden := false;
  BEGIN
    PERFORM public.generate_transcript(v_target);
  EXCEPTION WHEN insufficient_privilege THEN
    v_forbidden := SQLERRM LIKE '%transcript_access_forbidden%';
  END;
  IF NOT v_forbidden THEN
    RAISE EXCEPTION 'P0: NULL anonymous identity bypasses transcript guard';
  END IF;

  RAISE NOTICE 'PASS: academic private RPCs deny anonymous and cross-student calls';
END
$test$;

ROLLBACK;
