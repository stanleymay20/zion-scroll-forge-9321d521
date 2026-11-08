-- ============================================================================
-- Dual-Persona Seed — Phase 2B Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/dual_persona.test.sql
--
-- Covers Phase 2B:
--   1. pilot_personas table + RLS + partial unique on active rows.
--   2. register_pilot_personas refuses operator=reviewer, unknown users,
--      unknown institution, non-pilot institution, and NULL inputs.
--   3. Happy path: pilot institution + distinct operator/reviewer ->
--      pilot_personas row lands + vw_pilot_personas shows is_active=true.
--   4. Second registration on the same institution with retired_at IS NULL
--      conflict returns active_pilot_personas_already_registered.
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

CREATE TEMP TABLE _p2b_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p2b_ids VALUES
  ('pilot_inst',       'ffffffff-dead-beef-0001-000000000001'),
  ('operational_inst', 'ffffffff-dead-beef-0001-000000000002'),
  ('operator',         'ffffffff-dead-beef-0002-000000000001'),
  ('reviewer',         'ffffffff-dead-beef-0002-000000000002'),
  ('caller',           'ffffffff-dead-beef-0002-00000000ca11');

-- =====================================================================
-- TEST 1: pilot_personas table + RLS + partial unique index
-- =====================================================================
DO $$
DECLARE
  v_rls boolean;
  v_uidx boolean;
BEGIN
  IF to_regclass('public.pilot_personas') IS NULL THEN
    PERFORM pg_temp.record(1,'pilot_personas table exists', false, 'table missing');
    RETURN;
  END IF;
  SELECT c.relrowsecurity INTO v_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relname='pilot_personas';
  v_uidx := EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='public' AND tablename='pilot_personas'
       AND indexname='pilot_personas_active_per_institution_uidx'
  );
  PERFORM pg_temp.record(1,
    'pilot_personas has RLS + active-row partial unique index',
    COALESCE(v_rls,false) AND v_uidx,
    format('rls=%s uidx=%s', v_rls, v_uidx));
END$$;

-- =====================================================================
-- Shared fixture seed for tests 2-4.
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_op_inst uuid; v_operator uuid; v_reviewer uuid; v_caller uuid;
BEGIN
  SELECT id INTO v_pilot    FROM _p2b_ids WHERE name='pilot_inst';
  SELECT id INTO v_op_inst  FROM _p2b_ids WHERE name='operational_inst';
  SELECT id INTO v_operator FROM _p2b_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2b_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2b_ids WHERE name='caller';

  INSERT INTO auth.users (id, email) VALUES
    (v_operator, 'p2b-operator@test.local'),
    (v_reviewer, 'p2b-reviewer@test.local'),
    (v_caller,   'p2b-caller@test.local')
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.institutions (id, name, lifecycle_status) VALUES
    (v_pilot,   'P2B pilot',       'pilot'),
    (v_op_inst, 'P2B operational', 'operational')
  ON CONFLICT (id) DO NOTHING;
  PERFORM set_config('session_replication_role', 'origin', true);
END$$;

-- =====================================================================
-- TEST 2: register_pilot_personas refuses invalid inputs
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_op_inst uuid; v_operator uuid; v_reviewer uuid; v_caller uuid;
  v_same jsonb; v_no_inst jsonb; v_not_pilot jsonb;
  v_unknown_op jsonb; v_null_op jsonb;
BEGIN
  SELECT id INTO v_pilot    FROM _p2b_ids WHERE name='pilot_inst';
  SELECT id INTO v_op_inst  FROM _p2b_ids WHERE name='operational_inst';
  SELECT id INTO v_operator FROM _p2b_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2b_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2b_ids WHERE name='caller';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  v_same       := public.register_pilot_personas(v_pilot, v_operator, v_operator, NULL);
  v_no_inst    := public.register_pilot_personas(
                    '00000000-0000-0000-0000-00000000dead'::uuid, v_operator, v_reviewer, NULL);
  v_not_pilot  := public.register_pilot_personas(v_op_inst, v_operator, v_reviewer, NULL);
  v_unknown_op := public.register_pilot_personas(v_pilot,
                    '00000000-0000-0000-0000-00000000fade'::uuid, v_reviewer, NULL);
  v_null_op    := public.register_pilot_personas(v_pilot, NULL, v_reviewer, NULL);

  PERFORM pg_temp.record(2,
    'register_pilot_personas refuses invalid inputs',
    v_same->>'error'       = 'operator_and_reviewer_must_differ'
    AND v_no_inst->>'error'    = 'institution_not_found'
    AND v_not_pilot->>'error'  = 'institution_not_pilot'
    AND v_unknown_op->>'error' = 'operator_user_not_found'
    AND v_null_op->>'error'    = 'operator_and_reviewer_required',
    format('same=%s no_inst=%s not_pilot=%s unknown_op=%s null_op=%s',
           v_same::text, v_no_inst::text, v_not_pilot::text, v_unknown_op::text, v_null_op::text));
END$$;

-- =====================================================================
-- TEST 3: happy path registers an active pair
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_operator uuid; v_reviewer uuid; v_caller uuid;
  v_result jsonb;
  v_is_active boolean;
BEGIN
  SELECT id INTO v_pilot    FROM _p2b_ids WHERE name='pilot_inst';
  SELECT id INTO v_operator FROM _p2b_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2b_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2b_ids WHERE name='caller';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  v_result := public.register_pilot_personas(v_pilot, v_operator, v_reviewer,
    'Pilot operator attesting to dual-persona review integrity');

  SELECT is_active INTO v_is_active
    FROM public.vw_pilot_personas
   WHERE id = (v_result->>'persona_id')::uuid;

  PERFORM pg_temp.record(3,
    'happy path: pilot institution + distinct pair -> active row + view reflects is_active',
    COALESCE((v_result->>'success')::boolean, false) AND v_is_active = true,
    format('result=%s is_active=%s', v_result::text, v_is_active));
END$$;

-- =====================================================================
-- TEST 4: second registration on same institution yields conflict error
-- =====================================================================
DO $$
DECLARE
  v_pilot uuid; v_operator uuid; v_reviewer uuid; v_caller uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_pilot    FROM _p2b_ids WHERE name='pilot_inst';
  SELECT id INTO v_operator FROM _p2b_ids WHERE name='operator';
  SELECT id INTO v_reviewer FROM _p2b_ids WHERE name='reviewer';
  SELECT id INTO v_caller   FROM _p2b_ids WHERE name='caller';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_caller::text, 'role','authenticated')::text, true);

  v_result := public.register_pilot_personas(v_pilot, v_operator, v_reviewer, NULL);
  PERFORM pg_temp.record(4,
    're-register same institution yields active_pilot_personas_already_registered',
    v_result->>'error' = 'active_pilot_personas_already_registered',
    v_result::text);
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Dual-Persona Seed (Phase 2B) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Dual-Persona Seed (Phase 2B) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Dual-Persona Seed (Phase 2B) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
