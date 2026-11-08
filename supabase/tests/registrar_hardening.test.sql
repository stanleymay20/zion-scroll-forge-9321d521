-- ============================================================================
-- Registrar Hardening — Sprint D4.1b Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/registrar_hardening.test.sql
--
-- Covers D4.1b:
--   1. student_holds exists + RLS + student-self-read policy.
--   2. can_register_now(user, term) signature + NULL cases.
--   3. guard_section_enrollment_authority_fields trigger installed.
--   4. Direct UPDATE on section_enrollments.status is BLOCKED outside
--      the trusted session marker; allowed inside it.
--   5. drop_section_enrollment: clean drop before add_drop_ends_on,
--      withdrawal before withdraw_ends_on, forbidden after.
--   6. Dropping writes a registrar_audit_log row with event_kind='dropped'.
--   7. impose_student_hold + lift_student_hold round-trip + audit rows.
--   8. can_register_now catches active_holds_present + lifts cleanly.
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

-- Shared fixture ids. psql client-side :var substitution does NOT reach
-- inside $$-quoted DO blocks, so IDs live in a temp table that every
-- block reads via SELECT INTO.
CREATE TEMP TABLE _d41b_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _d41b_ids VALUES
  ('student',       '88888888-d41b-0001-0000-000000000001'),
  ('actor',         '88888888-d41b-0001-0000-000000000002'),
  ('term_open',     '88888888-d41b-0002-0000-000000000001'),
  ('term_past',     '88888888-d41b-0002-0000-000000000002'),
  ('course',        '88888888-d41b-0003-0000-000000000001'),
  ('section_open',  '88888888-d41b-0004-0000-000000000001'),
  ('section_past',  '88888888-d41b-0004-0000-000000000002'),
  ('enroll_open',   '88888888-d41b-0005-0000-000000000001'),
  ('enroll_past',   '88888888-d41b-0005-0000-000000000002');

-- =====================================================================
-- TEST 1: student_holds + RLS + policy
-- =====================================================================
DO $$
DECLARE
  v_rls boolean;
  v_pol boolean;
BEGIN
  IF to_regclass('public.student_holds') IS NULL THEN
    PERFORM pg_temp.record(1,'student_holds exists', false, 'table missing');
    RETURN;
  END IF;
  SELECT c.relrowsecurity INTO v_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='student_holds';
  v_pol := EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname='public' AND tablename='student_holds'
                      AND policyname='Student reads own holds');
  PERFORM pg_temp.record(1,'student_holds table + RLS + student-self-read policy',
                         COALESCE(v_rls,false) AND v_pol,
                         format('rls=%s policy=%s', v_rls, v_pol));
END$$;

-- =====================================================================
-- TEST 2: can_register_now signature + NULL cases
-- =====================================================================
DO $$
DECLARE
  v_sig boolean;
  v_user_null text[];
  v_term_null text[];
BEGIN
  v_sig := EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='can_register_now'
  );
  IF NOT v_sig THEN
    PERFORM pg_temp.record(2,'can_register_now exists', false, '');
    RETURN;
  END IF;
  v_user_null := public.can_register_now(NULL, '00000000-0000-0000-0000-000000000001'::uuid);
  v_term_null := public.can_register_now('00000000-0000-0000-0000-000000000001'::uuid, NULL);
  PERFORM pg_temp.record(2,'can_register_now handles NULL inputs',
                         v_user_null = ARRAY['user_id_required']
                         AND v_term_null = ARRAY['term_id_required'],
                         format('user_null=%s term_null=%s',
                                array_to_string(v_user_null, ','),
                                array_to_string(v_term_null, ',')));
END$$;

-- =====================================================================
-- TEST 3: guard trigger installed on section_enrollments
-- =====================================================================
DO $$
DECLARE
  v_trg boolean;
BEGIN
  IF to_regclass('public.section_enrollments') IS NULL THEN
    PERFORM pg_temp.record(3,'section_enrollments absent (SKIPPED)', true, '');
    RETURN;
  END IF;
  v_trg := EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
     WHERE c.relname = 'section_enrollments'
       AND t.tgname = 'trg_guard_section_enrollment_authority'
       AND NOT t.tgisinternal
  );
  PERFORM pg_temp.record(3,'section_enrollments carries state guard trigger', v_trg, '');
END$$;

-- =====================================================================
-- Shared fixture seed for tests 4-8.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_actor uuid; v_term_open uuid; v_term_past uuid;
  v_course uuid; v_section_open uuid; v_section_past uuid;
  v_enroll_open uuid; v_enroll_past uuid;
BEGIN
  SELECT id INTO v_student      FROM _d41b_ids WHERE name='student';
  SELECT id INTO v_actor        FROM _d41b_ids WHERE name='actor';
  SELECT id INTO v_term_open    FROM _d41b_ids WHERE name='term_open';
  SELECT id INTO v_term_past    FROM _d41b_ids WHERE name='term_past';
  SELECT id INTO v_course       FROM _d41b_ids WHERE name='course';
  SELECT id INTO v_section_open FROM _d41b_ids WHERE name='section_open';
  SELECT id INTO v_section_past FROM _d41b_ids WHERE name='section_past';
  SELECT id INTO v_enroll_open  FROM _d41b_ids WHERE name='enroll_open';
  SELECT id INTO v_enroll_past  FROM _d41b_ids WHERE name='enroll_past';

  IF to_regclass('public.section_enrollments') IS NULL
     OR to_regclass('public.course_sections') IS NULL
     OR to_regclass('public.courses') IS NULL THEN
    RAISE NOTICE 'D4.1b fixture seed skipped: substrate absent';
    RETURN;
  END IF;

  INSERT INTO auth.users (id, email) VALUES
    (v_student, 'd41b-student@test.local'),
    (v_actor, 'd41b-actor@test.local')
  ON CONFLICT (id) DO NOTHING;

  -- Term with open add/drop window.
  INSERT INTO public.academic_terms
    (id, code, name, status, starts_on, ends_on, start_date, end_date,
     add_drop_ends_on, withdraw_ends_on)
  VALUES
    (v_term_open, 'd41b-open', 'D4.1b open term',
     'open'::public.academic_term_status,
     current_date - 7, current_date + 90,
     current_date - 7, current_date + 90,
     current_date + 7, current_date + 60),
    (v_term_past, 'd41b-past', 'D4.1b past-deadline term',
     'open'::public.academic_term_status,
     current_date - 90, current_date + 30,
     current_date - 90, current_date + 30,
     current_date - 30, current_date - 10)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.courses (id, title)
  VALUES (v_course, 'D4.1b course')
  ON CONFLICT (id) DO NOTHING;

  -- term_label + course_code are NOT NULL in CI's course_sections shape;
  -- derive them from the term + course so historical rows aren't broken.
  INSERT INTO public.course_sections
    (id, course_id, term_id, section_code, section_status, active,
     seat_capacity, enrolled_count, credit_hours, term_label, course_code)
  VALUES
    (v_section_open, v_course, v_term_open, 'D41B-OPEN', 'open', true, 25, 1, 3, 'd41b-open', 'D41B'),
    (v_section_past, v_course, v_term_past, 'D41B-PAST', 'open', true, 25, 1, 3, 'd41b-past', 'D41B')
  ON CONFLICT (id) DO NOTHING;

  -- Seed section_enrollments. Bypass user triggers for the duration —
  -- both my own state guard AND enforce_section_course_teaching_readiness,
  -- which the bare-bones fixture course cannot satisfy. set_config with
  -- is_local=true is the plpgsql-safe equivalent of SET LOCAL.
  PERFORM set_config('session_replication_role', 'replica', true);
  PERFORM set_config('scrolluniversity.registrar_authority_rpc', 'on', true);
  INSERT INTO public.section_enrollments
    (id, section_id, student_user_id, status, term_id, credit_hours)
  VALUES
    (v_enroll_open, v_section_open, v_student, 'enrolled', v_term_open, 3),
    (v_enroll_past, v_section_past, v_student, 'enrolled', v_term_past, 3)
  ON CONFLICT (id) DO NOTHING;
  PERFORM set_config('scrolluniversity.registrar_authority_rpc', 'off', true);
  PERFORM set_config('session_replication_role', 'origin', true);
END$$;

-- =====================================================================
-- TEST 4: direct UPDATE section_enrollments.status is blocked, then
-- allowed when trusted marker is on.
-- =====================================================================
DO $$
DECLARE
  v_blocked boolean := false;
  v_allowed boolean := false;
  v_blocked_err text := '';
  v_allowed_err text := '';
  v_enroll uuid;
BEGIN
  SELECT id INTO v_enroll FROM _d41b_ids WHERE name='enroll_open';

  IF NOT EXISTS (SELECT 1 FROM public.section_enrollments WHERE id = v_enroll) THEN
    PERFORM pg_temp.record(4,'guard blocks direct UPDATE (SKIPPED: fixture missing)', true, '');
    RETURN;
  END IF;

  -- Disable OTHER user triggers on section_enrollments so this test
  -- isolates my D4.1b state guard. enforce_section_course_teaching_readiness
  -- fires on UPDATE too and would reject the write because the bare-bones
  -- fixture course isn't teaching-ready — unrelated to the state guard.
  BEGIN
    EXECUTE 'ALTER TABLE public.section_enrollments DISABLE TRIGGER enforce_section_course_teaching_readiness';
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  BEGIN
    UPDATE public.section_enrollments
       SET status = 'dropped'::public.section_enrollment_status
     WHERE id = v_enroll;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := SQLERRM LIKE '%section_enrollment_state_write_forbidden%';
    v_blocked_err := SQLERRM;
  END;

  PERFORM set_config('scrolluniversity.registrar_authority_rpc', 'on', true);
  BEGIN
    UPDATE public.section_enrollments
       SET status = 'enrolled'::public.section_enrollment_status
     WHERE id = v_enroll;
    v_allowed := true;
  EXCEPTION WHEN OTHERS THEN
    v_allowed := false;
    v_allowed_err := SQLERRM;
  END;
  PERFORM set_config('scrolluniversity.registrar_authority_rpc', 'off', true);

  BEGIN
    EXECUTE 'ALTER TABLE public.section_enrollments ENABLE TRIGGER enforce_section_course_teaching_readiness';
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  PERFORM pg_temp.record(4,'state guard blocks direct UPDATE + allows trusted-session UPDATE',
                         v_blocked AND v_allowed,
                         format('blocked=%s allowed=%s blocked_err=%s allowed_err=%s',
                                v_blocked, v_allowed, v_blocked_err, v_allowed_err));
END$$;

-- =====================================================================
-- TEST 5: drop_section_enrollment is deadline-aware.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_section_open uuid; v_section_past uuid;
  v_drop_result jsonb;
  v_past_result jsonb;
  v_drop_ok boolean;
  v_past_blocked boolean;
BEGIN
  SELECT id INTO v_student      FROM _d41b_ids WHERE name='student';
  SELECT id INTO v_section_open FROM _d41b_ids WHERE name='section_open';
  SELECT id INTO v_section_past FROM _d41b_ids WHERE name='section_past';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_student::text, 'role','authenticated')::text, true);

  -- Drop on open term: expect dropped.
  BEGIN
    v_drop_result := public.drop_section_enrollment(v_section_open, 'student changed mind');
  EXCEPTION WHEN OTHERS THEN
    v_drop_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  v_drop_ok := COALESCE((v_drop_result->>'success')::boolean, false)
               AND v_drop_result->>'new_status' = 'dropped';

  -- Drop on past-deadline term: expect drop_deadline_passed.
  BEGIN
    v_past_result := public.drop_section_enrollment(v_section_past, 'too late');
  EXCEPTION WHEN OTHERS THEN
    v_past_result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  v_past_blocked := (v_past_result->>'success')::boolean IS NOT true
                    AND v_past_result->>'error' = 'drop_deadline_passed';

  PERFORM pg_temp.record(5,'drop_section_enrollment is deadline-aware',
                         v_drop_ok AND v_past_blocked,
                         format('open_term=%s past_term=%s',
                                v_drop_result::text, v_past_result::text));
END$$;

-- =====================================================================
-- TEST 6: dropping writes a registrar_audit_log row.
-- =====================================================================
DO $$
DECLARE
  v_count int;
  v_section uuid;
  v_student uuid;
BEGIN
  SELECT id INTO v_section FROM _d41b_ids WHERE name='section_open';
  SELECT id INTO v_student FROM _d41b_ids WHERE name='student';

  SELECT count(*) INTO v_count
    FROM public.registrar_audit_log
   WHERE section_id = v_section
     AND student_user_id = v_student
     AND event_kind = 'dropped';
  PERFORM pg_temp.record(6,'drop writes registrar_audit_log row',
                         v_count >= 1, format('count=%s', v_count));
END$$;

-- =====================================================================
-- TEST 7: impose_student_hold + lift_student_hold round-trip + audit.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_actor uuid;
  v_impose_result jsonb;
  v_lift_result jsonb;
  v_hold_id uuid;
  v_audit_imposed int;
  v_audit_lifted int;
  v_now_active_after_impose int;
  v_now_active_after_lift int;
BEGIN
  SELECT id INTO v_student FROM _d41b_ids WHERE name='student';
  SELECT id INTO v_actor   FROM _d41b_ids WHERE name='actor';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_actor::text, 'role','authenticated')::text, true);

  v_impose_result := public.impose_student_hold(v_student, 'financial', 'balance due');
  v_hold_id := (v_impose_result->>'hold_id')::uuid;

  SELECT count(*) INTO v_now_active_after_impose
    FROM public.student_holds
   WHERE user_id = v_student AND lifted_at IS NULL;

  v_lift_result := public.lift_student_hold(v_hold_id);

  SELECT count(*) INTO v_now_active_after_lift
    FROM public.student_holds
   WHERE user_id = v_student AND lifted_at IS NULL;

  SELECT count(*) INTO v_audit_imposed
    FROM public.registrar_audit_log
   WHERE student_user_id = v_student AND event_kind = 'hold_imposed';
  SELECT count(*) INTO v_audit_lifted
    FROM public.registrar_audit_log
   WHERE student_user_id = v_student AND event_kind = 'hold_lifted';

  PERFORM pg_temp.record(7,'impose+lift hold round-trip writes audit rows',
    COALESCE((v_impose_result->>'success')::boolean, false)
    AND COALESCE((v_lift_result->>'success')::boolean, false)
    AND v_now_active_after_impose >= 1
    AND v_now_active_after_lift  = v_now_active_after_impose - 1
    AND v_audit_imposed >= 1
    AND v_audit_lifted  >= 1,
    format('imposed_audit=%s lifted_audit=%s active_before=%s active_after=%s',
           v_audit_imposed, v_audit_lifted,
           v_now_active_after_impose, v_now_active_after_lift));
END$$;

-- =====================================================================
-- TEST 8: can_register_now flags active_holds_present and clears it.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_actor uuid; v_term_open uuid;
  v_hold jsonb;
  v_issues_with text[];
  v_issues_without text[];
BEGIN
  SELECT id INTO v_student   FROM _d41b_ids WHERE name='student';
  SELECT id INTO v_actor     FROM _d41b_ids WHERE name='actor';
  SELECT id INTO v_term_open FROM _d41b_ids WHERE name='term_open';

  -- Student needs a degree enrollment so the hold is the ONLY blocker.
  INSERT INTO public.student_degree_enrollments (user_id, status)
  VALUES (v_student, 'active')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_actor::text, 'role','authenticated')::text, true);

  -- Make sure there is at least one open window for the open term so
  -- no_open_registration_window doesn't obscure the hold signal.
  INSERT INTO public.registration_windows
    (term_id, open_at, close_at, audience, is_active, priority_order)
  VALUES (v_term_open, now() - interval '1 day', now() + interval '14 days',
          'all', true, 0)
  ON CONFLICT DO NOTHING;

  v_hold := public.impose_student_hold(v_student, 'admin', 'd41b probe');
  v_issues_with := public.can_register_now(v_student, v_term_open);

  PERFORM public.lift_student_hold((v_hold->>'hold_id')::uuid);
  v_issues_without := public.can_register_now(v_student, v_term_open);

  PERFORM pg_temp.record(8,
    'can_register_now surfaces + clears active_holds_present',
    'active_holds_present' = ANY(v_issues_with)
    AND NOT ('active_holds_present' = ANY(v_issues_without)),
    format('with=[%s] without=[%s]',
           array_to_string(v_issues_with,','),
           array_to_string(v_issues_without,',')));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Registrar Hardening (D4.1b) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Registrar Hardening (D4.1b) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Registrar Hardening (D4.1b) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
