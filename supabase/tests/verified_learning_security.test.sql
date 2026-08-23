-- ============================================================================
-- Verified Learning Security Regression Suite
-- Ensures learners cannot manufacture credential-bearing evidence or rewards.
-- Legacy/optional relations are tested by OID so an absent attack surface is safe.
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

-- 4: reward-triggering legacy quiz submissions are server-owned when present.
DO $$
DECLARE v_rel regclass := to_regclass('public.quiz_submissions');
BEGIN
  PERFORM pg_temp.vls_record(4, 'authenticated cannot insert quiz_submissions',
    v_rel IS NULL OR COALESCE(NOT has_table_privilege('authenticated', v_rel, 'INSERT'), true),
    CASE WHEN v_rel IS NULL THEN 'legacy table absent: no attack surface' ELSE '' END);
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

-- 9: generic mint function, if legacy code created it, must never be callable by browser role.
DO $$
DECLARE v_fn regprocedure := to_regprocedure('public.earn_scrollcoin(uuid,numeric,text)');
BEGIN
  PERFORM pg_temp.vls_record(9, 'authenticated cannot call generic ScrollCoin mint API',
    v_fn IS NULL OR COALESCE(NOT has_function_privilege('authenticated', v_fn, 'EXECUTE'), true),
    CASE WHEN v_fn IS NULL THEN 'legacy mint function absent: no attack surface' ELSE '' END);
END $$;

-- 10: verified reward API is service-only when present.
DO $$
DECLARE v_fn regprocedure := to_regprocedure('public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)');
BEGIN
  PERFORM pg_temp.vls_record(10, 'authenticated cannot call verified reward issuer',
    v_fn IS NULL OR COALESCE(NOT has_function_privilege('authenticated', v_fn, 'EXECUTE'), true),
    CASE WHEN v_fn IS NULL THEN 'reward issuer absent: no browser attack surface' ELSE '' END);
END $$;

-- 11: legacy completion projections are read-only for learners when present.
DO $$
DECLARE
  v_module regclass := to_regclass('public.module_progress');
  v_learning regclass := to_regclass('public.learning_progress');
  v_module_safe boolean;
  v_learning_safe boolean;
BEGIN
  v_module_safe := v_module IS NULL OR (
    COALESCE(NOT has_table_privilege('authenticated', v_module, 'INSERT'), true)
    AND COALESCE(NOT has_table_privilege('authenticated', v_module, 'UPDATE'), true)
    AND COALESCE(NOT has_table_privilege('authenticated', v_module, 'DELETE'), true)
  );
  v_learning_safe := v_learning IS NULL OR (
    COALESCE(NOT has_table_privilege('authenticated', v_learning, 'INSERT'), true)
    AND COALESCE(NOT has_table_privilege('authenticated', v_learning, 'UPDATE'), true)
    AND COALESCE(NOT has_table_privilege('authenticated', v_learning, 'DELETE'), true)
  );

  PERFORM pg_temp.vls_record(11, 'legacy completion projections are not learner-writable',
    v_module_safe AND v_learning_safe,
    format('module_progress=%s learning_progress=%s', COALESCE(v_module::text,'absent'), COALESCE(v_learning::text,'absent')));
END $$;

-- 12: spending API cannot debit another user's wallet.
DO $$
DECLARE
  v_actor uuid := gen_random_uuid();
  v_victim uuid := gen_random_uuid();
  v_rejected boolean := false;
  v_fn regprocedure := to_regprocedure('public.spend_scrollcoin(uuid,numeric,text)');
BEGIN
  IF v_fn IS NULL THEN
    PERFORM pg_temp.vls_record(12, 'spending is self-only', true, 'spend function absent: no attack surface');
    RETURN;
  END IF;

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
  v_fn regprocedure := to_regprocedure('public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)');
  v_ledger regclass := to_regclass('public.verified_learning_rewards');
BEGIN
  IF v_fn IS NULL OR v_ledger IS NULL THEN
    PERFORM pg_temp.vls_record(13, 'verified reward is idempotent', true, 'reward subsystem absent in bootstrap');
    RETURN;
  END IF;

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
  IF to_regclass('public.quiz_questions') IS NULL THEN
    PERFORM pg_temp.vls_record(14, 'question bank has only academic-staff SELECT policy', true, 'question bank absent: no attack surface');
    RETURN;
  END IF;

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
