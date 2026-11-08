-- ============================================================================
-- Notifications Reconciliation — Phase 1A Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/notifications_reconciliation.test.sql
--
-- Covers Phase 1A:
--   1. notifications table carries the canonical columns (body, metadata,
--      event_key, related_id, related_type).
--   2. No CHECK constraint on notifications.type remains that would
--      reject registrar event_kind values.
--   3. emit_notification(...) with the 8-arg canonical shape exists and
--      inserts cleanly.
--   4. notify_registrar_audit trigger is installed on registrar_audit_log.
--   5. E2E: inserting a registrar_audit_log row with a student_user_id
--      creates a notifications row keyed to that student.
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

CREATE TEMP TABLE _p1a_ids(name text PRIMARY KEY, id uuid);
INSERT INTO _p1a_ids VALUES
  ('student', 'aaaaaaaa-dead-beef-0001-000000000001'),
  ('actor',   'aaaaaaaa-dead-beef-0001-000000000002');

-- =====================================================================
-- TEST 1: canonical columns present
-- =====================================================================
DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_pair record;
BEGIN
  FOR v_pair IN
    SELECT * FROM (VALUES
      ('body'), ('metadata'), ('event_key'),
      ('related_id'), ('related_type'), ('is_read')
    ) AS t(col)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='notifications'
                      AND column_name=v_pair.col) THEN
      v_missing := array_append(v_missing, v_pair.col);
    END IF;
  END LOOP;
  PERFORM pg_temp.record(1,'notifications canonical columns present',
                         cardinality(v_missing) = 0,
                         array_to_string(v_missing, ','));
END$$;

-- =====================================================================
-- TEST 2: no CHECK constraint on notifications.type
-- =====================================================================
DO $$
DECLARE v_check_count int;
BEGIN
  SELECT count(*) INTO v_check_count
    FROM pg_constraint
   WHERE conrelid='public.notifications'::regclass
     AND contype='c'
     AND pg_get_constraintdef(oid) ILIKE '%type%';
  PERFORM pg_temp.record(2,'no restrictive CHECK on notifications.type',
                         v_check_count = 0,
                         format('check_count=%s', v_check_count));
END$$;

-- =====================================================================
-- TEST 3: emit_notification canonical 8-arg signature callable
-- =====================================================================
DO $$
DECLARE
  v_student uuid;
  v_id uuid;
BEGIN
  SELECT id INTO v_student FROM _p1a_ids WHERE name='student';

  INSERT INTO auth.users (id, email) VALUES
    (v_student, 'p1a-student@test.local')
  ON CONFLICT (id) DO NOTHING;

  v_id := public.emit_notification(
    v_student,
    'Phase 1A probe',
    'body text',
    'probe.p1a',
    NULL, NULL,
    jsonb_build_object('phase','1A'),
    'p1a:probe:1'
  );
  PERFORM pg_temp.record(3,'emit_notification inserts cleanly',
                         v_id IS NOT NULL,
                         format('id=%s', v_id));
END$$;

-- =====================================================================
-- TEST 4: notify_registrar_audit trigger installed
-- =====================================================================
DO $$
DECLARE v_trg boolean;
BEGIN
  IF to_regclass('public.registrar_audit_log') IS NULL THEN
    PERFORM pg_temp.record(4,'registrar_audit_log absent (SKIPPED)', true, '');
    RETURN;
  END IF;
  v_trg := EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
     WHERE c.relname = 'registrar_audit_log'
       AND t.tgname = 'trg_notify_registrar_audit'
       AND NOT t.tgisinternal
  );
  PERFORM pg_temp.record(4,'registrar_audit_log has notify trigger', v_trg, '');
END$$;

-- =====================================================================
-- TEST 5: E2E — registrar_audit_log INSERT creates a notification
-- =====================================================================
DO $$
DECLARE
  v_student uuid; v_actor uuid; v_audit_id uuid := gen_random_uuid();
  v_notif_count int;
BEGIN
  SELECT id INTO v_student FROM _p1a_ids WHERE name='student';
  SELECT id INTO v_actor   FROM _p1a_ids WHERE name='actor';

  INSERT INTO auth.users (id, email) VALUES
    (v_actor, 'p1a-actor@test.local')
  ON CONFLICT (id) DO NOTHING;

  IF to_regclass('public.registrar_audit_log') IS NULL THEN
    PERFORM pg_temp.record(5,'E2E notification (SKIPPED: registrar_audit_log absent)', true, '');
    RETURN;
  END IF;

  INSERT INTO public.registrar_audit_log
    (id, actor_id, student_user_id, event_kind, payload)
  VALUES
    (v_audit_id, v_actor, v_student, 'hold_imposed',
     jsonb_build_object('hold_type','financial','reason','p1a probe'));

  SELECT count(*) INTO v_notif_count
    FROM public.notifications
   WHERE user_id = v_student
     AND event_key = 'registrar:hold_imposed:' || v_audit_id::text;

  PERFORM pg_temp.record(5,'E2E registrar audit INSERT emits a notification',
                         v_notif_count = 1,
                         format('notif_count=%s', v_notif_count));
END$$;

-- ============================================================================
DO $$ DECLARE v_fails int; BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Notifications Reconciliation (Phase 1A) suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Notifications Reconciliation (Phase 1A) regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Notifications Reconciliation (Phase 1A) suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
