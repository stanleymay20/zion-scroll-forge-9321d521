-- ============================================================================
-- Pilot E2E Smoke — Phase 2D Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/pilot_e2e_smoke.test.sql
--
-- Composes every Phase 1 + Phase 2 primitive end-to-end in a pilot-
-- institution context, proving they work TOGETHER not just in isolation.
-- This is the "a pilot operator can actually operate" proof.
--
-- The test walks:
--   1. bootstrap_pilot_institution (P2C) -> pilot institution + dual
--      persona pair in one call.
--   2. Create a course inside the pilot institution.
--   3. Create a degree_program (catalog policies: max_attempts=2,
--      required_credits=6) and map the course as required.
--   4. Enroll the operator student user in that degree.
--   5. Record a passing completion directly in the P1B/D4.1c
--      canonical ledger (student_course_completions).
--   6. Verify vw_student_transcript reflects the credits + GPA.
--   7. Verify can_attempt_course sees 'already_completed_passing'
--      and that evaluate_degree_completion drops the missing-course
--      issue for this course.
--   8. Verify the P1A registrar notification hook fires on a
--      hold_imposed audit row.
--
-- Where enrollment-flow triggers would refuse (teaching-readiness,
-- enrollment-state guard), we use the trusted markers + targeted
-- DISABLE TRIGGER pattern established by D4.1b and P2A/B. The point
-- is that the LEDGER + REPORTING primitives compose; proving the
-- enrollment-flow with real content is Phase 4 (post-content).
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

CREATE TEMP TABLE _p2d_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p2d_ids VALUES
  ('operator', 'e2ee2ee2-dead-beef-0001-000000000001'),
  ('reviewer', 'e2ee2ee2-dead-beef-0001-000000000002'),
  ('student',  'e2ee2ee2-dead-beef-0001-000000000003'),
  ('caller',   'e2ee2ee2-dead-beef-0001-00000000ca11'),
  ('course',   'e2ee2ee2-dead-beef-0002-000000000001'),
  ('degree',   'e2ee2ee2-dead-beef-0003-000000000001');

-- Seed the auth.users rows the bootstrap needs.
DO $$
DECLARE v_op uuid; v_rv uuid; v_st uuid; v_c uuid;
BEGIN
  SELECT id INTO v_op FROM _p2d_ids WHERE name='operator';
  SELECT id INTO v_rv FROM _p2d_ids WHERE name='reviewer';
  SELECT id INTO v_st FROM _p2d_ids WHERE name='student';
  SELECT id INTO v_c  FROM _p2d_ids WHERE name='caller';
  INSERT INTO auth.users (id, email) VALUES
    (v_op, 'p2d-op@test.local'),
    (v_rv, 'p2d-rv@test.local'),
    (v_st, 'p2d-student@test.local'),
    (v_c,  'p2d-caller@test.local')
  ON CONFLICT (id) DO NOTHING;
END$$;

-- =====================================================================
-- STEP 1: bootstrap pilot institution + dual personas (P2C)
-- =====================================================================
DO $$
DECLARE
  v_op uuid; v_rv uuid; v_caller uuid;
  v_result jsonb;
  v_inst uuid; v_persona uuid;
  v_is_pilot boolean; v_persona_active boolean;
BEGIN
  SELECT id INTO v_op     FROM _p2d_ids WHERE name='operator';
  SELECT id INTO v_rv     FROM _p2d_ids WHERE name='reviewer';
  SELECT id INTO v_caller FROM _p2d_ids WHERE name='caller';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  v_result := public.bootstrap_pilot_institution(
    'P2D Pilot ScrollUniversity', v_op, v_rv,
    'E2E smoke attestation'
  );
  v_inst    := (v_result->>'institution_id')::uuid;
  v_persona := (v_result->>'persona_id')::uuid;

  INSERT INTO _p2d_ids(name, id) VALUES
    ('institution', v_inst),
    ('persona',     v_persona)
  ON CONFLICT (name) DO UPDATE SET id = EXCLUDED.id;

  SELECT is_pilot INTO v_is_pilot
    FROM public.vw_institution_banner WHERE id = v_inst;
  SELECT is_active INTO v_persona_active
    FROM public.vw_pilot_personas WHERE id = v_persona;

  PERFORM pg_temp.record(1,
    'STEP 1: bootstrap_pilot_institution produces pilot institution + active persona pair',
    COALESCE((v_result->>'success')::boolean, false)
    AND v_is_pilot = true
    AND v_persona_active = true,
    format('result=%s is_pilot=%s persona_active=%s',
           v_result::text, v_is_pilot, v_persona_active));
END$$;

-- =====================================================================
-- STEP 2: course + degree + required-course mapping + student enrollment
-- These rows need bypasses for auxiliary triggers that CT1a and other
-- historical migrations attach to shared tables. We've validated each
-- trigger is a separate concern in its own phase; here we seed the
-- substrate to exercise the composition.
-- =====================================================================
DO $$
DECLARE
  v_course uuid; v_degree uuid; v_student uuid;
BEGIN
  SELECT id INTO v_course  FROM _p2d_ids WHERE name='course';
  SELECT id INTO v_degree  FROM _p2d_ids WHERE name='degree';
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';

  PERFORM set_config('session_replication_role', 'replica', true);

  INSERT INTO public.courses (id, title)
  VALUES (v_course, 'P2D pilot course')
  ON CONFLICT (id) DO NOTHING;

  -- P1D catalog policies: max_attempts=2, required_credits=6.
  INSERT INTO public.degree_programs (id, title, max_attempts, required_credits)
  VALUES (v_degree, 'P2D pilot degree', 2, 6)
  ON CONFLICT (id) DO NOTHING;

  IF to_regclass('public.degree_program_courses') IS NOT NULL THEN
    INSERT INTO public.degree_program_courses
      (degree_program_id, course_id, is_required, sequence_order)
    VALUES (v_degree, v_course, true, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.student_degree_enrollments
    (user_id, degree_id, status)
  VALUES (v_student, v_degree, 'active')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('session_replication_role', 'origin', true);

  PERFORM pg_temp.record(2,
    'STEP 2: course + degree + required-course map + student enrollment seeded',
    EXISTS (SELECT 1 FROM public.courses WHERE id = v_course)
    AND EXISTS (SELECT 1 FROM public.degree_programs WHERE id = v_degree)
    AND EXISTS (SELECT 1 FROM public.student_degree_enrollments
                 WHERE user_id = v_student AND degree_id = v_degree AND status = 'active'),
    '');
END$$;

-- =====================================================================
-- STEP 3: evaluate_degree_completion flags missing_required_course
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_degree uuid; v_course uuid;
  v_issues text[];
BEGIN
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';
  SELECT id INTO v_degree  FROM _p2d_ids WHERE name='degree';
  SELECT id INTO v_course  FROM _p2d_ids WHERE name='course';

  v_issues := public.evaluate_degree_completion(v_student, v_degree);

  PERFORM pg_temp.record(3,
    'STEP 3: evaluate_degree_completion surfaces missing_required_course before any completion',
    ('missing_required_course:' || v_course::text) = ANY(v_issues)
    AND 'insufficient_credits_earned' = ANY(v_issues),
    format('issues=[%s]', array_to_string(v_issues, ',')));
END$$;

-- =====================================================================
-- STEP 4: record a passing completion in the canonical ledger (D4.1c)
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_course uuid;
BEGIN
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';
  SELECT id INTO v_course  FROM _p2d_ids WHERE name='course';

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, grade_points, credits_earned, passed, attempt_number)
  VALUES (v_student, v_course, 'A', 4.0, 6, true, 1);
  PERFORM set_config('session_replication_role', 'origin', true);

  PERFORM pg_temp.record(4,
    'STEP 4: passing completion recorded in canonical ledger',
    EXISTS (SELECT 1 FROM public.student_course_completions
             WHERE user_id = v_student AND course_id = v_course AND passed),
    '');
END$$;

-- =====================================================================
-- STEP 5: transcript + GPA + progress view reflect the completion
-- =====================================================================
DO $$
DECLARE
  v_student uuid;
  v_gpa numeric;
  v_credits numeric;
  v_t jsonb;
  v_course_count int;
BEGIN
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';

  v_gpa := public.student_cumulative_gpa(v_student);

  SELECT credits_earned INTO v_credits
    FROM public.vw_student_transcript WHERE user_id = v_student;

  v_t := public.compute_student_transcript(v_student);
  v_course_count := jsonb_array_length(v_t->'courses');

  PERFORM pg_temp.record(5,
    'STEP 5: transcript shows GPA=4.0, credits=6, 1 course',
    v_gpa = 4.0
    AND v_credits = 6
    AND v_course_count = 1
    AND (v_t->'totals'->>'passed')::int = 1,
    format('gpa=%s credits=%s course_count=%s', v_gpa, v_credits, v_course_count));
END$$;

-- =====================================================================
-- STEP 6: evaluate_degree_completion drops missing-course issue after
-- the passing completion. required_credits=6 is met too; the only
-- remaining issue (if any) should be no_active_holds-related or absent.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_degree uuid; v_course uuid;
  v_issues text[];
BEGIN
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';
  SELECT id INTO v_degree  FROM _p2d_ids WHERE name='degree';
  SELECT id INTO v_course  FROM _p2d_ids WHERE name='course';

  v_issues := public.evaluate_degree_completion(v_student, v_degree);

  PERFORM pg_temp.record(6,
    'STEP 6: evaluate_degree_completion clears missing_required_course + credits after completion',
    NOT (('missing_required_course:' || v_course::text) = ANY(v_issues))
    AND NOT ('insufficient_credits_earned' = ANY(v_issues)),
    format('issues=[%s]', array_to_string(v_issues, ',')));
END$$;

-- =====================================================================
-- STEP 7: can_attempt_course surfaces already_completed_passing (P1D)
-- and respects the degree's catalog max_attempts=2 for a different
-- course after seeding two failing attempts.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_course uuid; v_other uuid := gen_random_uuid();
  v_pass_issues text[];
  v_cap_issues text[];
BEGIN
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';
  SELECT id INTO v_course  FROM _p2d_ids WHERE name='course';

  v_pass_issues := public.can_attempt_course(v_student, v_course);

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.courses (id, title) VALUES (v_other, 'P2D another course')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.student_course_completions
    (user_id, course_id, grade, passed, attempt_number) VALUES
    (v_student, v_other, 'F', false, 1),
    (v_student, v_other, 'F', false, 2);
  PERFORM set_config('session_replication_role', 'origin', true);

  v_cap_issues := public.can_attempt_course(v_student, v_other);

  PERFORM pg_temp.record(7,
    'STEP 7: can_attempt_course surfaces already_completed_passing + catalog max_attempts cap',
    'already_completed_passing' = ANY(v_pass_issues)
    AND 'max_attempts_reached' = ANY(v_cap_issues),
    format('pass=[%s] cap=[%s]',
           array_to_string(v_pass_issues, ','),
           array_to_string(v_cap_issues, ',')));
END$$;

-- =====================================================================
-- STEP 8: P1A registrar notification hook fires end-to-end on a
-- hold_imposed audit row for the pilot student.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_caller uuid;
  v_hold_result jsonb;
  v_notif_count int;
BEGIN
  SELECT id INTO v_student FROM _p2d_ids WHERE name='student';
  SELECT id INTO v_caller  FROM _p2d_ids WHERE name='caller';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  v_hold_result := public.impose_student_hold(v_student, 'p2d.probe', 'E2E smoke probe');

  SELECT count(*) INTO v_notif_count
    FROM public.notifications
   WHERE user_id = v_student
     AND event_key LIKE 'registrar:hold_imposed:%';

  PERFORM pg_temp.record(8,
    'STEP 8: impose_student_hold -> audit row -> notification keyed registrar:hold_imposed emitted',
    COALESCE((v_hold_result->>'success')::boolean, false)
    AND v_notif_count >= 1,
    format('hold=%s notif_count=%s', v_hold_result::text, v_notif_count));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Pilot E2E Smoke (Phase 2D) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Pilot E2E Smoke (Phase 2D) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Pilot E2E Smoke (Phase 2D) suite: all % steps PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
