-- ============================================================================
-- Graduation Clearance — Sprint D4.1c Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/graduation_clearance.test.sql
--
-- Covers D4.1c:
--   1. student_course_completions exists + RLS + student-self-read policy.
--   2. can_attempt_course signature + NULL-input handling.
--   3. evaluate_degree_completion signature + NULL-input handling.
--   4. vw_student_degree_progress exists + queryable.
--   5. E2E: enroll a student in a degree with one required course,
--      record a passing completion, verify issues reduce.
--   6. can_attempt_course surfaces already_completed_passing + max_attempts_reached.
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

-- Shared fixture ids (temp table; :var does not substitute inside DO blocks).
CREATE TEMP TABLE _d41c_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _d41c_ids VALUES
  ('student', '99999999-d41c-0001-0000-000000000001'),
  ('degree',  '99999999-d41c-0002-0000-000000000001'),
  ('course1', '99999999-d41c-0003-0000-000000000001'),
  ('course2', '99999999-d41c-0003-0000-000000000002');

-- =====================================================================
-- TEST 1: student_course_completions + RLS + policy
-- =====================================================================
DO $$
DECLARE
  v_rls boolean;
  v_pol boolean;
BEGIN
  IF to_regclass('public.student_course_completions') IS NULL THEN
    PERFORM pg_temp.record(1,'student_course_completions exists', false, 'table missing');
    RETURN;
  END IF;
  SELECT c.relrowsecurity INTO v_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='student_course_completions';
  v_pol := EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname='public' AND tablename='student_course_completions'
                      AND policyname='Student reads own completions');
  PERFORM pg_temp.record(1,'student_course_completions + RLS + student-self-read',
                         COALESCE(v_rls,false) AND v_pol,
                         format('rls=%s policy=%s', v_rls, v_pol));
END$$;

-- =====================================================================
-- TEST 2: can_attempt_course signature + NULL inputs
-- =====================================================================
DO $$
DECLARE
  v_sig boolean;
  v_user_null text[];
  v_course_null text[];
BEGIN
  v_sig := EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='can_attempt_course'
  );
  IF NOT v_sig THEN
    PERFORM pg_temp.record(2,'can_attempt_course exists', false, '');
    RETURN;
  END IF;
  v_user_null   := public.can_attempt_course(NULL,
                     '00000000-0000-0000-0000-000000000001'::uuid, 3);
  v_course_null := public.can_attempt_course(
                     '00000000-0000-0000-0000-000000000001'::uuid, NULL, 3);
  PERFORM pg_temp.record(2,'can_attempt_course handles NULL inputs',
                         v_user_null = ARRAY['user_id_required']
                         AND v_course_null = ARRAY['course_id_required'],
                         format('user_null=%s course_null=%s',
                                array_to_string(v_user_null, ','),
                                array_to_string(v_course_null, ',')));
END$$;

-- =====================================================================
-- TEST 3: evaluate_degree_completion signature + NULL inputs
-- =====================================================================
DO $$
DECLARE
  v_sig boolean;
  v_user_null text[];
  v_degree_null text[];
  v_unknown text[];
BEGIN
  v_sig := EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='evaluate_degree_completion'
  );
  IF NOT v_sig THEN
    PERFORM pg_temp.record(3,'evaluate_degree_completion exists', false, '');
    RETURN;
  END IF;
  v_user_null   := public.evaluate_degree_completion(NULL,
                     '00000000-0000-0000-0000-000000000001'::uuid);
  v_degree_null := public.evaluate_degree_completion(
                     '00000000-0000-0000-0000-000000000001'::uuid, NULL);
  v_unknown     := public.evaluate_degree_completion(
                     '00000000-0000-0000-0000-000000000001'::uuid,
                     '00000000-0000-0000-0000-00000000dead'::uuid);
  PERFORM pg_temp.record(3,'evaluate_degree_completion handles NULL + unknown degree',
                         v_user_null   = ARRAY['user_id_required']
                         AND v_degree_null = ARRAY['degree_id_required']
                         AND v_unknown     = ARRAY['degree_not_found'],
                         format('user_null=%s degree_null=%s unknown=%s',
                                array_to_string(v_user_null, ','),
                                array_to_string(v_degree_null, ','),
                                array_to_string(v_unknown, ',')));
END$$;

-- =====================================================================
-- TEST 4: vw_student_degree_progress exists + queryable
-- =====================================================================
DO $$
DECLARE
  v_ok boolean;
  v_rows int;
BEGIN
  v_ok := EXISTS (SELECT 1 FROM information_schema.views
                   WHERE table_schema='public'
                     AND table_name='vw_student_degree_progress');
  IF NOT v_ok THEN
    PERFORM pg_temp.record(4,'vw_student_degree_progress exists', false, '');
    RETURN;
  END IF;
  EXECUTE 'SELECT count(*) FROM public.vw_student_degree_progress' INTO v_rows;
  PERFORM pg_temp.record(4,'vw_student_degree_progress queryable',
                         v_rows >= 0, format('rows=%s', v_rows));
END$$;

-- =====================================================================
-- Shared fixture seed for tests 5-6.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_degree uuid; v_course1 uuid; v_course2 uuid;
BEGIN
  SELECT id INTO v_student FROM _d41c_ids WHERE name='student';
  SELECT id INTO v_degree  FROM _d41c_ids WHERE name='degree';
  SELECT id INTO v_course1 FROM _d41c_ids WHERE name='course1';
  SELECT id INTO v_course2 FROM _d41c_ids WHERE name='course2';

  INSERT INTO auth.users (id, email) VALUES
    (v_student, 'd41c-student@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.courses (id, title)
  VALUES
    (v_course1, 'D4.1c required course 1'),
    (v_course2, 'D4.1c required course 2')
  ON CONFLICT (id) DO NOTHING;

  -- degree_programs is minimal in CI bootstrap; just id + title.
  INSERT INTO public.degree_programs (id, title)
  VALUES (v_degree, 'D4.1c degree')
  ON CONFLICT (id) DO NOTHING;

  -- Map required courses.
  IF to_regclass('public.degree_program_courses') IS NOT NULL THEN
    INSERT INTO public.degree_program_courses
      (degree_program_id, course_id, is_required, sequence_order)
    VALUES
      (v_degree, v_course1, true, 1),
      (v_degree, v_course2, true, 2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Active degree enrollment.
  INSERT INTO public.student_degree_enrollments
    (user_id, degree_id, status)
  VALUES (v_student, v_degree, 'active')
  ON CONFLICT DO NOTHING;
END$$;

-- =====================================================================
-- TEST 5: evaluate_degree_completion surfaces + resolves missing courses
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_degree uuid; v_course1 uuid;
  v_issues_initial text[];
  v_issues_after_one text[];
  v_has_c1_missing_initial boolean;
  v_has_c1_missing_after boolean;
BEGIN
  SELECT id INTO v_student FROM _d41c_ids WHERE name='student';
  SELECT id INTO v_degree  FROM _d41c_ids WHERE name='degree';
  SELECT id INTO v_course1 FROM _d41c_ids WHERE name='course1';

  v_issues_initial := public.evaluate_degree_completion(v_student, v_degree);
  v_has_c1_missing_initial :=
    ('missing_required_course:' || v_course1::text) = ANY(v_issues_initial);

  -- Record a passing completion for course1.
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, grade_points, credits_earned, passed, attempt_number)
  VALUES (v_student, v_course1, 'A', 4.0, 3, true, 1)
  ON CONFLICT DO NOTHING;

  v_issues_after_one := public.evaluate_degree_completion(v_student, v_degree);
  v_has_c1_missing_after :=
    ('missing_required_course:' || v_course1::text) = ANY(v_issues_after_one);

  PERFORM pg_temp.record(5,
    'evaluate_degree_completion drops a missing_required_course after a passing completion',
    v_has_c1_missing_initial AND NOT v_has_c1_missing_after,
    format('initial=[%s] after=[%s]',
           array_to_string(v_issues_initial, ','),
           array_to_string(v_issues_after_one, ',')));
END$$;

-- =====================================================================
-- TEST 6: can_attempt_course surfaces already_completed_passing +
-- max_attempts_reached.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_course1 uuid; v_course2 uuid;
  v_fresh text[];
  v_after_pass text[];
  v_after_three text[];
BEGIN
  SELECT id INTO v_student FROM _d41c_ids WHERE name='student';
  SELECT id INTO v_course1 FROM _d41c_ids WHERE name='course1';
  SELECT id INTO v_course2 FROM _d41c_ids WHERE name='course2';

  -- course2: no completions yet -> no blockers
  v_fresh := public.can_attempt_course(v_student, v_course2, 3);

  -- course1 had a passing completion seeded in test 5.
  v_after_pass := public.can_attempt_course(v_student, v_course1, 3);

  -- Record three failing attempts on course2.
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, passed, attempt_number)
  VALUES
    (v_student, v_course2, 'F', false, 1),
    (v_student, v_course2, 'F', false, 2),
    (v_student, v_course2, 'F', false, 3);
  v_after_three := public.can_attempt_course(v_student, v_course2, 3);

  PERFORM pg_temp.record(6,
    'can_attempt_course surfaces already_completed_passing and max_attempts_reached',
    cardinality(v_fresh) = 0
    AND 'already_completed_passing' = ANY(v_after_pass)
    AND 'max_attempts_reached' = ANY(v_after_three),
    format('fresh=[%s] after_pass=[%s] after_three=[%s]',
           array_to_string(v_fresh, ','),
           array_to_string(v_after_pass, ','),
           array_to_string(v_after_three, ',')));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Graduation Clearance (D4.1c) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Graduation Clearance (D4.1c) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Graduation Clearance (D4.1c) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
