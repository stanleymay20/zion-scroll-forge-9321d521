-- ============================================================================
-- Content Authority Deltas — Sprint CT2.1 Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/content_authority_deltas.test.sql
--
-- Covers the two CT2.1 deltas on top of PR #2:
--   1. Student-visibility RLS on course_modules folds in content_review_state
--      + quality_verified on the enrolled-student branch.
--   2. review_module_content + publish_module_content both call
--      assert_not_maintenance() so content publication honors the
--      maintenance window.
--
-- Structural assertions only — the behavioral authority tests already
-- live in supabase/tests/module_content_authority.test.sql.
-- ============================================================================

\set QUIET on
\pset pager off

BEGIN;

ALTER TABLE auth.users DISABLE TRIGGER ALL;

DROP TABLE IF EXISTS _suite_results;
CREATE TEMP TABLE _suite_results(test_no int, name text, status text, detail text);

CREATE OR REPLACE FUNCTION pg_temp.record(p_no int, p_name text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _suite_results VALUES (p_no, p_name, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail);
  IF NOT p_ok THEN RAISE WARNING 'TEST % FAIL: % — %', p_no, p_name, p_detail;
  ELSE RAISE NOTICE 'TEST % PASS: %', p_no, p_name;
  END IF;
END$$;

-- =====================================================================
-- TEST 1: course_modules SELECT policy references content_review_state
-- =====================================================================
DO $$ DECLARE v_qual text; v_ok boolean; BEGIN
  SELECT qual INTO v_qual
    FROM pg_policies
   WHERE schemaname='public'
     AND tablename='course_modules'
     AND policyname='Course modules readable only by enrolled course members';

  v_ok := v_qual IS NOT NULL
      AND v_qual LIKE '%content_review_state%'
      AND v_qual LIKE '%published%';
  PERFORM pg_temp.record(1,
    'course_modules SELECT policy folds in content_review_state = published',
    v_ok, COALESCE(v_qual, '(no policy)'));
END$$;

-- =====================================================================
-- TEST 2: policy also requires quality_verified on the student branch
-- =====================================================================
DO $$ DECLARE v_qual text; v_ok boolean; BEGIN
  SELECT qual INTO v_qual
    FROM pg_policies
   WHERE schemaname='public'
     AND tablename='course_modules'
     AND policyname='Course modules readable only by enrolled course members';

  v_ok := v_qual IS NOT NULL AND v_qual LIKE '%quality_verified%';
  PERFORM pg_temp.record(2,
    'course_modules SELECT policy requires quality_verified for students',
    v_ok, '');
END$$;

-- =====================================================================
-- TEST 3: faculty / admin / superadmin still have full visibility
-- (Policy expression names admin/superadmin and the teaching-faculty
-- branch so authoring + review paths remain unaffected.)
-- =====================================================================
DO $$ DECLARE v_qual text; v_ok boolean; BEGIN
  SELECT qual INTO v_qual
    FROM pg_policies
   WHERE schemaname='public'
     AND tablename='course_modules'
     AND policyname='Course modules readable only by enrolled course members';

  v_ok := v_qual IS NOT NULL
      AND v_qual LIKE '%admin%'
      AND v_qual LIKE '%superadmin%'
      AND v_qual LIKE '%teaching_assignments%';
  PERFORM pg_temp.record(3,
    'policy preserves admin/superadmin/teaching_assignments visibility',
    v_ok, '');
END$$;

-- =====================================================================
-- TEST 4: review_module_content RPC body calls assert_not_maintenance
-- =====================================================================
DO $$ DECLARE v_body text; v_ok boolean; BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='review_module_content';
  v_ok := v_body IS NOT NULL AND v_body LIKE '%assert_not_maintenance%';
  PERFORM pg_temp.record(4,
    'review_module_content calls assert_not_maintenance()', v_ok, '');
END$$;

-- =====================================================================
-- TEST 5: publish_module_content RPC body calls assert_not_maintenance
-- =====================================================================
DO $$ DECLARE v_body text; v_ok boolean; BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='publish_module_content';
  v_ok := v_body IS NOT NULL AND v_body LIKE '%assert_not_maintenance%';
  PERFORM pg_temp.record(5,
    'publish_module_content calls assert_not_maintenance()', v_ok, '');
END$$;

-- =====================================================================
-- TEST 6: publish_module_content retains the independent-reviewer guard
-- (Delta is additive; the critical PR #2 invariant must survive the
-- CREATE OR REPLACE in this migration.)
-- =====================================================================
DO $$ DECLARE v_body text; v_ok boolean; BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='publish_module_content';
  v_ok := v_body IS NOT NULL
      AND v_body LIKE '%independent_module_review_required%'
      AND v_body LIKE '%content_changed_by%';
  PERFORM pg_temp.record(6,
    'publish_module_content retains independent-reviewer invariant',
    v_ok, '');
END$$;

-- =====================================================================
-- TEST 7: publish_module_content retains the quality-gate call
-- =====================================================================
DO $$ DECLARE v_body text; v_ok boolean; BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='publish_module_content';
  v_ok := v_body IS NOT NULL
      AND v_body LIKE '%evaluate_module_quality%'
      AND v_body LIKE '%module_quality_gate_failed%';
  PERFORM pg_temp.record(7,
    'publish_module_content retains evaluate_module_quality gate', v_ok, '');
END$$;

-- =====================================================================
-- TEST 8: review_module_content retains the trusted-RPC session flag
-- (Field guard trigger from PR #2 hardening relies on this being set
-- before the UPDATE of review-state fields.)
-- =====================================================================
DO $$ DECLARE v_body text; v_ok boolean; BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='review_module_content';
  v_ok := v_body IS NOT NULL
      AND v_body LIKE '%scrolluniversity.content_authority_rpc%';
  PERFORM pg_temp.record(8,
    'review_module_content sets trusted-RPC session flag before state update',
    v_ok, '');
END$$;

-- =====================================================================
-- TEST 9: publish_module_content retains the trusted-RPC session flag
-- =====================================================================
DO $$ DECLARE v_body text; v_ok boolean; BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='publish_module_content';
  v_ok := v_body IS NOT NULL
      AND v_body LIKE '%scrolluniversity.content_authority_rpc%';
  PERFORM pg_temp.record(9,
    'publish_module_content sets trusted-RPC session flag before state update',
    v_ok, '');
END$$;

-- =====================================================================
-- TEST 10: can_author_module_content / can_publish_module_content
-- predicates are still present (not clobbered by the CREATE OR REPLACE).
-- =====================================================================
DO $$ DECLARE v_ok boolean; BEGIN
  v_ok := EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='can_author_module_content'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='can_publish_module_content'
  );
  PERFORM pg_temp.record(10,
    'PR #2 authorship + publish predicates still present', v_ok, '');
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Content Authority Deltas (CT2.1) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Content Authority Deltas (CT2.1) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Content Authority Deltas (CT2.1) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
