-- ============================================================================
-- Transcript / GPA Aggregator — Phase 1B Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/transcript_aggregator.test.sql
--
-- Covers Phase 1B:
--   1. student_cumulative_gpa exists + NULL + zero-row semantics.
--   2. compute_student_transcript handles NULL input.
--   3. vw_student_transcript exists and is queryable.
--   4. E2E: record three completions with distinct grade_points and
--      credits — verify GPA is the credit-weighted average and that
--      credits_earned excludes failing attempts.
--   5. compute_student_transcript returns a transcript blob with the
--      expected courses and totals.
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

CREATE TEMP TABLE _p1b_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p1b_ids VALUES
  ('student', 'bbbbbbbb-dead-beef-0001-000000000001'),
  ('course1', 'bbbbbbbb-dead-beef-0002-000000000001'),
  ('course2', 'bbbbbbbb-dead-beef-0002-000000000002'),
  ('course3', 'bbbbbbbb-dead-beef-0002-000000000003');

-- =====================================================================
-- TEST 1: student_cumulative_gpa exists + NULL + zero-row semantics
-- =====================================================================
DO $$
DECLARE
  v_sig boolean;
  v_null_gpa numeric;
  v_zero_gpa numeric;
BEGIN
  v_sig := EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='student_cumulative_gpa'
  );
  IF NOT v_sig THEN
    PERFORM pg_temp.record(1,'student_cumulative_gpa exists', false, '');
    RETURN;
  END IF;
  v_null_gpa := public.student_cumulative_gpa(NULL);
  v_zero_gpa := public.student_cumulative_gpa('bbbbbbbb-dead-beef-ffff-ffffffffffff'::uuid);
  PERFORM pg_temp.record(1,'student_cumulative_gpa handles NULL + no completions',
                         v_null_gpa = 0 AND v_zero_gpa = 0,
                         format('null_gpa=%s zero_gpa=%s', v_null_gpa, v_zero_gpa));
END$$;

-- =====================================================================
-- TEST 2: compute_student_transcript handles NULL input
-- =====================================================================
DO $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.compute_student_transcript(NULL);
  PERFORM pg_temp.record(2,'compute_student_transcript(NULL) returns user_id_required',
                         v_result->>'error' = 'user_id_required',
                         v_result::text);
END$$;

-- =====================================================================
-- TEST 3: vw_student_transcript exists + queryable
-- =====================================================================
DO $$
DECLARE
  v_ok boolean;
  v_rows int;
BEGIN
  v_ok := EXISTS (SELECT 1 FROM information_schema.views
                   WHERE table_schema='public'
                     AND table_name='vw_student_transcript');
  IF NOT v_ok THEN
    PERFORM pg_temp.record(3,'vw_student_transcript exists', false, '');
    RETURN;
  END IF;
  EXECUTE 'SELECT count(*) FROM public.vw_student_transcript' INTO v_rows;
  PERFORM pg_temp.record(3,'vw_student_transcript queryable',
                         v_rows >= 0, format('rows=%s', v_rows));
END$$;

-- =====================================================================
-- Shared fixture seed for tests 4-5.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_c1 uuid; v_c2 uuid; v_c3 uuid;
BEGIN
  SELECT id INTO v_student FROM _p1b_ids WHERE name='student';
  SELECT id INTO v_c1      FROM _p1b_ids WHERE name='course1';
  SELECT id INTO v_c2      FROM _p1b_ids WHERE name='course2';
  SELECT id INTO v_c3      FROM _p1b_ids WHERE name='course3';

  INSERT INTO auth.users (id, email) VALUES
    (v_student, 'p1b-student@test.local')
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('session_replication_role', 'replica', true);

  INSERT INTO public.courses (id, title) VALUES
    (v_c1, 'P1B course 1 (3cr)'),
    (v_c2, 'P1B course 2 (4cr)'),
    (v_c3, 'P1B course 3 (3cr failed)')
  ON CONFLICT (id) DO NOTHING;

  -- 3-credit A = 4.0, 4-credit B+ = 3.3, 3-credit F = 0.0 (not passed)
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, grade_points, credits_earned, passed, attempt_number)
  VALUES
    (v_student, v_c1, 'A',  4.0, 3, true,  1),
    (v_student, v_c2, 'B+', 3.3, 4, true,  1),
    (v_student, v_c3, 'F',  0.0, 0, false, 1);

  PERFORM set_config('session_replication_role', 'origin', true);
END$$;

-- =====================================================================
-- TEST 4: credit-weighted GPA correctness.
-- Expected GPA = (4.0*3 + 3.3*4) / (3+4) = (12 + 13.2) / 7 = 25.2/7 = 3.60
-- Expected credits_earned (passed only) = 3 + 4 = 7
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_gpa numeric; v_credits numeric;
BEGIN
  SELECT id INTO v_student FROM _p1b_ids WHERE name='student';
  v_gpa := public.student_cumulative_gpa(v_student);
  SELECT credits_earned INTO v_credits
    FROM public.vw_student_transcript
   WHERE user_id = v_student;
  PERFORM pg_temp.record(4,
    'credit-weighted GPA + credits_earned exclude failing attempts',
    v_gpa = 3.60 AND v_credits = 7,
    format('gpa=%s credits=%s', v_gpa, v_credits));
END$$;

-- =====================================================================
-- TEST 5: compute_student_transcript blob shape.
-- =====================================================================
DO $$
DECLARE
  v_student uuid;
  v_t jsonb;
  v_course_count int;
  v_totals jsonb;
BEGIN
  SELECT id INTO v_student FROM _p1b_ids WHERE name='student';
  v_t := public.compute_student_transcript(v_student);
  v_course_count := jsonb_array_length(v_t->'courses');
  v_totals := v_t->'totals';

  PERFORM pg_temp.record(5,
    'compute_student_transcript blob has 3 course rows + correct totals',
    v_course_count = 3
    AND (v_totals->>'passed')::int = 2
    AND (v_totals->>'failed')::int = 1
    AND (v_totals->>'credits_earned')::numeric = 7
    AND (v_totals->>'gpa')::numeric = 3.60,
    format('courses=%s totals=%s', v_course_count, v_totals::text));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Transcript Aggregator (Phase 1B) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Transcript Aggregator (Phase 1B) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Transcript Aggregator (Phase 1B) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
