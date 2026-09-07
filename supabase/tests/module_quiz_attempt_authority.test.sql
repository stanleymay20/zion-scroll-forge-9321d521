\set ON_ERROR_STOP on

DO $$
DECLARE
  attempts_col integer;
  attempt_no_col integer;
  attempt_index integer;
  rls_enabled boolean;
  recorder_def text;
BEGIN
  SELECT count(*) INTO attempts_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'quizzes'
    AND column_name = 'attempts_allowed'
    AND is_nullable = 'NO';
  IF attempts_col <> 1 THEN
    RAISE EXCEPTION 'quizzes.attempts_allowed authority column missing';
  END IF;

  IF to_regclass('public.quiz_submissions') IS NULL THEN
    RAISE EXCEPTION 'quiz_submissions must be reconciled by the attempt-authority migration';
  END IF;

  SELECT count(*) INTO attempt_no_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'quiz_submissions'
    AND column_name = 'attempt_number';
  IF attempt_no_col <> 1 THEN
    RAISE EXCEPTION 'quiz_submissions.attempt_number missing';
  END IF;

  SELECT c.relrowsecurity INTO rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'quiz_submissions';
  IF COALESCE(rls_enabled, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'quiz_submissions RLS must be enabled';
  END IF;

  IF has_table_privilege('authenticated', 'public.quiz_submissions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.quiz_submissions', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.quiz_submissions', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated clients must not write authoritative quiz submissions';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.quiz_submissions', 'SELECT') THEN
    RAISE EXCEPTION 'Authenticated learners must retain read access to their own quiz submissions';
  END IF;

  SELECT count(*) INTO attempt_index
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'quiz_submissions'
    AND indexname = 'quiz_submissions_attempt_unique';
  IF attempt_index <> 1 THEN
    RAISE EXCEPTION 'Atomic quiz attempt uniqueness index missing';
  END IF;

  recorder_def := pg_get_functiondef(
    'public.record_verified_module_quiz_submission(uuid,uuid,uuid,numeric,numeric)'::regprocedure
  );
  IF position('pg_advisory_xact_lock' in recorder_def) = 0
     OR position('quiz_attempt_limit_reached' in recorder_def) = 0 THEN
    RAISE EXCEPTION 'Verified quiz recorder is missing concurrency/attempt-limit authority';
  END IF;

  IF has_function_privilege(
      'authenticated',
      'public.record_verified_module_quiz_submission(uuid,uuid,uuid,numeric,numeric)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Authenticated clients must not execute the verified quiz recorder directly';
  END IF;

  IF NOT has_function_privilege(
      'service_role',
      'public.record_verified_module_quiz_submission(uuid,uuid,uuid,numeric,numeric)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'service_role must be able to execute verified quiz recorder';
  END IF;
END $$;
