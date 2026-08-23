-- ============================================================================
-- Verified Learning Security Regression Suite
-- Ensures learners cannot manufacture credential-bearing evidence.
-- ============================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE _vls_results(test_no int, name text, status text, detail text);

CREATE OR REPLACE FUNCTION pg_temp.vls_record(p_no int, p_name text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _vls_results VALUES (p_no, p_name, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail);
  IF NOT p_ok THEN RAISE EXCEPTION 'VLS test % failed: % — %', p_no, p_name, p_detail; END IF;
END $$;

-- 1/2: no answer-key column is readable by authenticated learners.
DO $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='answer') INTO v_exists;
  PERFORM pg_temp.vls_record(1, 'authenticated cannot SELECT quiz_questions.answer',
    NOT v_exists OR NOT has_column_privilege('authenticated','public.quiz_questions','answer','SELECT'));

  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='correct_answer') INTO v_exists;
  PERFORM pg_temp.vls_record(2, 'authenticated cannot SELECT quiz_questions.correct_answer',
    NOT v_exists OR NOT has_column_privilege('authenticated','public.quiz_questions','correct_answer','SELECT'));
END $$;

-- 3: derived outcome mastery cannot be directly written by learners.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(3, 'authenticated cannot mutate student_outcome_mastery',
    NOT has_table_privilege('authenticated','public.student_outcome_mastery','INSERT')
    AND NOT has_table_privilege('authenticated','public.student_outcome_mastery','UPDATE')
    AND NOT has_table_privilege('authenticated','public.student_outcome_mastery','DELETE'));
END $$;

-- 4: reward-triggering legacy quiz submissions are server-owned.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(4, 'authenticated cannot insert quiz_submissions',
    NOT has_table_privilege('authenticated','public.quiz_submissions','INSERT'));
END $$;

-- 5: raw skill ledger is not directly writable by learners.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(5, 'authenticated cannot directly insert student_skill_events',
    NOT has_table_privilege('authenticated','public.student_skill_events','INSERT'));
END $$;

-- 6: verified module fields are not learner-updatable, while benign activity remains writable.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(6, 'module mastery columns are system-owned',
    NOT has_column_privilege('authenticated','public.student_module_progress','mastery_level','UPDATE')
    AND NOT has_column_privilege('authenticated','public.student_module_progress','status','UPDATE')
    AND NOT has_column_privilege('authenticated','public.student_module_progress','completed_at','UPDATE')
    AND has_column_privilege('authenticated','public.student_module_progress','last_accessed','UPDATE'));
END $$;

-- 7: a student cannot self-issue demonstrated skill evidence through the RPC.
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_skill uuid;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_skill FROM public.skills_catalog LIMIT 1;
  IF v_skill IS NULL THEN
    PERFORM pg_temp.vls_record(7, 'self-demonstrated skill evidence rejected', true, 'skipped: no skill fixture');
    RETURN;
  END IF;

  INSERT INTO auth.users(id,email) VALUES (v_user, 'vls-'||v_user::text||'@example.test');
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_user::text,'role','authenticated')::text, true);

  BEGIN
    PERFORM public.record_skill_evidence(v_user, v_skill, 'demonstrated', 'manual', NULL, 100, 1.0, now());
  EXCEPTION WHEN OTHERS THEN
    v_rejected := SQLERRM LIKE '%self_attestation_must_be_inferred%';
  END;

  PERFORM pg_temp.vls_record(7, 'self-demonstrated skill evidence rejected', v_rejected,
    CASE WHEN v_rejected THEN '' ELSE 'RPC accepted or rejected for unexpected reason' END);
END $$;

-- 8: self-claims are allowed only as low-confidence inferred evidence.
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_skill uuid;
  v_event uuid;
  v_kind text;
  v_conf numeric;
BEGIN
  SELECT id INTO v_skill FROM public.skills_catalog LIMIT 1;
  IF v_skill IS NULL THEN
    PERFORM pg_temp.vls_record(8, 'self-claim is capped inferred evidence', true, 'skipped: no skill fixture');
    RETURN;
  END IF;

  INSERT INTO auth.users(id,email) VALUES (v_user, 'vls-'||v_user::text||'@example.test');
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_user::text,'role','authenticated')::text, true);
  v_event := public.record_skill_evidence(v_user, v_skill, 'inferred', 'self_claim', NULL, 100, 1.0, now());

  SELECT evidence_kind, confidence INTO v_kind, v_conf
  FROM public.student_skill_events WHERE id=v_event;

  PERFORM pg_temp.vls_record(8, 'self-claim is capped inferred evidence',
    v_kind='inferred' AND v_conf <= 0.20,
    'kind='||coalesce(v_kind,'null')||', confidence='||coalesce(v_conf::text,'null'));
END $$;

\echo '================ VERIFIED LEARNING SECURITY ================'
TABLE _vls_results;
\echo '============================================================'

ROLLBACK;
