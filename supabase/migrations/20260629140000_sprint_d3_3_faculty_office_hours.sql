-- =====================================================================
-- Sprint D3.3 — Faculty Office Hours
-- =====================================================================
-- A complete vertical slice: schema + RPCs + RLS for faculty
-- create/edit/cancel office-hour slots and students browse/book/cancel.
--
-- Why separate tables (instead of extending office_hours_slots):
--   The existing public.office_hours_slots / office_hours_bookings are
--   AI-tutor-shaped (text tutor_name + tutor_specialty, day_of_week +
--   time without a concrete date, no FK to auth.users). The
--   /ai-tutors/office-hours page consumes them live. Extending those
--   tables would require many nullable columns and risks the AI-tutor
--   flow. Faculty office hours have different semantics anyway:
--   concrete timestamptz windows, real user FK, capacity, course
--   context, video URL.
-- =====================================================================

-- ---------- 1. faculty_office_hours_slots ----------------------------
CREATE TABLE IF NOT EXISTS public.faculty_office_hours_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       uuid,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  capacity        int  NOT NULL DEFAULT 1 CHECK (capacity >= 1 AND capacity <= 50),
  location        text,
  meeting_url     text,
  notes           text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS fac_oh_slots_owner_idx
  ON public.faculty_office_hours_slots (faculty_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS fac_oh_slots_window_idx
  ON public.faculty_office_hours_slots (starts_at, ends_at)
  WHERE status = 'open';

ALTER TABLE public.faculty_office_hours_slots ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can browse open future slots.
-- (Cancelled slots and past slots aren't useful to students; faculty
-- can see their own regardless via the owner policy below.)
DROP POLICY IF EXISTS "fac_oh_slots_public_open" ON public.faculty_office_hours_slots;
CREATE POLICY "fac_oh_slots_public_open" ON public.faculty_office_hours_slots
  FOR SELECT TO authenticated
  USING (status = 'open' OR faculty_user_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin')
         OR public.has_role(auth.uid(),'registrar'));

-- Faculty owner manages their own slots; admin/superadmin/registrar can manage any.
DROP POLICY IF EXISTS "fac_oh_slots_owner_write" ON public.faculty_office_hours_slots;
CREATE POLICY "fac_oh_slots_owner_write" ON public.faculty_office_hours_slots
  FOR ALL TO authenticated
  USING (faculty_user_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin')
         OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (faculty_user_id = auth.uid()
              OR public.has_role(auth.uid(),'admin')
              OR public.has_role(auth.uid(),'superadmin')
              OR public.has_role(auth.uid(),'registrar'));

-- ---------- 2. faculty_office_hours_bookings -------------------------
CREATE TABLE IF NOT EXISTS public.faculty_office_hours_bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id          uuid NOT NULL REFERENCES public.faculty_office_hours_slots(id) ON DELETE CASCADE,
  student_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('confirmed','cancelled','attended','no_show')),
  topic            text,
  notes            text,
  booked_at        timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fac_oh_bookings_slot_idx
  ON public.faculty_office_hours_bookings (slot_id);
CREATE INDEX IF NOT EXISTS fac_oh_bookings_student_idx
  ON public.faculty_office_hours_bookings (student_user_id, booked_at DESC);

-- Partial unique index: one active (non-cancelled) booking per (slot, student).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_fac_oh_booking
  ON public.faculty_office_hours_bookings (slot_id, student_user_id)
  WHERE status <> 'cancelled';

ALTER TABLE public.faculty_office_hours_bookings ENABLE ROW LEVEL SECURITY;

-- Student sees their own bookings. Faculty owner sees bookings against their slots.
-- Admin/registrar sees all.
DROP POLICY IF EXISTS "fac_oh_bookings_visibility" ON public.faculty_office_hours_bookings;
CREATE POLICY "fac_oh_bookings_visibility" ON public.faculty_office_hours_bookings
  FOR SELECT TO authenticated
  USING (student_user_id = auth.uid()
         OR EXISTS (
           SELECT 1 FROM public.faculty_office_hours_slots s
            WHERE s.id = slot_id AND s.faculty_user_id = auth.uid()
         )
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin')
         OR public.has_role(auth.uid(),'registrar'));

-- All writes flow through the SECURITY DEFINER RPCs below — RLS for
-- INSERT/UPDATE/DELETE blocks direct table writes from clients to
-- prevent bypassing capacity/overlap/double-booking checks.
DROP POLICY IF EXISTS "fac_oh_bookings_no_direct_write" ON public.faculty_office_hours_bookings;
CREATE POLICY "fac_oh_bookings_no_direct_write" ON public.faculty_office_hours_bookings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

-- ---------- 3. updated_at trigger ------------------------------------
CREATE OR REPLACE FUNCTION public._fac_oh_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_fac_oh_slots_updated ON public.faculty_office_hours_slots;
CREATE TRIGGER trg_fac_oh_slots_updated BEFORE UPDATE ON public.faculty_office_hours_slots
  FOR EACH ROW EXECUTE FUNCTION public._fac_oh_set_updated_at();

DROP TRIGGER IF EXISTS trg_fac_oh_bookings_updated ON public.faculty_office_hours_bookings;
CREATE TRIGGER trg_fac_oh_bookings_updated BEFORE UPDATE ON public.faculty_office_hours_bookings
  FOR EACH ROW EXECUTE FUNCTION public._fac_oh_set_updated_at();

-- ---------- 4. RPCs --------------------------------------------------
-- All RPCs are SECURITY DEFINER, search_path-locked, audited via
-- ops_log_write (provided by D1 or D3.1's substrate shims), and
-- maintenance-mode-aware via assert_not_maintenance.

-- 4a. Create slot (faculty-only)
CREATE OR REPLACE FUNCTION public.faculty_office_hours_create_slot(
  p_starts_at   timestamptz,
  p_ends_at     timestamptz,
  p_capacity    int  DEFAULT 1,
  p_course_id   uuid DEFAULT NULL,
  p_location    text DEFAULT NULL,
  p_meeting_url text DEFAULT NULL,
  p_notes       text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_new_id uuid;
  v_overlap_count int;
BEGIN
  IF NOT (public.has_role(v_actor,'faculty')
          OR public.has_role(v_actor,'admin')
          OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'faculty/admin/superadmin only';
  END IF;
  PERFORM public.assert_not_maintenance();

  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'invalid_window' USING HINT = 'p_ends_at must be > p_starts_at';
  END IF;
  IF p_capacity IS NULL OR p_capacity < 1 OR p_capacity > 50 THEN
    RAISE EXCEPTION 'invalid_capacity' USING HINT = '1 <= p_capacity <= 50';
  END IF;
  IF p_starts_at <= now() THEN
    RAISE EXCEPTION 'past_slot' USING HINT = 'p_starts_at must be in the future';
  END IF;

  -- No overlap with caller's other open slots.
  SELECT count(*) INTO v_overlap_count
    FROM public.faculty_office_hours_slots
   WHERE faculty_user_id = v_actor
     AND status = 'open'
     AND tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)');
  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'overlap' USING HINT = 'Caller already has an open slot overlapping this window';
  END IF;

  INSERT INTO public.faculty_office_hours_slots
    (faculty_user_id, course_id, starts_at, ends_at, capacity, location, meeting_url, notes)
  VALUES
    (v_actor, p_course_id, p_starts_at, p_ends_at, p_capacity, p_location, p_meeting_url, p_notes)
  RETURNING id INTO v_new_id;

  PERFORM public.ops_log_write(
    'rpc', 'oh.slot_created', 'info',
    format('Faculty office hours slot %s..%s (cap=%s)', p_starts_at, p_ends_at, p_capacity),
    jsonb_build_object('slot_id', v_new_id, 'faculty_user_id', v_actor,
                       'starts_at', p_starts_at, 'ends_at', p_ends_at, 'capacity', p_capacity)
  );

  RETURN v_new_id;
END$$;

GRANT EXECUTE ON FUNCTION public.faculty_office_hours_create_slot(timestamptz,timestamptz,int,uuid,text,text,text)
  TO authenticated, service_role;

-- 4b. Cancel slot (owner OR admin) — cascades booking cancellations
CREATE OR REPLACE FUNCTION public.faculty_office_hours_cancel_slot(p_slot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_corr uuid := gen_random_uuid();
  v_cancelled_bookings int;
BEGIN
  SELECT faculty_user_id, status INTO v_owner, v_status
    FROM public.faculty_office_hours_slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_not_found' USING HINT = format('No slot with id=%s', p_slot_id);
  END IF;

  IF NOT (v_owner = v_actor
          OR public.has_role(v_actor,'admin')
          OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'forbidden' USING HINT = 'Only the slot owner or admin can cancel';
  END IF;
  PERFORM public.assert_not_maintenance();

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('slot_id', p_slot_id, 'already_cancelled', true,
                              'cancelled_bookings', 0, 'correlation_id', v_corr);
  END IF;

  UPDATE public.faculty_office_hours_slots
     SET status = 'cancelled' WHERE id = p_slot_id;

  WITH upd AS (
    UPDATE public.faculty_office_hours_bookings
       SET status = 'cancelled', cancelled_at = now()
     WHERE slot_id = p_slot_id AND status <> 'cancelled'
    RETURNING id
  )
  SELECT count(*) INTO v_cancelled_bookings FROM upd;

  PERFORM public.ops_log_write(
    'rpc', 'oh.slot_cancelled', 'info',
    format('Slot %s cancelled, %s booking(s) auto-cancelled', p_slot_id, v_cancelled_bookings),
    jsonb_build_object('slot_id', p_slot_id, 'owner', v_owner,
                       'cancelled_by', v_actor, 'cancelled_bookings', v_cancelled_bookings),
    v_corr
  );

  RETURN jsonb_build_object('slot_id', p_slot_id, 'cancelled_bookings', v_cancelled_bookings,
                            'correlation_id', v_corr);
END$$;

GRANT EXECUTE ON FUNCTION public.faculty_office_hours_cancel_slot(uuid) TO authenticated, service_role;

-- 4c. Book a slot (any authenticated — student in practice)
CREATE OR REPLACE FUNCTION public.faculty_office_hours_book(
  p_slot_id uuid,
  p_topic   text DEFAULT NULL,
  p_notes   text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_slot record;
  v_active_bookings int;
  v_new_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  PERFORM public.assert_not_maintenance();

  SELECT id, faculty_user_id, starts_at, ends_at, capacity, status
    INTO v_slot
    FROM public.faculty_office_hours_slots
   WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_not_found';
  END IF;
  IF v_slot.status <> 'open' THEN
    RAISE EXCEPTION 'slot_not_open' USING HINT = format('Slot status is %s', v_slot.status);
  END IF;
  IF v_slot.starts_at <= now() THEN
    RAISE EXCEPTION 'past_slot' USING HINT = 'Cannot book a slot whose window has started';
  END IF;
  IF v_slot.faculty_user_id = v_actor THEN
    RAISE EXCEPTION 'self_booking' USING HINT = 'Faculty cannot book their own slot';
  END IF;

  SELECT count(*) INTO v_active_bookings
    FROM public.faculty_office_hours_bookings
   WHERE slot_id = p_slot_id AND status <> 'cancelled';
  IF v_active_bookings >= v_slot.capacity THEN
    RAISE EXCEPTION 'capacity_exceeded'
      USING HINT = format('Slot capacity %s reached', v_slot.capacity);
  END IF;

  INSERT INTO public.faculty_office_hours_bookings
    (slot_id, student_user_id, status, topic, notes)
  VALUES (p_slot_id, v_actor, 'confirmed', p_topic, p_notes)
  RETURNING id INTO v_new_id;
  -- The partial UNIQUE index catches racing double-book attempts.

  PERFORM public.ops_log_write(
    'rpc', 'oh.booking_created', 'info',
    format('Booking %s for slot %s', v_new_id, p_slot_id),
    jsonb_build_object('booking_id', v_new_id, 'slot_id', p_slot_id,
                       'student_user_id', v_actor, 'topic', p_topic)
  );

  RETURN v_new_id;
END$$;

GRANT EXECUTE ON FUNCTION public.faculty_office_hours_book(uuid,text,text) TO authenticated, service_role;

-- 4d. Cancel a booking (student-owner OR faculty slot-owner OR admin)
CREATE OR REPLACE FUNCTION public.faculty_office_hours_cancel_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_b record;
  v_slot_owner uuid;
BEGIN
  SELECT id, slot_id, student_user_id, status
    INTO v_b
    FROM public.faculty_office_hours_bookings
   WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  IF v_b.status = 'cancelled' THEN
    RETURN jsonb_build_object('booking_id', p_booking_id, 'already_cancelled', true);
  END IF;

  SELECT faculty_user_id INTO v_slot_owner
    FROM public.faculty_office_hours_slots WHERE id = v_b.slot_id;

  IF NOT (v_b.student_user_id = v_actor
          OR v_slot_owner = v_actor
          OR public.has_role(v_actor,'admin')
          OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'forbidden'
      USING HINT = 'Only the booking student, the slot-owning faculty, or admin can cancel';
  END IF;
  PERFORM public.assert_not_maintenance();

  UPDATE public.faculty_office_hours_bookings
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = p_booking_id;

  PERFORM public.ops_log_write(
    'rpc', 'oh.booking_cancelled', 'info',
    format('Booking %s cancelled', p_booking_id),
    jsonb_build_object('booking_id', p_booking_id, 'slot_id', v_b.slot_id,
                       'student_user_id', v_b.student_user_id,
                       'cancelled_by', v_actor,
                       'cancelled_by_role',
                         CASE WHEN v_b.student_user_id = v_actor THEN 'student'
                              WHEN v_slot_owner = v_actor THEN 'faculty_owner'
                              ELSE 'admin' END)
  );

  RETURN jsonb_build_object('booking_id', p_booking_id, 'cancelled', true);
END$$;

GRANT EXECUTE ON FUNCTION public.faculty_office_hours_cancel_booking(uuid) TO authenticated, service_role;

COMMENT ON TABLE public.faculty_office_hours_slots IS
  'Sprint D3.3: faculty-published office hour slots. Distinct from public.office_hours_slots (AI-tutor-shaped).';
COMMENT ON TABLE public.faculty_office_hours_bookings IS
  'Sprint D3.3: student bookings against faculty office hour slots. Writes go only through SECURITY DEFINER RPCs.';
