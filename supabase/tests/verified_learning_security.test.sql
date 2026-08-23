-- ============================================================================
-- Verified Learning Security Regression Suite
-- Ensures learners cannot manufacture credential-bearing evidence or rewards.
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

-- 9: generic mint function must never be callable from the browser role.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(9, 'authenticated cannot call generic ScrollCoin mint API',
    NOT has_function_privilege('authenticated','public.earn_scrollcoin(uuid,numeric,text)','EXECUTE'));
END $$;

-- 10: verified reward API is service-only.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(10, 'authenticated cannot call verified reward issuer',
    NOT has_function_privilege(
      'authenticated',
      'public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)',
      'EXECUTE'
    ));
END $$;

-- 11: legacy completion projections are read-only for learners.
DO $$ BEGIN
  PERFORM pg_temp.vls_record(11, 'legacy completion projections are not learner-writable',
    (to_regclass('public.module_progress') IS NULL OR (
      NOT has_table_privilege('authenticated','public.module_progress','INSERT')
      AND NOT has_table_privilege('authenticated','public.module_progress','UPDATE')
      AND NOT has_table_privilege('authenticated','public.module_progress','DELETE')
    ))
    AND (to_regclass('public.learning_progress') IS NULL OR (
      NOT has_table_privilege('authenticated','public.learning_progress','INSERT')
      AND NOT has_table_privilege('authenticated','public.learning_progress','UPDATE')
      AND NOT has_table_privilege('authenticated','public.learning_progress','DELETE')
    )));
END $$;

-- 12: spending API cannot debit another user's wallet.
DO $$
DECLARE
  v_actor uuid := gen_random_uuid();
  v_victim uuid := gen_random_uuid();
  v_rejected boolean := false;
BEGIN
  INSERT INTO auth.users(id,email) VALUES
    (v_actor, 'vls-spender-'||v_actor::text||'@example.test'),
    (v_victim, 'vls-victim-'||v_victim::text||'@example.test');
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_actor::text,'role','authenticated')::text, true);

  BEGIN
    PERFORM public.spend_scrollcoin(v_victim, 1, 'forgery test');
  EXCEPTION WHEN OTHERS THEN
    v_rejected := SQLERRM LIKE '%forbidden%';
  END;

  PERFORM pg_temp.vls_record(12, 'spending is self-only', v_rejected,
    CASE WHEN v_rejected THEN '' ELSE 'cross-user spend was not rejected as forbidden' END);
END $$;

-- 13: verified reward issuance is idempotent by learner + type + source.
DO $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_source uuid := gen_random_uuid();
  v_first boolean;
  v_second boolean;
  v_count int;
BEGIN
  INSERT INTO auth.users(id,email) VALUES (v_user, 'vls-reward-'||v_user::text||'@example.test');

  v_first := public.award_verified_learning_reward(v_user,'test_verified_reward',v_source,5,'{}'::jsonb);
  v_second := public.award_verified_learning_reward(v_user,'test_verified_reward',v_source,5,'{}'::jsonb);
  SELECT count(*) INTO v_count FROM public.verified_learning_rewards
    WHERE user_id=v_user AND reward_type='test_verified_reward' AND source_id=v_source;

  PERFORM pg_temp.vls_record(13, 'verified reward is idempotent',
    v_first IS TRUE AND v_second IS FALSE AND v_count=1,
    format('first=%s second=%s ledger_rows=%s',v_first,v_second,v_count));
END $$;

-- 14: no accumulated permissive SELECT policy may reopen the question bank.
DO $$
DECLARE
  v_total int;
  v_expected int;
BEGIN
  SELECT count(*) INTO v_total
  FROM pg_policies
  WHERE schemaname='public' AND tablename='quiz_questions' AND cmd='SELECT';

  SELECT count(*) INTO v_expected
  FROM pg_policies
  WHERE schemaname='public' AND tablename='quiz_questions' AND cmd='SELECT'
    AND policyname='Academic staff read quiz question bank';

  PERFORM pg_temp.vls_record(14, 'question bank has only academic-staff SELECT policy',
    v_total=1 AND v_expected=1,
    format('select_policies=%s expected_policy_count=%s',v_total,v_expected));
END $$;

\echo '================ VERIFIED LEARNING SECURITY ================'
TABLE _vls_results;
\echo '============================================================'

ROLLBACK;
