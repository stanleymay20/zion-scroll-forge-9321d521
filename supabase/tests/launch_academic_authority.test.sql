-- ============================================================================
-- Launch Academic Authority Regression Suite
-- ============================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _launch_results(test_no int, name text, status text, detail text);
CREATE OR REPLACE FUNCTION pg_temp.launch_record(p_no int,p_name text,p_ok boolean,p_detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _launch_results VALUES(p_no,p_name,CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END,p_detail);
  IF NOT p_ok THEN RAISE EXCEPTION 'Launch authority test % failed: % — %',p_no,p_name,p_detail; END IF;
END $$;

DO $$
DECLARE r regclass := to_regclass('public.module_completions');
BEGIN
  PERFORM pg_temp.launch_record(1,'legacy module completion is not browser-writable',
    r IS NULL OR (
      NOT has_table_privilege('authenticated',r,'INSERT')
      AND NOT has_table_privilege('authenticated',r,'UPDATE')
      AND NOT has_table_privilege('authenticated',r,'DELETE')
    ),CASE WHEN r IS NULL THEN 'legacy table absent' ELSE '' END);
END $$;

DO $$
DECLARE f regprocedure := to_regprocedure('public.issue_certificate(uuid,text,text,uuid,jsonb)');
BEGIN
  PERFORM pg_temp.launch_record(2,'generic credential issuer is retired',
    f IS NULL OR (
      NOT has_function_privilege('authenticated',f,'EXECUTE')
      AND NOT has_function_privilege('service_role',f,'EXECUTE')
    ),CASE WHEN f IS NULL THEN 'legacy issuer absent' ELSE '' END);
END $$;

DO $$
DECLARE r regclass := to_regclass('public.enrollments'); v_count int;
BEGIN
  IF r IS NULL THEN
    PERFORM pg_temp.launch_record(3,'enrollment progress authority trigger exists',true,'enrollments absent in bootstrap');
    RETURN;
  END IF;
  SELECT count(*) INTO v_count FROM pg_trigger
  WHERE tgrelid=r AND tgname='enforce_enrollment_progress_authority' AND NOT tgisinternal;
  PERFORM pg_temp.launch_record(3,'enrollment progress authority trigger exists',v_count=1,'trigger_count='||v_count);
END $$;

DO $$
DECLARE r regclass := to_regclass('public.course_certificates');
BEGIN
  PERFORM pg_temp.launch_record(4,'course certificate rows are browser read-only',
    r IS NULL OR (
      NOT has_table_privilege('authenticated',r,'INSERT')
      AND NOT has_table_privilege('authenticated',r,'UPDATE')
      AND NOT has_table_privilege('authenticated',r,'DELETE')
    ));
END $$;

DO $$
DECLARE r regclass := to_regclass('public.graduations');
BEGIN
  PERFORM pg_temp.launch_record(5,'graduation rows are browser read-only',
    r IS NULL OR (
      NOT has_table_privilege('authenticated',r,'INSERT')
      AND NOT has_table_privilege('authenticated',r,'UPDATE')
      AND NOT has_table_privilege('authenticated',r,'DELETE')
    ));
END $$;

DO $$
DECLARE f regprocedure := to_regprocedure('public.get_verified_course_completion(uuid,uuid)');
BEGIN
  PERFORM pg_temp.launch_record(6,'verified course completion projection is present',
    f IS NOT NULL AND has_function_privilege('authenticated',f,'EXECUTE'),
    CASE WHEN f IS NULL THEN 'canonical completion RPC missing' ELSE '' END);
END $$;

\echo '================ LAUNCH ACADEMIC AUTHORITY ================'
TABLE _launch_results;
\echo '==========================================================='
ROLLBACK;
