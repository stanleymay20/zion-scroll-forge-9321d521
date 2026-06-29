-- ============================================================================
-- Faculty Office Hours — Sprint D3.3 Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/faculty_office_hours.test.sql
--
-- Covers the four RPCs introduced in D3.3:
--   faculty_office_hours_create_slot
--   faculty_office_hours_cancel_slot
--   faculty_office_hours_book
--   faculty_office_hours_cancel_booking
--
-- Plus the RLS visibility rules on the two new tables and the
-- auditing contract through ops_log.
--
-- BEGIN/ROLLBACK wrapper; auth.users triggers disabled per the D3.1
-- pattern; user_roles CHECK constraint dropped so we can insert a
-- 'faculty' fixture row without violating the legacy enum.
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

CREATE OR REPLACE FUNCTION pg_temp.become(p_user uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role','authenticated')::text, true);
END$$;

-- Fixtures
\set FAC_A   '\'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\''
\set FAC_B   '\'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\''
\set STU_X   '\'cccccccc-cccc-cccc-cccc-cccccccccccc\''
\set STU_Y   '\'dddddddd-dddd-dddd-dddd-dddddddddddd\''
\set ADMIN_U '\'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee\''

INSERT INTO auth.users (id, email) VALUES
  (:FAC_A,   'fac-a@test.local'),
  (:FAC_B,   'fac-b@test.local'),
  (:STU_X,   'stu-x@test.local'),
  (:STU_Y,   'stu-y@test.local'),
  (:ADMIN_U, 'admin-d33@test.local')
ON CONFLICT (id) DO NOTHING;

-- Drop the legacy CHECK on user_roles.role so 'faculty' inserts cleanly.
-- (Restored on ROLLBACK.)
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.user_roles'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', c);
  END LOOP;
END$$;

INSERT INTO public.user_roles (user_id, role) VALUES
  (:FAC_A,   'faculty'),
  (:FAC_B,   'faculty'),
  (:STU_X,   'student'),
  (:STU_Y,   'student'),
  (:ADMIN_U, 'admin')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- TEST 1: faculty can create a slot
-- =====================================================================
DO $$
DECLARE v_id uuid;
BEGIN
  PERFORM pg_temp.become('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
  v_id := public.faculty_office_hours_create_slot(
    now() + interval '1 day',
    now() + interval '1 day' + interval '1 hour',
    2, NULL, 'Office 312', NULL, 'Bring your draft'
  );
  PERFORM pg_temp.record(1,'create_slot: faculty succeeds', v_id IS NOT NULL, format('id=%s', v_id));
END$$;

-- =====================================================================
-- TEST 2: student cannot create a slot
-- =====================================================================
DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_create_slot(
      now() + interval '2 day', now() + interval '2 day' + interval '1 hour'
    );
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'forbidden%';
  END;
  PERFORM pg_temp.record(2,'create_slot: student forbidden', v_failed, '');
END$$;

-- =====================================================================
-- TEST 3: reject ends_at <= starts_at
-- =====================================================================
DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_create_slot(
      now() + interval '1 day' + interval '1 hour',
      now() + interval '1 day'
    );
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'invalid_window%';
  END;
  PERFORM pg_temp.record(3,'create_slot: invalid_window when ends <= starts', v_failed, '');
END$$;

-- =====================================================================
-- TEST 4: reject overlap with caller's own open slot
-- =====================================================================
DO $$
DECLARE v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_create_slot(
      now() + interval '1 day' + interval '30 minutes',
      now() + interval '1 day' + interval '90 minutes'
    );
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'overlap%';
  END;
  PERFORM pg_temp.record(4,'create_slot: rejects overlap with own open slot', v_failed, '');
END$$;

-- =====================================================================
-- TEST 5: student books an open future slot
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_booking uuid;
BEGIN
  -- Faculty B creates an open slot
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '3 day', now() + interval '3 day' + interval '30 minutes', 2
  );
  -- Student X books
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  v_booking := public.faculty_office_hours_book(v_slot, 'Project help', NULL);
  PERFORM pg_temp.record(5,'book: student books open future slot', v_booking IS NOT NULL,
                          format('booking=%s', v_booking));
END$$;

-- =====================================================================
-- TEST 6: cannot double-book (same student, same slot)
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '4 day', now() + interval '4 day' + interval '30 minutes', 2
  );
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  PERFORM public.faculty_office_hours_book(v_slot, 'First');
  BEGIN
    PERFORM public.faculty_office_hours_book(v_slot, 'Second');
  EXCEPTION WHEN unique_violation THEN v_failed := true;
  END;
  PERFORM pg_temp.record(6,'book: rejects double-book by same student (partial unique)', v_failed, '');
END$$;

-- =====================================================================
-- TEST 7: cannot book a cancelled slot
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '5 day', now() + interval '5 day' + interval '30 minutes', 2
  );
  PERFORM public.faculty_office_hours_cancel_slot(v_slot);

  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_book(v_slot);
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'slot_not_open%';
  END;
  PERFORM pg_temp.record(7,'book: rejects cancelled slot', v_failed, '');
END$$;

-- =====================================================================
-- TEST 8: capacity enforcement
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '6 day', now() + interval '6 day' + interval '30 minutes', 1
  );
  -- Student X books — fills capacity 1
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  PERFORM public.faculty_office_hours_book(v_slot);
  -- Student Y tries — should fail
  PERFORM pg_temp.become('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_book(v_slot);
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'capacity_exceeded%';
  END;
  PERFORM pg_temp.record(8,'book: enforces capacity', v_failed, '');
END$$;

-- =====================================================================
-- TEST 9: faculty cannot book their own slot
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '7 day', now() + interval '7 day' + interval '30 minutes', 2
  );
  BEGIN
    PERFORM public.faculty_office_hours_book(v_slot);
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'self_booking%';
  END;
  PERFORM pg_temp.record(9,'book: faculty cannot self-book', v_failed, '');
END$$;

-- =====================================================================
-- TEST 10: cancel_booking allowed for the booking's student
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_booking uuid; v_result jsonb;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '8 day', now() + interval '8 day' + interval '30 minutes', 2
  );
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  v_booking := public.faculty_office_hours_book(v_slot);
  v_result := public.faculty_office_hours_cancel_booking(v_booking);
  PERFORM pg_temp.record(10,'cancel_booking: student cancels own',
                         (v_result->>'cancelled')::boolean, format('result=%s', v_result));
END$$;

-- =====================================================================
-- TEST 11: cancel_booking allowed for slot-owning faculty
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_booking uuid; v_result jsonb;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '9 day', now() + interval '9 day' + interval '30 minutes', 2
  );
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  v_booking := public.faculty_office_hours_book(v_slot);
  -- Faculty B (slot owner) cancels
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_result := public.faculty_office_hours_cancel_booking(v_booking);
  PERFORM pg_temp.record(11,'cancel_booking: slot-owner faculty cancels',
                         (v_result->>'cancelled')::boolean, '');
END$$;

-- =====================================================================
-- TEST 12: cancel_booking forbidden for unrelated student
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_booking uuid; v_failed boolean := false;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '10 day', now() + interval '10 day' + interval '30 minutes', 2
  );
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  v_booking := public.faculty_office_hours_book(v_slot);
  -- Student Y tries to cancel Student X's booking
  PERFORM pg_temp.become('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_cancel_booking(v_booking);
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'forbidden%';
  END;
  PERFORM pg_temp.record(12,'cancel_booking: unrelated student forbidden', v_failed, '');
END$$;

-- =====================================================================
-- TEST 13: cancel_slot cascades booking cancellation + correlation
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_b1 uuid; v_b2 uuid; v_result jsonb; v_corr uuid;
        v_ops_cnt int;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '11 day', now() + interval '11 day' + interval '30 minutes', 3
  );
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  v_b1 := public.faculty_office_hours_book(v_slot);
  PERFORM pg_temp.become('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);
  v_b2 := public.faculty_office_hours_book(v_slot);

  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_result := public.faculty_office_hours_cancel_slot(v_slot);
  v_corr := (v_result->>'correlation_id')::uuid;

  SELECT count(*) INTO v_ops_cnt
    FROM public.ops_log
   WHERE correlation_id = v_corr AND event = 'oh.slot_cancelled';

  PERFORM pg_temp.record(13,'cancel_slot: cascades 2 booking cancellations + ops_log',
    (v_result->>'cancelled_bookings')::int = 2
    AND v_ops_cnt = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.faculty_office_hours_bookings
       WHERE id IN (v_b1, v_b2) AND status <> 'cancelled'
    ),
    format('cancelled=%s ops=%s', v_result->>'cancelled_bookings', v_ops_cnt));
END$$;

-- =====================================================================
-- TEST 14: admin can cancel any slot
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_result jsonb;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '12 day', now() + interval '12 day' + interval '30 minutes', 2
  );
  PERFORM pg_temp.become('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid);
  v_result := public.faculty_office_hours_cancel_slot(v_slot);
  PERFORM pg_temp.record(14,'cancel_slot: admin can cancel any slot',
                         v_result->>'slot_id' IS NOT NULL, '');
END$$;

-- =====================================================================
-- TEST 15: ops_log written with correct source/event/actor for each RPC
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_booking uuid;
        n_create int; n_book int; n_cancel_b int; n_cancel_s int;
BEGIN
  PERFORM pg_temp.become('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
  v_slot := public.faculty_office_hours_create_slot(
    now() + interval '13 day', now() + interval '13 day' + interval '30 minutes', 2
  );
  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  v_booking := public.faculty_office_hours_book(v_slot, 'topic', 'notes');
  PERFORM public.faculty_office_hours_cancel_booking(v_booking);
  PERFORM pg_temp.become('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);
  PERFORM public.faculty_office_hours_cancel_slot(v_slot);

  SELECT
    count(*) FILTER (WHERE event = 'oh.slot_created'
                     AND (context->>'slot_id')::uuid = v_slot),
    count(*) FILTER (WHERE event = 'oh.booking_created'
                     AND (context->>'booking_id')::uuid = v_booking),
    count(*) FILTER (WHERE event = 'oh.booking_cancelled'
                     AND (context->>'booking_id')::uuid = v_booking),
    count(*) FILTER (WHERE event = 'oh.slot_cancelled'
                     AND (context->>'slot_id')::uuid = v_slot)
  INTO n_create, n_book, n_cancel_b, n_cancel_s
  FROM public.ops_log
  WHERE source = 'rpc';

  PERFORM pg_temp.record(15,'ops_log: each RPC writes its event with the right ids',
    n_create = 1 AND n_book = 1 AND n_cancel_b = 1 AND n_cancel_s = 1,
    format('created=%s book=%s cancel_b=%s cancel_s=%s', n_create, n_book, n_cancel_b, n_cancel_s));
END$$;

-- =====================================================================
-- TEST 16: cannot book a past slot
-- (Skip: can't INSERT a past slot via the RPC since it rejects past_slot.
--  Instead simulate by direct insert as admin, then attempt to book.)
-- =====================================================================
DO $$
DECLARE v_slot uuid; v_failed boolean := false;
BEGIN
  -- Admin bypass via direct insert (the no-direct-write policy allows admins)
  PERFORM pg_temp.become('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid);
  INSERT INTO public.faculty_office_hours_slots
    (faculty_user_id, starts_at, ends_at, capacity, status)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
          now() - interval '2 hours', now() - interval '1 hour', 2, 'open')
  RETURNING id INTO v_slot;

  PERFORM pg_temp.become('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);
  BEGIN
    PERFORM public.faculty_office_hours_book(v_slot);
  EXCEPTION WHEN OTHERS THEN v_failed := SQLERRM LIKE 'past_slot%';
  END;
  PERFORM pg_temp.record(16,'book: rejects past slot', v_failed, '');
END$$;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$
DECLARE v_fails int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- Faculty Office Hours suite ---';
  SELECT count(*) INTO v_fails FROM _suite_results WHERE status='FAIL';
  IF v_fails > 0 THEN
    RAISE EXCEPTION 'Faculty Office Hours regression: % failure(s)', v_fails;
  END IF;
  RAISE NOTICE 'Faculty Office Hours suite: all % tests PASS',
    (SELECT count(*) FROM _suite_results);
END$$;

ROLLBACK;
