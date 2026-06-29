-- ============================================================================
-- Faculty Analytics KPIs — Sprint D3.2 Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/faculty_analytics_kpis.test.sql
--
-- Covers: the three views introduced in D3.2 that back the kpi-service
-- "faculty_enrollment_trends", "faculty_performance", and
-- "faculty_ai_tutor_usage" metrics.
--
-- This suite is structural-only: it asserts the views exist with the
-- expected column shape and that the kpi-service METRICS registry can
-- read each (smoke select). It deliberately does NOT insert fixture
-- data into enrollments/submissions/ai_tutor_sessions because:
--   - those tables have competing migration definitions across the
--     repo (the workflow's per-file ON_ERROR_STOP swallows mismatched
--     migrations as warnings); some envs have the early shape, others
--     have the later one.
--   - the migration's defensive view-creation already falls back to a
--     0-row stub if the underlying tables don't match. Asserting the
--     stub's count would be a tautology.
-- Once the schema unification for submissions / ai_tutor_sessions
-- lands in D4/D5, this suite should grow data-asserting tests.
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
  IF NOT p_ok THEN
    RAISE WARNING 'TEST % FAIL: % — %', p_no, p_name, p_detail;
  ELSE
    RAISE NOTICE 'TEST % PASS: %', p_no, p_name;
  END IF;
END$$;

-- Helpers
CREATE OR REPLACE FUNCTION pg_temp.view_exists(p_name text) RETURNS boolean
LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
     WHERE table_schema='public' AND table_name=p_name
  )
$$;

CREATE OR REPLACE FUNCTION pg_temp.view_has_column(p_view text, p_col text) RETURNS boolean
LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=p_view AND column_name=p_col
  )
$$;

CREATE OR REPLACE FUNCTION pg_temp.view_selectable(p_view text) RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', p_view);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'view % select error: %', p_view, SQLERRM;
  RETURN false;
END$$;

-- =====================================================================
-- TEST 1-3: views exist
-- =====================================================================
DO $$
BEGIN
  PERFORM pg_temp.record(1,'vw_kpi_faculty_enrollment_trends exists',
                         pg_temp.view_exists('vw_kpi_faculty_enrollment_trends'));
  PERFORM pg_temp.record(2,'vw_kpi_faculty_performance exists',
                         pg_temp.view_exists('vw_kpi_faculty_performance'));
  PERFORM pg_temp.record(3,'vw_kpi_faculty_ai_tutor_usage exists',
                         pg_temp.view_exists('vw_kpi_faculty_ai_tutor_usage'));
END$$;

-- =====================================================================
-- TEST 4-6: each view has the documented column shape (so charts and
-- the kpi-service envelope contract are stable)
-- =====================================================================
DO $$
DECLARE
  v_ok boolean;
BEGIN
  v_ok := pg_temp.view_has_column('vw_kpi_faculty_enrollment_trends','week')
      AND pg_temp.view_has_column('vw_kpi_faculty_enrollment_trends','enrollment_count')
      AND pg_temp.view_has_column('vw_kpi_faculty_enrollment_trends','active_course_count');
  PERFORM pg_temp.record(4,'enrollment_trends: {week, enrollment_count, active_course_count}', v_ok, '');

  v_ok := pg_temp.view_has_column('vw_kpi_faculty_performance','submission_count')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','graded_count')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','avg_score')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','score_0_20')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','score_21_40')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','score_41_60')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','score_61_80')
      AND pg_temp.view_has_column('vw_kpi_faculty_performance','score_81_100');
  PERFORM pg_temp.record(5,'performance: counters + avg_score + 5 score bins', v_ok, '');

  v_ok := pg_temp.view_has_column('vw_kpi_faculty_ai_tutor_usage','week')
      AND pg_temp.view_has_column('vw_kpi_faculty_ai_tutor_usage','session_count')
      AND pg_temp.view_has_column('vw_kpi_faculty_ai_tutor_usage','total_messages')
      AND pg_temp.view_has_column('vw_kpi_faculty_ai_tutor_usage','avg_satisfaction')
      AND pg_temp.view_has_column('vw_kpi_faculty_ai_tutor_usage','satisfaction_response_count');
  PERFORM pg_temp.record(6,'ai_tutor_usage: {week, session_count, total_messages, avg_satisfaction, response_count}', v_ok, '');
END$$;

-- =====================================================================
-- TEST 7-9: each view is SELECT-able (catches stub / real either way;
-- kpi-service edge function needs this to succeed)
-- =====================================================================
DO $$
BEGIN
  PERFORM pg_temp.record(7,'enrollment_trends is selectable',
                         pg_temp.view_selectable('vw_kpi_faculty_enrollment_trends'));
  PERFORM pg_temp.record(8,'performance is selectable',
                         pg_temp.view_selectable('vw_kpi_faculty_performance'));
  PERFORM pg_temp.record(9,'ai_tutor_usage is selectable',
                         pg_temp.view_selectable('vw_kpi_faculty_ai_tutor_usage'));
END$$;

-- =====================================================================
-- TEST 10: performance view yields exactly one row (single-row metric)
-- in either stub or real mode — important because the page reads
-- rows[0] and a multi-row return would silently truncate to the first.
-- (Stub: 0 rows because WHERE FALSE. Real: 1 row from un-grouped agg.)
-- =====================================================================
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.vw_kpi_faculty_performance;
  PERFORM pg_temp.record(10,'performance returns 0 (stub) or 1 (real) rows',
                         v_count IN (0,1),
                         format('row_count=%s', v_count));
END$$;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
DECLARE v_fails int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Faculty Analytics KPIs suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Faculty Analytics KPIs regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Faculty Analytics KPIs suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
