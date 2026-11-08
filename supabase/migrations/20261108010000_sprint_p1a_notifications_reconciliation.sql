-- =====================================================================
-- Phase 1A — Notifications Reconciliation + Registrar Notification Hook
-- =====================================================================
-- The notifications table has conflicting historical shapes:
--   - 20241219 community migration: (id, user_id, type [CHECK enum], title,
--     message NOT NULL, data jsonb, is_read, action_url, created_at)
--   - 20260626180404 canonical shape: adds body, metadata, event_key,
--     related_id, related_type via CREATE TABLE IF NOT EXISTS, which is
--     a no-op in CI because the earlier table already exists.
--
-- Consequence: emit_notification(...) INSERT fails with "column body of
-- relation notifications does not exist", and the type CHECK constraint
-- rejects registrar events (dropped, hold_imposed, etc.).
--
-- Phase 1A reconciles the table into the canonical shape, drops the
-- restrictive type CHECK, and adds a trigger on public.registrar_audit_log
-- that emits a notification to the student for every event_kind.
-- =====================================================================

-- ---------- 0. Defensive schema reconciliation ----------------------
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    CREATE TABLE public.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid,
      title text,
      body text,
      type text,
      related_id uuid,
      related_type text,
      is_read boolean DEFAULT false,
      metadata jsonb DEFAULT '{}'::jsonb,
      event_key text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS related_id uuid,
  ADD COLUMN IF NOT EXISTS related_type text,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Historical NOT NULL on message blocks inserts that only set body;
-- drop NOT NULL and backfill body from message where possible.
DO $$
DECLARE v_has_message boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='notifications'
                    AND column_name='message') INTO v_has_message;
  IF v_has_message THEN
    EXECUTE 'UPDATE public.notifications SET body = COALESCE(body, message) WHERE body IS NULL';
    EXECUTE 'ALTER TABLE public.notifications ALTER COLUMN message DROP NOT NULL';
  END IF;
END$$;

-- Historical CHECK constraint on type restricted the enum to a social-feed
-- set. Registrar events (dropped, withdrawn, hold_imposed, hold_lifted,
-- course_completed, degree_cleared) need to live alongside those.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid='public.notifications'::regclass
       AND contype='c'
       AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', c);
  END LOOP;
END$$;

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, created_at DESC)
  WHERE NOT is_read;

CREATE INDEX IF NOT EXISTS notifications_event_key_idx
  ON public.notifications(event_key)
  WHERE event_key IS NOT NULL;

-- ---------- 1. emit_notification (canonical shape) ------------------
-- Idempotent: later migrations may redefine it; this is the Phase 1A
-- reconciliation guarantee that the function exists and works against
-- the reconciled table shape.
CREATE OR REPLACE FUNCTION public.emit_notification(
  _user_id uuid,
  _title text,
  _body text,
  _type text,
  _related_type text DEFAULT NULL,
  _related_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _event_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications
    (user_id, title, body, type, related_type, related_id, metadata, event_key)
  VALUES
    (_user_id, _title, _body, _type, _related_type, _related_id, _metadata, _event_key)
  RETURNING id;
$$;

REVOKE ALL ON FUNCTION public.emit_notification(uuid, text, text, text, text, uuid, jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_notification(uuid, text, text, text, text, uuid, jsonb, text)
  TO authenticated, service_role;

-- ---------- 2. Registrar notification hook --------------------------
-- An AFTER INSERT trigger on registrar_audit_log emits a notification
-- to the affected student. Faculty / admin events with no student_user_id
-- skip the emit (returns NEW).
CREATE OR REPLACE FUNCTION public.notify_registrar_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF NEW.student_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := CASE NEW.event_kind
    WHEN 'dropped'       THEN 'Course drop recorded'
    WHEN 'withdrawn'     THEN 'Course withdrawal recorded'
    WHEN 'hold_imposed'  THEN 'A hold has been placed on your account'
    WHEN 'hold_lifted'   THEN 'A hold on your account has been lifted'
    WHEN 'course_completed'   THEN 'Course completion recorded'
    WHEN 'degree_cleared'     THEN 'You are cleared for graduation'
    ELSE 'Registrar update: ' || NEW.event_kind
  END;

  v_body := CASE NEW.event_kind
    WHEN 'dropped'       THEN 'Your enrollment has been dropped. Check the registrar dashboard for details.'
    WHEN 'withdrawn'     THEN 'Your enrollment has been withdrawn. This may appear on your transcript.'
    WHEN 'hold_imposed'  THEN 'Registration and transcript actions are blocked until the hold is lifted.'
    WHEN 'hold_lifted'   THEN 'Your account is clear. Registration is open again.'
    WHEN 'course_completed'   THEN 'Your course completion is now on file.'
    WHEN 'degree_cleared'     THEN 'All degree requirements are met. Contact the registrar to initiate conferral.'
    ELSE 'The registrar recorded an event on your account.'
  END;

  PERFORM public.emit_notification(
    NEW.student_user_id,
    v_title,
    v_body,
    'registrar.' || NEW.event_kind,
    'registrar_audit_log',
    NEW.id,
    COALESCE(NEW.payload, '{}'::jsonb),
    'registrar:' || NEW.event_kind || ':' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_registrar_audit() IS
  'Phase 1A: emits a student-facing notification for every registrar_audit_log row with a student_user_id. Idempotency via event_key = ''registrar:<event_kind>:<audit_id>''.';

DO $$
BEGIN
  IF to_regclass('public.registrar_audit_log') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_notify_registrar_audit ON public.registrar_audit_log;
    CREATE TRIGGER trg_notify_registrar_audit
      AFTER INSERT ON public.registrar_audit_log
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_registrar_audit();
  END IF;
END$$;
