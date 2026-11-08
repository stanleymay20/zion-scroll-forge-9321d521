-- ============================================================================
-- Catalog-driven Policies — Phase 1D Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/catalog_policies.test.sql
--
-- Covers Phase 1D:
--   1. degree_programs carries max_attempts + required_credits columns.
--   2. can_attempt_course reads the student's active degree's max_attempts
--      and blocks at that threshold (not a hardcoded 3).
--   3. Explicit _max_attempts argument still overrides.
--   4. evaluate_degree_completion uses the degree's required_credits
--      threshold (not a hardcoded 60).
--   5. Catalog defaults land on new degree rows (3 / 60).
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

CREATE TEMP TABLE _p1d_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p1d_ids VALUES
  ('student',  'dddddddd-dead-beef-0001-000000000001'),
  ('course',   'dddddddd-dead-beef-0002-000000000001'),
  ('degree2',  'dddddddd-dead-beef-0003-000000000002'),  -- max_attempts=2
  ('degree5',  'dddddddd-dead-beef-0003-000000000005'),  -- max_attempts=5, required_credits=90
  ('degree_defaults', 'dddddddd-dead-beef-0003-00000000000d');  -- unset -> defaults 3 / 60

-- =====================================================================
-- TEST 1: degree_programs columns present
-- =====================================================================
DO $$
DECLARE v_missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='degree_programs'
                    AND column_name='max_attempts') THEN
    v_missing := array_append(v_missing, 'max_attempts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='degree_programs'
                    AND column_name='required_credits') THEN
    v_missing := array_append(v_missing, 'required_credits');
  END IF;
  PERFORM pg_temp.record(1,'degree_programs has catalog policy columns',
                         cardinality(v_missing) = 0,
                         array_to_string(v_missing, ','));
END$$;

-- =====================================================================
-- Shared fixture seed for tests 2-5.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_course uuid; v_d2 uuid; v_d5 uuid; v_dd uuid;
BEGIN
  SELECT id INTO v_student FROM _p1d_ids WHERE name='student';
  SELECT id INTO v_course  FROM _p1d_ids WHERE name='course';
  SELECT id INTO v_d2      FROM _p1d_ids WHERE name='degree2';
  SELECT id INTO v_d5      FROM _p1d_ids WHERE name='degree5';
  SELECT id INTO v_dd      FROM _p1d_ids WHERE name='degree_defaults';

  INSERT INTO auth.users (id, email) VALUES
    (v_student, 'p1d-student@test.local')
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('session_replication_role', 'replica', true);

  INSERT INTO public.courses (id, title) VALUES
    (v_course, 'P1D course')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.degree_programs (id, title, max_attempts, required_credits) VALUES
    (v_d2, 'P1D degree max=2',  2, 60),
    (v_d5, 'P1D degree max=5',  5, 90)
  ON CONFLICT (id) DO NOTHING;

  -- Defaults-only insert: don't set max_attempts or required_credits.
  INSERT INTO public.degree_programs (id, title) VALUES
    (v_dd, 'P1D degree defaults')
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('session_replication_role', 'origin', true);
END$$;

-- =====================================================================
-- TEST 2: catalog max_attempts governs the attempt cap.
-- With max_attempts=2 and two existing attempts, the student is blocked.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_course uuid; v_d2 uuid;
  v_issues text[];
BEGIN
  SELECT id INTO v_student FROM _p1d_ids WHERE name='student';
  SELECT id INTO v_course  FROM _p1d_ids WHERE name='course';
  SELECT id INTO v_d2      FROM _p1d_ids WHERE name='degree2';

  -- Enroll student in degree2 (max_attempts=2).
  INSERT INTO public.student_degree_enrollments (user_id, degree_id, status)
  VALUES (v_student, v_d2, 'active')
  ON CONFLICT DO NOTHING;

  -- Two failing attempts, no passes.
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, passed, attempt_number)
  VALUES
    (v_student, v_course, 'F', false, 1),
    (v_student, v_course, 'F', false, 2)
  ON CONFLICT DO NOTHING;
  PERFORM set_config('session_replication_role', 'origin', true);

  v_issues := public.can_attempt_course(v_student, v_course);  -- no explicit arg
  PERFORM pg_temp.record(2,
    'catalog max_attempts=2 blocks a 3rd attempt (no explicit arg)',
    'max_attempts_reached' = ANY(v_issues)
    AND NOT ('already_completed_passing' = ANY(v_issues)),
    format('issues=[%s]', array_to_string(v_issues, ',')));
END$$;

-- =====================================================================
-- TEST 3: explicit _max_attempts argument overrides catalog.
-- With _max_attempts=5, two attempts should not block.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_course uuid;
  v_issues text[];
BEGIN
  SELECT id INTO v_student FROM _p1d_ids WHERE name='student';
  SELECT id INTO v_course  FROM _p1d_ids WHERE name='course';
  v_issues := public.can_attempt_course(v_student, v_course, 5);
  PERFORM pg_temp.record(3,
    'explicit _max_attempts=5 overrides catalog max_attempts=2',
    NOT ('max_attempts_reached' = ANY(v_issues)),
    format('issues=[%s]', array_to_string(v_issues, ',')));
END$$;

-- =====================================================================
-- TEST 4: evaluate_degree_completion uses catalog required_credits.
-- degree5 requires 90 credits. Student has 0 passing credits -> insufficient.
-- Move the student to degree5; evaluator should return
-- insufficient_credits_earned even if they had 65 credits.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_d5 uuid; v_course2 uuid := gen_random_uuid();
  v_issues text[];
BEGIN
  SELECT id INTO v_student FROM _p1d_ids WHERE name='student';
  SELECT id INTO v_d5      FROM _p1d_ids WHERE name='degree5';

  INSERT INTO public.student_degree_enrollments (user_id, degree_id, status)
  VALUES (v_student, v_d5, 'active')
  ON CONFLICT DO NOTHING;

  -- Give the student 65 passing credits — enough for 60 (default) but not
  -- for 90 (degree5's required_credits).
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.courses (id, title) VALUES (v_course2, 'P1D high-credit course')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, grade_points, credits_earned, passed, attempt_number)
  VALUES (v_student, v_course2, 'A', 4.0, 65, true, 1);
  PERFORM set_config('session_replication_role', 'origin', true);

  v_issues := public.evaluate_degree_completion(v_student, v_d5);
  PERFORM pg_temp.record(4,
    'evaluate_degree_completion honors degree.required_credits=90',
    'insufficient_credits_earned' = ANY(v_issues),
    format('issues=[%s]', array_to_string(v_issues, ',')));
END$$;

-- =====================================================================
-- TEST 5: defaults land on a degree_programs row that omits the columns.
-- =====================================================================
DO $$
DECLARE
  v_dd uuid;
  v_max int;
  v_req numeric;
BEGIN
  SELECT id INTO v_dd FROM _p1d_ids WHERE name='degree_defaults';
  SELECT max_attempts, required_credits INTO v_max, v_req
    FROM public.degree_programs WHERE id = v_dd;
  PERFORM pg_temp.record(5,
    'defaults land: max_attempts=3, required_credits=60',
    v_max = 3 AND v_req = 60,
    format('max=%s req=%s', v_max, v_req));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Catalog Policies (Phase 1D) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Catalog Policies (Phase 1D) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Catalog Policies (Phase 1D) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
