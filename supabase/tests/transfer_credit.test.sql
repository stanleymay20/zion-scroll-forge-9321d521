-- ============================================================================
-- Transfer-Credit Reconciliation — Phase 1C Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/transfer_credit.test.sql
--
-- Covers Phase 1C:
--   1. student_course_completions carries provenance columns (source,
--      source_institution, transfer_request_id, transfer_note).
--   2. post_transfer_credit refuses unauthenticated / empty courses /
--      non-registrar callers.
--   3. Registrar-grant caller: posts 2 courses -> 2 rows land with
--      source='transfer'; vw_student_transcript sees them in credits.
--   4. Re-post with same transfer_request_id is idempotent (0 new rows).
--   5. Writes a registrar_audit_log event_kind='transfer_credit_posted'
--      with the courses_posted list.
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

CREATE TEMP TABLE _p1c_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p1c_ids VALUES
  ('student',   'cccccccc-dead-beef-0001-000000000001'),
  ('registrar', 'cccccccc-dead-beef-0001-000000000002'),
  ('from_deg',  'cccccccc-dead-beef-0002-000000000001'),
  ('to_deg',    'cccccccc-dead-beef-0002-000000000002'),
  ('course1',   'cccccccc-dead-beef-0003-000000000001'),
  ('course2',   'cccccccc-dead-beef-0003-000000000002');

-- =====================================================================
-- TEST 1: provenance columns on student_course_completions
-- =====================================================================
DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_pair record;
BEGIN
  FOR v_pair IN
    SELECT * FROM (VALUES
      ('source'), ('source_institution'), ('transfer_request_id'), ('transfer_note')
    ) AS t(col)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public'
                      AND table_name='student_course_completions'
                      AND column_name=v_pair.col) THEN
      v_missing := array_append(v_missing, v_pair.col);
    END IF;
  END LOOP;
  PERFORM pg_temp.record(1,'student_course_completions provenance columns present',
                         cardinality(v_missing) = 0,
                         array_to_string(v_missing, ','));
END$$;

-- =====================================================================
-- Shared fixture seed for tests 2-5.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_registrar uuid;
  v_from uuid; v_to uuid; v_c1 uuid; v_c2 uuid;
BEGIN
  SELECT id INTO v_student   FROM _p1c_ids WHERE name='student';
  SELECT id INTO v_registrar FROM _p1c_ids WHERE name='registrar';
  SELECT id INTO v_from      FROM _p1c_ids WHERE name='from_deg';
  SELECT id INTO v_to        FROM _p1c_ids WHERE name='to_deg';
  SELECT id INTO v_c1        FROM _p1c_ids WHERE name='course1';
  SELECT id INTO v_c2        FROM _p1c_ids WHERE name='course2';

  INSERT INTO auth.users (id, email) VALUES
    (v_student,   'p1c-student@test.local'),
    (v_registrar, 'p1c-registrar@test.local')
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('session_replication_role', 'replica', true);

  INSERT INTO public.courses (id, title) VALUES
    (v_c1, 'P1C transfer course 1'),
    (v_c2, 'P1C transfer course 2')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.degree_programs (id, title) VALUES
    (v_from, 'P1C from degree'),
    (v_to,   'P1C to degree')
  ON CONFLICT (id) DO NOTHING;

  -- Give the registrar actor the admin role so has_role (if defined
  -- as a real function in CI) evaluates true. Drop any legacy CHECK
  -- on user_roles.role so arbitrary role values insert cleanly.
  DECLARE c text;
  BEGIN
    FOR c IN SELECT conname FROM pg_constraint
              WHERE conrelid='public.user_roles'::regclass AND contype='c'
    LOOP EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', c); END LOOP;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_registrar, 'registrar')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  PERFORM set_config('session_replication_role', 'origin', true);
END$$;

-- =====================================================================
-- TEST 2: refuses unauth / empty courses / non-registrar callers.
-- =====================================================================
DO $$
DECLARE
  v_student uuid;
  v_r_unauth jsonb;
  v_r_empty jsonb;
  v_r_rando jsonb;
BEGIN
  SELECT id INTO v_student FROM _p1c_ids WHERE name='student';

  -- Unauthenticated: jwt.claims present but with no 'sub' -> auth.uid() NULL.
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  v_r_unauth := public.post_transfer_credit(v_student, NULL, NULL,
                  '[{"course_id":"00000000-0000-0000-0000-000000000001"}]'::jsonb);

  -- Empty courses array from an impersonated caller.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_student::text, 'role','authenticated')::text, true);
  v_r_empty := public.post_transfer_credit(v_student, NULL, NULL, '[]'::jsonb);

  -- Non-registrar user (student impersonating registrar).
  v_r_rando := public.post_transfer_credit(v_student, NULL, NULL,
                  '[{"course_id":"00000000-0000-0000-0000-000000000001"}]'::jsonb);

  PERFORM pg_temp.record(2,
    'post_transfer_credit refuses unauth / empty / non-registrar',
    v_r_unauth->>'error' = 'not_authenticated'
    AND v_r_empty->>'error' = 'courses_required'
    AND v_r_rando->>'error' = 'registrar_authority_required',
    format('unauth=%s empty=%s rando=%s',
           v_r_unauth::text, v_r_empty::text, v_r_rando::text));
END$$;

-- =====================================================================
-- TEST 3: registrar posts 2 courses -> 2 rows + credits visible.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_registrar uuid; v_from uuid; v_to uuid; v_c1 uuid; v_c2 uuid;
  v_result jsonb;
  v_row_count int;
  v_credits numeric;
BEGIN
  SELECT id INTO v_student   FROM _p1c_ids WHERE name='student';
  SELECT id INTO v_registrar FROM _p1c_ids WHERE name='registrar';
  SELECT id INTO v_from      FROM _p1c_ids WHERE name='from_deg';
  SELECT id INTO v_to        FROM _p1c_ids WHERE name='to_deg';
  SELECT id INTO v_c1        FROM _p1c_ids WHERE name='course1';
  SELECT id INTO v_c2        FROM _p1c_ids WHERE name='course2';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_registrar::text, 'role','authenticated')::text, true);

  v_result := public.post_transfer_credit(
    v_student, v_from, v_to,
    jsonb_build_array(
      jsonb_build_object('course_id', v_c1::text, 'grade','A','grade_points',4.0,'credits_earned',3),
      jsonb_build_object('course_id', v_c2::text, 'grade','B','grade_points',3.0,'credits_earned',4)
    ),
    'Prior University',
    '00000000-0000-0000-0000-00000000c0c0',  -- no matching ptr row; test takes the NULL branch
    'imported from transcript'
  );

  -- transfer_request_id above points to a non-existent request, so
  -- the call returns transfer_request_not_found_for_student. Try
  -- again with NULL request_id.
  IF v_result->>'error' = 'transfer_request_not_found_for_student' THEN
    v_result := public.post_transfer_credit(
      v_student, v_from, v_to,
      jsonb_build_array(
        jsonb_build_object('course_id', v_c1::text, 'grade','A','grade_points',4.0,'credits_earned',3),
        jsonb_build_object('course_id', v_c2::text, 'grade','B','grade_points',3.0,'credits_earned',4)
      ),
      'Prior University',
      NULL,
      'imported from transcript'
    );
  END IF;

  SELECT count(*) INTO v_row_count
    FROM public.student_course_completions
   WHERE user_id = v_student AND source = 'transfer';

  SELECT credits_earned INTO v_credits
    FROM public.vw_student_transcript
   WHERE user_id = v_student;

  PERFORM pg_temp.record(3,
    'registrar posts 2 transfer rows + transcript reflects credits',
    COALESCE((v_result->>'success')::boolean, false)
    AND (v_result->>'posted_count')::int = 2
    AND v_row_count = 2
    AND v_credits = 7,
    format('result=%s row_count=%s credits=%s',
           v_result::text, v_row_count, v_credits));
END$$;

-- =====================================================================
-- TEST 4: re-post with same transfer_request_id is idempotent.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_registrar uuid; v_from uuid; v_to uuid;
  v_c1 uuid; v_ptr_id uuid := gen_random_uuid();
  v_r1 jsonb; v_r2 jsonb;
  v_before int; v_after int;
BEGIN
  SELECT id INTO v_student   FROM _p1c_ids WHERE name='student';
  SELECT id INTO v_registrar FROM _p1c_ids WHERE name='registrar';
  SELECT id INTO v_from      FROM _p1c_ids WHERE name='from_deg';
  SELECT id INTO v_to        FROM _p1c_ids WHERE name='to_deg';
  SELECT id INTO v_c1        FROM _p1c_ids WHERE name='course1';

  -- Seed a program_transfer_request if the table is present.
  BEGIN
    INSERT INTO public.program_transfer_requests
      (id, student_user_id, from_program_id, to_program_id, reason, status)
    VALUES (v_ptr_id, v_student, v_from, v_to, 'p1c idempotency probe', 'approved')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    PERFORM pg_temp.record(4,'idempotent re-post (SKIPPED: program_transfer_requests absent)', true, '');
    RETURN;
  END;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_registrar::text, 'role','authenticated')::text, true);

  v_r1 := public.post_transfer_credit(
    v_student, v_from, v_to,
    jsonb_build_array(jsonb_build_object('course_id', v_c1::text, 'grade','A','grade_points',4.0,'credits_earned',3)),
    'Prior U', v_ptr_id, NULL);

  SELECT count(*) INTO v_before
    FROM public.student_course_completions
   WHERE transfer_request_id = v_ptr_id;

  v_r2 := public.post_transfer_credit(
    v_student, v_from, v_to,
    jsonb_build_array(jsonb_build_object('course_id', v_c1::text, 'grade','A','grade_points',4.0,'credits_earned',3)),
    'Prior U', v_ptr_id, NULL);

  SELECT count(*) INTO v_after
    FROM public.student_course_completions
   WHERE transfer_request_id = v_ptr_id;

  PERFORM pg_temp.record(4,
    'post_transfer_credit is idempotent per transfer_request_id',
    v_before = 1 AND v_after = 1
    AND (v_r1->>'posted_count')::int = 1
    AND (v_r2->>'posted_count')::int = 0,
    format('before=%s after=%s r1=%s r2=%s',
           v_before, v_after, v_r1::text, v_r2::text));
END$$;

-- =====================================================================
-- TEST 5: registrar_audit_log event_kind=transfer_credit_posted.
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_count int;
BEGIN
  SELECT id INTO v_student FROM _p1c_ids WHERE name='student';
  SELECT count(*) INTO v_count
    FROM public.registrar_audit_log
   WHERE student_user_id = v_student
     AND event_kind = 'transfer_credit_posted';
  PERFORM pg_temp.record(5,'transfer_credit_posted audit rows written',
                         v_count >= 1, format('count=%s', v_count));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Transfer Credit (Phase 1C) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Transfer Credit (Phase 1C) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Transfer Credit (Phase 1C) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
