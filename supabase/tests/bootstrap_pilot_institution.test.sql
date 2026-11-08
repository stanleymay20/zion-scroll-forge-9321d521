-- ============================================================================
-- Bootstrap Pilot Institution — Phase 2C Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap_pilot_institution.test.sql
--
-- Covers Phase 2C:
--   1. Refuses unauth / blank name / same operator and reviewer / NULLs.
--   2. Happy path: creates institution (lifecycle_status='pilot'),
--      registers dual-persona pair, returns {institution_id, persona_id}.
--   3. Resulting institution surfaces in vw_institution_banner with
--      is_pilot=true.
--   4. Resulting persona surfaces in vw_pilot_personas with
--      is_active=true.
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

CREATE TEMP TABLE _p2c_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p2c_ids VALUES
  ('operator', '12121212-dead-beef-0001-000000000001'),
  ('reviewer', '12121212-dead-beef-0001-000000000002'),
  ('caller',   '12121212-dead-beef-0001-00000000ca11');

DO $$
DECLARE v_operator uuid; v_reviewer uuid; v_caller uuid;
BEGIN
  SELECT id INTO v_operator FROM _p2c_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2c_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2c_ids WHERE name='caller';
  INSERT INTO auth.users (id, email) VALUES
    (v_operator, 'p2c-op@test.local'),
    (v_reviewer, 'p2c-rv@test.local'),
    (v_caller,   'p2c-caller@test.local')
  ON CONFLICT (id) DO NOTHING;
END$$;

-- =====================================================================
-- TEST 1: Refuses invalid inputs
-- =====================================================================
DO $$
DECLARE
  v_operator uuid; v_reviewer uuid; v_caller uuid;
  v_unauth jsonb; v_blank jsonb; v_same jsonb; v_null_op jsonb;
BEGIN
  SELECT id INTO v_operator FROM _p2c_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2c_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2c_ids WHERE name='caller';

  -- Unauthenticated
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  v_unauth := public.bootstrap_pilot_institution('X', v_operator, v_reviewer, NULL);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);
  v_blank    := public.bootstrap_pilot_institution('   ', v_operator, v_reviewer, NULL);
  v_same     := public.bootstrap_pilot_institution('X',   v_operator, v_operator, NULL);
  v_null_op  := public.bootstrap_pilot_institution('X',   NULL,       v_reviewer, NULL);

  PERFORM pg_temp.record(1,
    'bootstrap_pilot_institution refuses unauth / blank / same / NULL',
    v_unauth->>'error'  = 'not_authenticated'
    AND v_blank->>'error'   = 'institution_name_required'
    AND v_same->>'error'    = 'operator_and_reviewer_must_differ'
    AND v_null_op->>'error' = 'operator_and_reviewer_required',
    format('unauth=%s blank=%s same=%s null_op=%s',
           v_unauth::text, v_blank::text, v_same::text, v_null_op::text));
END$$;

-- =====================================================================
-- TEST 2: Happy path returns {institution_id, persona_id}
-- =====================================================================
DO $$
DECLARE
  v_operator uuid; v_reviewer uuid; v_caller uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_operator FROM _p2c_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2c_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2c_ids WHERE name='caller';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  v_result := public.bootstrap_pilot_institution(
    'P2C ScrollUniversity pilot', v_operator, v_reviewer,
    'Operator attests dual-persona review integrity'
  );

  PERFORM pg_temp.record(2,
    'happy path returns success + institution_id + persona_id',
    COALESCE((v_result->>'success')::boolean, false)
    AND (v_result->>'institution_id') IS NOT NULL
    AND (v_result->>'persona_id') IS NOT NULL,
    v_result::text);

  -- Stash the IDs for tests 3-4.
  INSERT INTO _p2c_ids(name, id)
  VALUES
    ('institution', (v_result->>'institution_id')::uuid),
    ('persona',     (v_result->>'persona_id')::uuid)
  ON CONFLICT (name) DO UPDATE SET id = EXCLUDED.id;
END$$;

-- =====================================================================
-- TEST 3: institution appears in vw_institution_banner as pilot
-- =====================================================================
DO $$
DECLARE
  v_inst uuid; v_is_pilot boolean; v_name text;
BEGIN
  SELECT id INTO v_inst FROM _p2c_ids WHERE name='institution';
  SELECT is_pilot, name INTO v_is_pilot, v_name
    FROM public.vw_institution_banner WHERE id = v_inst;
  PERFORM pg_temp.record(3,
    'bootstrap institution appears in vw_institution_banner as pilot',
    v_is_pilot = true AND v_name = 'P2C ScrollUniversity pilot',
    format('is_pilot=%s name=%s', v_is_pilot, v_name));
END$$;

-- =====================================================================
-- TEST 4: persona appears in vw_pilot_personas as is_active
-- =====================================================================
DO $$
DECLARE
  v_persona uuid; v_is_active boolean;
BEGIN
  SELECT id INTO v_persona FROM _p2c_ids WHERE name='persona';
  SELECT is_active INTO v_is_active
    FROM public.vw_pilot_personas WHERE id = v_persona;
  PERFORM pg_temp.record(4,
    'bootstrap persona appears in vw_pilot_personas as is_active',
    v_is_active = true,
    format('is_active=%s', v_is_active));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Bootstrap Pilot Institution (Phase 2C) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Bootstrap Pilot Institution (Phase 2C) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Bootstrap Pilot Institution (Phase 2C) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
