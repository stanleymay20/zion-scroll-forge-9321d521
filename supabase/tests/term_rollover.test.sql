-- ============================================================================
-- Term Rollover — Sprint D3.1 Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/term_rollover.test.sql
--
-- Covers: clone_section_for_term + rollover_term RPCs introduced in D3.1.
--
-- All assertions live inside a single transaction that ROLLBACKs at the end.
-- Each test records a row in _suite_results; the final SELECT prints a
-- summary and a final RAISE EXCEPTION fires if any test failed.
-- ============================================================================

\set QUIET on
\pset pager off

BEGIN;

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

-- -- Fixtures --------------------------------------------------------------
-- Admin actor; the RPCs use auth.uid() which reads request.jwt.claims.
\set ADMIN_UUID '\'11111111-1111-1111-1111-111111111111\''
\set REGISTRAR_UUID '\'22222222-2222-2222-2222-222222222222\''
\set STUDENT_UUID '\'33333333-3333-3333-3333-333333333333\''
\set SOURCE_TERM '\'D31_SRC\''
\set TARGET_TERM '\'D31_TGT\''

-- Seed auth.users + user_roles for the three actors used by the suite.
INSERT INTO auth.users (id, email)
  VALUES
    (:ADMIN_UUID, 'd31-admin@test.local'),
    (:REGISTRAR_UUID, 'd31-registrar@test.local'),
    (:STUDENT_UUID, 'd31-student@test.local')
  ON CONFLICT (id) DO NOTHING;

-- The CI env applies migrations in order; the first user_roles migration
-- creates `role TEXT CHECK (role IN (...))` without 'registrar', while
-- later migrations (which would use the app_role enum) skip via
-- IF NOT EXISTS. To insert a 'registrar' fixture row reliably, drop any
-- CHECK constraint on `role` inside this transaction — restored on
-- ROLLBACK at suite end.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.user_roles'::regclass
       AND contype  = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', c);
  END LOOP;
END$$;

INSERT INTO public.user_roles (user_id, role)
  VALUES
    (:ADMIN_UUID,     'admin'),
    (:REGISTRAR_UUID, 'registrar'),
    (:STUDENT_UUID,   'student')
  ON CONFLICT DO NOTHING;

-- Helper: become a user inside the transaction by setting the JWT claims
-- that auth.uid() reads via current_setting.
CREATE OR REPLACE FUNCTION pg_temp.become(p_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user::text, 'role','authenticated')::text,
    true
  );
END$$;

-- Seed 3 sections in the source term + 1 already-existing counterpart in
-- the target term (to exercise idempotent-skip).
INSERT INTO public.course_sections
  (term_label, course_code, course_title, section_code, instructor_user_id,
   seat_capacity, waitlist_capacity, credit_hours, active)
VALUES
  ('D31_SRC', 'THEO101', 'Foundations',     '001', :REGISTRAR_UUID, 30, 5, 3, true),
  ('D31_SRC', 'THEO101', 'Foundations',     '002', :REGISTRAR_UUID, 30, 5, 3, true),
  ('D31_SRC', 'THEO201', 'Old Testament',   '001', :REGISTRAR_UUID, 25, 5, 3, true),
  ('D31_SRC', 'THEO301', 'Inactive Section','001', :REGISTRAR_UUID, 20, 5, 3, false),
  -- Pre-existing counterpart for THEO101/001 in the target term.
  ('D31_TGT', 'THEO101', 'Foundations',     '001', :REGISTRAR_UUID, 30, 5, 3, true);

-- =====================================================================
-- TEST 1: clone_section_for_term creates a counterpart with identical
-- shape, returns the new id, and writes an ops_log entry.
-- =====================================================================
DO $$
DECLARE
  v_source_id uuid;
  v_new_id uuid;
  v_match int;
  v_ops int;
BEGIN
  PERFORM pg_temp.become('11111111-1111-1111-1111-111111111111'::uuid);

  SELECT id INTO v_source_id
    FROM public.course_sections
   WHERE term_label='D31_SRC' AND course_code='THEO201' AND section_code='001';

  v_new_id := public.clone_section_for_term(v_source_id, 'D31_TGT_T1');

  SELECT count(*) INTO v_match
    FROM public.course_sections src
    JOIN public.course_sections tgt ON tgt.id = v_new_id
   WHERE src.id = v_source_id
     AND tgt.course_code = src.course_code
     AND tgt.section_code = src.section_code
     AND tgt.seat_capacity = src.seat_capacity
     AND tgt.credit_hours  = src.credit_hours
     AND tgt.term_label    = 'D31_TGT_T1';

  SELECT count(*) INTO v_ops
    FROM public.ops_log
   WHERE event = 'section.cloned'
     AND (context->>'new_section_id')::uuid = v_new_id;

  PERFORM pg_temp.record(1,'clone_section_for_term: cloned shape + ops_log entry',
                         v_match = 1 AND v_ops = 1,
                         format('match=%s ops=%s', v_match, v_ops));
END$$;

-- =====================================================================
-- TEST 2: clone_section_for_term does NOT carry over section_enrollments.
-- =====================================================================
DO $$
DECLARE
  v_source_id uuid;
  v_new_id uuid;
  v_enr_count int;
BEGIN
  PERFORM pg_temp.become('11111111-1111-1111-1111-111111111111'::uuid);

  SELECT id INTO v_source_id
    FROM public.course_sections
   WHERE term_label='D31_SRC' AND course_code='THEO101' AND section_code='002';

  INSERT INTO public.section_enrollments (section_id, student_user_id, status)
    VALUES (v_source_id, '33333333-3333-3333-3333-333333333333'::uuid, 'enrolled');

  v_new_id := public.clone_section_for_term(v_source_id, 'D31_TGT_T2');

  SELECT count(*) INTO v_enr_count
    FROM public.section_enrollments
   WHERE section_id = v_new_id;

  PERFORM pg_temp.record(2,'clone_section_for_term: enrollments NOT carried over',
                         v_enr_count = 0,
                         format('enr_in_new=%s', v_enr_count));
END$$;

-- =====================================================================
-- TEST 3: clone_section_for_term fails on duplicate
-- (target row already exists with same course/section code).
-- =====================================================================
DO $$
DECLARE
  v_source_id uuid;
  v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('11111111-1111-1111-1111-111111111111'::uuid);

  SELECT id INTO v_source_id
    FROM public.course_sections
   WHERE term_label='D31_SRC' AND course_code='THEO101' AND section_code='001';

  BEGIN
    PERFORM public.clone_section_for_term(v_source_id, 'D31_TGT');
  EXCEPTION WHEN unique_violation THEN
    v_failed := true;
  END;

  PERFORM pg_temp.record(3,'clone_section_for_term: rejects duplicate target row',
                         v_failed, '');
END$$;

-- =====================================================================
-- TEST 4: clone_section_for_term applies overrides (instructor + capacity).
-- =====================================================================
DO $$
DECLARE
  v_source_id uuid;
  v_new_id uuid;
  v_ok boolean;
  v_new_instructor uuid := '99999999-9999-9999-9999-999999999999'::uuid;
BEGIN
  PERFORM pg_temp.become('11111111-1111-1111-1111-111111111111'::uuid);

  INSERT INTO auth.users (id, email)
    VALUES (v_new_instructor, 'd31-newprof@test.local') ON CONFLICT DO NOTHING;

  SELECT id INTO v_source_id
    FROM public.course_sections
   WHERE term_label='D31_SRC' AND course_code='THEO201' AND section_code='001';

  v_new_id := public.clone_section_for_term(
    v_source_id, 'D31_TGT_T4',
    jsonb_build_object('instructor_user_id', v_new_instructor::text,
                       'seat_capacity', 99)
  );

  SELECT (instructor_user_id = v_new_instructor AND seat_capacity = 99)
    INTO v_ok
    FROM public.course_sections WHERE id = v_new_id;

  PERFORM pg_temp.record(4,'clone_section_for_term: applies overrides',
                         v_ok, '');
END$$;

-- =====================================================================
-- TEST 5: rollover_term clones all sections from source → target,
-- skips the pre-existing counterpart, and returns the right summary.
-- (Only-active = true → the THEO301 inactive row is excluded from total.)
-- =====================================================================
DO $$
DECLARE
  v_result jsonb;
  v_pre_count int;
  v_post_count int;
BEGIN
  PERFORM pg_temp.become('22222222-2222-2222-2222-222222222222'::uuid);  -- registrar

  SELECT count(*) INTO v_pre_count
    FROM public.course_sections WHERE term_label='D31_TGT';

  v_result := public.rollover_term('D31_SRC', 'D31_TGT', true);

  SELECT count(*) INTO v_post_count
    FROM public.course_sections WHERE term_label='D31_TGT';

  PERFORM pg_temp.record(5,'rollover_term: returns summary + cloned the right count',
    (v_result->>'total')::int = 3            -- 3 active sections in SRC
    AND (v_result->>'cloned')::int = 2       -- THEO101/002 + THEO201/001
    AND (v_result->>'skipped_existing')::int = 1   -- THEO101/001 pre-existed
    AND v_post_count - v_pre_count = 2,
    format('summary=%s post-pre=%s', v_result, v_post_count - v_pre_count));
END$$;

-- =====================================================================
-- TEST 6: rollover_term is idempotent. Re-running yields 0 cloned and
-- the original total in skipped_existing.
-- =====================================================================
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM pg_temp.become('22222222-2222-2222-2222-222222222222'::uuid);

  v_result := public.rollover_term('D31_SRC', 'D31_TGT', true);

  PERFORM pg_temp.record(6,'rollover_term: idempotent re-run skips all',
    (v_result->>'cloned')::int = 0
    AND (v_result->>'skipped_existing')::int = 3,
    format('summary=%s', v_result));
END$$;

-- =====================================================================
-- TEST 7: rollover_term writes one batch-start + per-section + one
-- batch-complete event, all sharing the same correlation_id.
-- =====================================================================
DO $$
DECLARE
  v_result jsonb;
  v_corr uuid;
  v_start int; v_complete int; v_cloned int; v_skipped int;
BEGIN
  PERFORM pg_temp.become('22222222-2222-2222-2222-222222222222'::uuid);

  v_result := public.rollover_term('D31_SRC', 'D31_TGT_T7', true);
  v_corr := (v_result->>'correlation_id')::uuid;

  SELECT count(*) FILTER (WHERE event='term.rollover_started'),
         count(*) FILTER (WHERE event='term.rolled_over'),
         count(*) FILTER (WHERE event='section.cloned'),
         count(*) FILTER (WHERE event='section.clone_skipped_existing')
    INTO v_start, v_complete, v_cloned, v_skipped
    FROM public.ops_log WHERE correlation_id = v_corr;

  PERFORM pg_temp.record(7,'rollover_term: emits correlated ops_log batch',
    v_start = 1 AND v_complete = 1
    AND v_cloned = (v_result->>'cloned')::int
    AND v_skipped = (v_result->>'skipped_existing')::int,
    format('start=%s complete=%s cloned=%s skipped=%s',
           v_start, v_complete, v_cloned, v_skipped));
END$$;

-- =====================================================================
-- TEST 8: rollover_term rejects same-term call.
-- =====================================================================
DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('22222222-2222-2222-2222-222222222222'::uuid);
  BEGIN
    PERFORM public.rollover_term('D31_SRC', 'D31_SRC', true);
  EXCEPTION WHEN OTHERS THEN
    v_failed := SQLERRM LIKE 'same_term%';
  END;
  PERFORM pg_temp.record(8,'rollover_term: rejects source = target', v_failed, '');
END$$;

-- =====================================================================
-- TEST 9: rollover_term forbidden for student.
-- =====================================================================
DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('33333333-3333-3333-3333-333333333333'::uuid);
  BEGIN
    PERFORM public.rollover_term('D31_SRC', 'D31_TGT_T9', true);
  EXCEPTION WHEN OTHERS THEN
    v_failed := SQLERRM LIKE 'forbidden%';
  END;
  PERFORM pg_temp.record(9,'rollover_term: forbidden for non-privileged role', v_failed, '');
END$$;

-- =====================================================================
-- TEST 10: maintenance mode blocks non-admin (registrar) but admins
-- bypass. Restore mode at the end.
-- =====================================================================
DO $$
DECLARE
  v_blocked boolean := false;
  v_admin_ok boolean := false;
  v_result jsonb;
BEGIN
  UPDATE public.maintenance_settings SET is_enabled = true WHERE id = true;

  -- Registrar should be blocked.
  PERFORM pg_temp.become('22222222-2222-2222-2222-222222222222'::uuid);
  BEGIN
    PERFORM public.rollover_term('D31_SRC', 'D31_TGT_T10', true);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := SQLERRM LIKE 'maintenance_mode_active%';
  END;

  -- Admin should pass.
  PERFORM pg_temp.become('11111111-1111-1111-1111-111111111111'::uuid);
  BEGIN
    v_result := public.rollover_term('D31_SRC', 'D31_TGT_T10b', true);
    v_admin_ok := (v_result->>'cloned') IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    v_admin_ok := false;
  END;

  UPDATE public.maintenance_settings SET is_enabled = false WHERE id = true;

  PERFORM pg_temp.record(10,'rollover_term: maintenance blocks registrar but admin bypasses',
                         v_blocked AND v_admin_ok,
                         format('blocked=%s admin_ok=%s', v_blocked, v_admin_ok));
END$$;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
DECLARE v_fails int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Term Rollover suite ---';
  FOR v_fails IN
    SELECT test_no FROM _suite_results ORDER BY test_no
  LOOP
    -- side-effect notice happens in pg_temp.record already
    NULL;
  END LOOP;

  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Term Rollover regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Term Rollover suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
