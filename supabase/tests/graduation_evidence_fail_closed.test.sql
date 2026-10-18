-- Commercial P0 blocker: graduation evaluation must never invent evidence.
-- Synthetic UUID only; test wraps itself in a transaction and writes no rows.
\set ON_ERROR_STOP on
BEGIN;

-- Tolerant historical bootstrap may not have materialized the 2026 academic
-- graduation tables. Build minimum tracking tables inside this ROLLBACK-only
-- transaction when absent; they are not a substitute for populated staging.
-- The no-write assertion executes against the actual table when present.
DO $schema_fixture$
BEGIN
  IF to_regclass('public.graduation_candidates') IS NULL THEN
    CREATE TABLE public.graduation_candidates(user_id uuid);
    RAISE NOTICE 'CI-only schema fixture: graduation_candidates missing in bootstrap';
  END IF;
  IF to_regclass('public.graduation_eligibility_checks') IS NULL THEN
    CREATE TABLE public.graduation_eligibility_checks(user_id uuid);
    RAISE NOTICE 'CI-only schema fixture: graduation_eligibility_checks missing in bootstrap';
  END IF;
END
$schema_fixture$;

DO $guard$
DECLARE
  v_fn regprocedure := to_regprocedure('public.evaluate_graduation_candidate(uuid)');
  v_student uuid := gen_random_uuid();
  v_def text;
  v_denied boolean := false;
  v_before_candidates bigint;
  v_after_candidates bigint;
  v_before_checks bigint;
  v_after_checks bigint;
BEGIN
  IF v_fn IS NULL THEN
    RAISE EXCEPTION 'P0: graduation evaluation RPC is absent';
  END IF;
  IF NOT (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=v_fn) THEN
    RAISE EXCEPTION 'P0: graduation evaluator no longer uses controlled authority';
  END IF;
  IF has_function_privilege('anon',v_fn,'EXECUTE')
     OR has_function_privilege('authenticated',v_fn,'EXECUTE') THEN
    RAISE EXCEPTION 'P0: browser role can directly evaluate graduation';
  END IF;
  IF NOT has_function_privilege('service_role',v_fn,'EXECUTE') THEN
    RAISE EXCEPTION 'P0: trusted graduation service lost required function contract';
  END IF;

  SELECT pg_get_functiondef(v_fn) INTO v_def;
  IF position('graduation_evidence_unverified' in v_def)=0
     OR position('ERRCODE' in v_def)=0
     OR v_def ~* '\m(INSERT|UPDATE|DELETE)\M' THEN
    RAISE EXCEPTION 'P0: graduation evaluation no longer fails before data mutations';
  END IF;

  IF to_regclass('public.graduation_candidates') IS NULL
     OR to_regclass('public.graduation_eligibility_checks') IS NULL THEN
    RAISE EXCEPTION 'P0: required graduation audit/candidate schema absent';
  END IF;

  SELECT count(*) INTO v_before_candidates
  FROM public.graduation_candidates WHERE user_id=v_student;
  SELECT count(*) INTO v_before_checks
  FROM public.graduation_eligibility_checks WHERE user_id=v_student;

  -- This runs as the test DB's trusted postgres owner. Even maximum privileges
  -- must not bypass evidence verification: no fabricated records or eligibility.
  BEGIN
    PERFORM public.evaluate_graduation_candidate(v_student);
  EXCEPTION WHEN SQLSTATE '55000' THEN
    v_denied := SQLERRM LIKE 'graduation_evidence_unverified:%';
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'P0: trusted graduation evaluation did not fail closed';
  END IF;

  SELECT count(*) INTO v_after_candidates
  FROM public.graduation_candidates WHERE user_id=v_student;
  SELECT count(*) INTO v_after_checks
  FROM public.graduation_eligibility_checks WHERE user_id=v_student;

  IF v_after_candidates IS DISTINCT FROM v_before_candidates
     OR v_after_checks IS DISTINCT FROM v_before_checks THEN
    RAISE EXCEPTION 'P0: graduation evaluation mutated candidate/eligibility state';
  END IF;

  RAISE NOTICE 'PASS: graduation is blocked for trusted/anonymous callers and does not forge eligibility records';
END
$guard$;

ROLLBACK;
