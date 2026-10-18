-- Integrated release gate: prove authorized academic API paths still work.
-- Synthetic auth.users fixtures, transaction rolled back. NEVER run on live Cloud.
\set ON_ERROR_STOP on
BEGIN;

DO $test$
DECLARE
  v_student uuid := gen_random_uuid();
  v_registrar uuid := gen_random_uuid();
  v_gpa jsonb;
  v_transcript jsonb;
  v_check record;
  v_evaluated boolean := false;
BEGIN
  IF to_regclass('auth.users') IS NULL OR to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION 'Positive academic authority fixtures require auth.users and user_roles';
  END IF;

  INSERT INTO auth.users (id,email)
    VALUES (v_student,'ci-academic-student-'||v_student::text||'@example.invalid'),
           (v_registrar,'ci-academic-registrar-'||v_registrar::text||'@example.invalid');

  INSERT INTO public.user_roles(user_id,role,is_active)
    VALUES (v_registrar,'registrar'::public.app_role,true);

  -- Happy path: a normal, authenticated student can obtain their own GPA.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub',v_student::text,'role','authenticated')::text,true);
  SELECT public.compute_student_gpa(v_student,NULL) INTO v_gpa;
  IF v_gpa IS NULL OR NOT v_gpa ? 'cumulative_gpa' THEN
    RAISE EXCEPTION 'P0: student self-service GPA path failed';
  END IF;

  -- Happy path: same student's on-demand transcript.
  SELECT public.generate_transcript(v_student) INTO v_transcript;
  IF v_transcript IS NULL
      OR v_transcript->>'student_id' IS DISTINCT FROM v_student::text THEN
    RAISE EXCEPTION 'P0: student self-service transcript path failed';
  END IF;

  -- Happy path: explicit, active registrar may check another student's
  -- credential eligibility; unauthorised student denied in negative test.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub',v_registrar::text,'role','authenticated')::text,true);
  SELECT eligible, reason
    INTO v_check
  FROM public.check_credential_eligibility(
    v_student,'certificate'::public.issued_credential_kind);
  IF v_check.eligible IS NULL THEN
    RAISE EXCEPTION 'P0: registrar credential eligibility path failed';
  END IF;

  -- Verify that an allowed registrar can inspect GPA and transcripts for
  -- the target student without relaxing the negative cross-student checks.
  SELECT public.compute_student_gpa(v_student,NULL) INTO v_gpa;
  SELECT public.generate_transcript(v_student) INTO v_transcript;
  IF v_gpa IS NULL OR v_transcript IS NULL THEN
    RAISE EXCEPTION 'P0: registrar authorised GPA/transcript lookup failed';
  END IF;

  RAISE NOTICE 'PASS: synthetic student GPA/transcript and registrar academic review';
END
$test$;

ROLLBACK;
