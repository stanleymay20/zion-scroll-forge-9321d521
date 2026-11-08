-- ============================================================================
-- Pilot Institution Tier — Phase 2A Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/pilot_institution_tier.test.sql
--
-- Covers Phase 2A:
--   1. institutions.lifecycle_status column + CHECK constraint.
--   2. institution_is_pilot predicate: pilot -> true, operational -> false,
--      NULL/unknown -> fail-closed true.
--   3. assert_institution_not_pilot raises pilot_institution_blocks_<action>
--      with a specific action name.
--   4. assert_institution_not_pilot(operational) returns void without raising.
--   5. vw_institution_banner surfaces is_pilot correctly.
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

CREATE TEMP TABLE _p2a_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p2a_ids VALUES
  ('pilot_inst',       'eeeeeeee-dead-beef-0001-000000000001'),
  ('operational_inst', 'eeeeeeee-dead-beef-0001-000000000002'),
  ('unknown_inst',     'eeeeeeee-dead-beef-0001-00000000beef');

-- =====================================================================
-- TEST 1: lifecycle_status column + CHECK constraint
-- =====================================================================
DO $$
DECLARE
  v_col_exists boolean;
  v_chk_exists boolean;
  v_bad_insert_blocked boolean := false;
BEGIN
  v_col_exists := EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='institutions'
       AND column_name='lifecycle_status'
  );
  v_chk_exists := EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='institutions_lifecycle_status_chk'
       AND conrelid='public.institutions'::regclass
  );

  BEGIN
    INSERT INTO public.institutions (id, name, lifecycle_status)
    VALUES (gen_random_uuid(), 'P2A bogus', 'ghost');
  EXCEPTION WHEN check_violation THEN
    v_bad_insert_blocked := true;
  WHEN OTHERS THEN
    v_bad_insert_blocked := SQLERRM ILIKE '%institutions_lifecycle_status_chk%';
  END;

  PERFORM pg_temp.record(1,
    'institutions.lifecycle_status column + CHECK constraint present',
    v_col_exists AND v_chk_exists AND v_bad_insert_blocked,
    format('col=%s chk=%s bad_blocked=%s', v_col_exists, v_chk_exists, v_bad_insert_blocked));
END$$;

-- =====================================================================
-- Shared fixture seed for tests 2-5.
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_op uuid;
BEGIN
  SELECT id INTO v_pilot FROM _p2a_ids WHERE name='pilot_inst';
  SELECT id INTO v_op    FROM _p2a_ids WHERE name='operational_inst';

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.institutions (id, name, lifecycle_status)
  VALUES
    (v_pilot, 'P2A pilot institution', 'pilot'),
    (v_op,    'P2A operational institution', 'operational')
  ON CONFLICT (id) DO NOTHING;
  PERFORM set_config('session_replication_role', 'origin', true);
END$$;

-- =====================================================================
-- TEST 2: institution_is_pilot predicate semantics
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_op uuid; v_unknown uuid;
  v_r_pilot boolean; v_r_op boolean; v_r_unknown boolean; v_r_null boolean;
BEGIN
  SELECT id INTO v_pilot   FROM _p2a_ids WHERE name='pilot_inst';
  SELECT id INTO v_op      FROM _p2a_ids WHERE name='operational_inst';
  SELECT id INTO v_unknown FROM _p2a_ids WHERE name='unknown_inst';

  v_r_pilot   := public.institution_is_pilot(v_pilot);
  v_r_op      := public.institution_is_pilot(v_op);
  v_r_unknown := public.institution_is_pilot(v_unknown);  -- fail-closed true
  v_r_null    := public.institution_is_pilot(NULL);        -- fail-closed true

  PERFORM pg_temp.record(2,
    'institution_is_pilot: pilot=true, operational=false, unknown=true (fail-closed), NULL=true',
    v_r_pilot = true
    AND v_r_op = false
    AND v_r_unknown = true
    AND v_r_null = true,
    format('pilot=%s op=%s unknown=%s null=%s',
           v_r_pilot, v_r_op, v_r_unknown, v_r_null));
END$$;

-- =====================================================================
-- TEST 3: assert_institution_not_pilot raises on pilot
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid;
  v_err text;
BEGIN
  SELECT id INTO v_pilot FROM _p2a_ids WHERE name='pilot_inst';
  BEGIN
    PERFORM public.assert_institution_not_pilot(v_pilot, 'confer_degree');
    v_err := '(no error raised)';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM pg_temp.record(3,
    'assert_institution_not_pilot raises pilot_institution_blocks_confer_degree on pilot',
    v_err ILIKE 'pilot_institution_blocks_confer_degree%',
    v_err);
END$$;

-- =====================================================================
-- TEST 4: assert_institution_not_pilot on operational returns cleanly
-- =====================================================================
DO $$
DECLARE
  v_op uuid;
  v_ok boolean := false;
BEGIN
  SELECT id INTO v_op FROM _p2a_ids WHERE name='operational_inst';
  BEGIN
    PERFORM public.assert_institution_not_pilot(v_op, 'issue_credential');
    v_ok := true;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false;
  END;
  PERFORM pg_temp.record(4,
    'assert_institution_not_pilot on operational institution returns void cleanly',
    v_ok, '');
END$$;

-- =====================================================================
-- TEST 5: vw_institution_banner surfaces is_pilot
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_op uuid;
  v_pilot_is_pilot boolean; v_op_is_pilot boolean;
BEGIN
  SELECT id INTO v_pilot FROM _p2a_ids WHERE name='pilot_inst';
  SELECT id INTO v_op    FROM _p2a_ids WHERE name='operational_inst';

  SELECT is_pilot INTO v_pilot_is_pilot
    FROM public.vw_institution_banner WHERE id = v_pilot;
  SELECT is_pilot INTO v_op_is_pilot
    FROM public.vw_institution_banner WHERE id = v_op;

  PERFORM pg_temp.record(5,
    'vw_institution_banner.is_pilot matches lifecycle_status',
    v_pilot_is_pilot = true AND v_op_is_pilot = false,
    format('pilot_is_pilot=%s op_is_pilot=%s', v_pilot_is_pilot, v_op_is_pilot));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Pilot Institution Tier (Phase 2A) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Pilot Institution Tier (Phase 2A) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Pilot Institution Tier (Phase 2A) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
