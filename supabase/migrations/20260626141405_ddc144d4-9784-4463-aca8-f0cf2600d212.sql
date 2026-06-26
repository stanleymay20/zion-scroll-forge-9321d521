
-- ============================================================
-- Sprint 1: AI audit log + cron observability + notification producers + health view
-- ============================================================

-- 1) AI OUTPUT AUDIT LOG -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_output_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL,
  feature text NOT NULL,                  -- 'ai_tutor' | 'grading' | 'prescreen' | 'content_gen' | 'study_plan' | 'recommendation' | 'pedagogy_remediation' | 'avatar_lecture'
  model text NULL,
  provider text NULL,
  prompt_hash text NULL,                  -- sha256 hex of input
  input_reference text NULL,              -- e.g. course_id, attempt_id, module_id (free text)
  output_reference text NULL,             -- pointer to where the output landed
  confidence numeric NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  human_review_required boolean NOT NULL DEFAULT false,
  reviewed_by uuid NULL,
  reviewed_at timestamptz NULL,
  latency_ms integer NULL,
  tokens_in integer NULL,
  tokens_out integer NULL,
  cost_estimate numeric NULL,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error','flagged')),
  error_message text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ai_output_log_user_created_idx ON public.ai_output_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_output_log_feature_created_idx ON public.ai_output_log (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_output_log_review_idx ON public.ai_output_log (human_review_required) WHERE human_review_required = true;

GRANT SELECT ON public.ai_output_log TO authenticated;
GRANT ALL ON public.ai_output_log TO service_role;
ALTER TABLE public.ai_output_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_log_self_read"
  ON public.ai_output_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ai_log_admin_read"
  ON public.ai_output_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "ai_log_admin_update"
  ON public.ai_output_log FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

-- 2) CRON EXECUTION LOG -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cron_execution_log (
  id bigserial PRIMARY KEY,
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','ok','error','skipped')),
  http_status integer NULL,
  request_id bigint NULL,
  error_message text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS cron_execution_log_job_started_idx ON public.cron_execution_log (job_name, started_at DESC);

GRANT SELECT ON public.cron_execution_log TO authenticated;
GRANT ALL ON public.cron_execution_log TO service_role;
ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_log_admin_read"
  ON public.cron_execution_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

-- Helper: log cron start, return id; later update with status.
CREATE OR REPLACE FUNCTION public.cron_log_start(_job text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.cron_execution_log(job_name) VALUES (_job) RETURNING id;
$$;

CREATE OR REPLACE FUNCTION public.cron_log_finish(_id bigint, _status text, _http int DEFAULT NULL, _err text DEFAULT NULL, _req bigint DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.cron_execution_log
     SET finished_at = now(),
         status = _status,
         http_status = _http,
         error_message = _err,
         request_id = _req
   WHERE id = _id;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_log_start(text), public.cron_log_finish(bigint,text,int,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cron_log_start(text), public.cron_log_finish(bigint,text,int,text,bigint) TO service_role;

-- 3) NOTIFICATION PRODUCER TRIGGERS ---------------------------------------
-- Helper to safely insert a notification.
CREATE OR REPLACE FUNCTION public.emit_notification(
  _user_id uuid, _title text, _body text, _type text,
  _related_type text DEFAULT NULL, _related_id uuid DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications(user_id, title, body, type, related_type, related_id, metadata)
  VALUES (_user_id, _title, _body, _type, _related_type, _related_id, _metadata)
  RETURNING id;
$$;

REVOKE EXECUTE ON FUNCTION public.emit_notification(uuid,text,text,text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_notification(uuid,text,text,text,text,uuid,jsonb) TO service_role, authenticated;

-- 3a) Grade posted → student notification
CREATE OR REPLACE FUNCTION public.notify_grade_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _course text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'final' AND NEW.status IS DISTINCT FROM 'posted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status AND OLD.letter_grade IS NOT DISTINCT FROM NEW.letter_grade THEN
    RETURN NEW;
  END IF;
  SELECT c.title INTO _course
    FROM public.courses c
   WHERE c.id = NEW.course_id;
  PERFORM public.emit_notification(
    NEW.student_id,
    'Grade posted',
    COALESCE('Your grade for '||_course||' has been posted: '||NEW.letter_grade, 'A grade has been posted.'),
    'grade_posted',
    'grade_records', NEW.id,
    jsonb_build_object('course_id', NEW.course_id, 'letter_grade', NEW.letter_grade, 'grade_points', NEW.grade_points)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_grade_posted ON public.grade_records;
CREATE TRIGGER trg_notify_grade_posted
AFTER INSERT OR UPDATE OF status, letter_grade ON public.grade_records
FOR EACH ROW EXECUTE FUNCTION public.notify_grade_posted();

-- 3b) Academic standing changed
CREATE OR REPLACE FUNCTION public.notify_standing_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.standing = NEW.standing THEN RETURN NEW; END IF;
  PERFORM public.emit_notification(
    NEW.student_id,
    'Academic standing updated',
    'Your academic standing is now: '||NEW.standing,
    'standing_changed',
    'student_academic_standing', NEW.id,
    jsonb_build_object('standing', NEW.standing, 'gpa', NEW.gpa)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_standing_changed ON public.student_academic_standing;
CREATE TRIGGER trg_notify_standing_changed
AFTER INSERT OR UPDATE OF standing ON public.student_academic_standing
FOR EACH ROW EXECUTE FUNCTION public.notify_standing_changed();

-- 3c) Advising flag raised
CREATE OR REPLACE FUNCTION public.notify_advising_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.emit_notification(
    NEW.student_id,
    'Advising flag raised',
    COALESCE(NEW.reason, 'Your advisor has raised a flag on your record. Please review.'),
    'advising_flag',
    'student_advising_flags', NEW.id,
    jsonb_build_object('severity', NEW.severity)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_advising_flag ON public.student_advising_flags;
CREATE TRIGGER trg_notify_advising_flag
AFTER INSERT ON public.student_advising_flags
FOR EACH ROW EXECUTE FUNCTION public.notify_advising_flag();

-- 3d) Intervention assigned to student
CREATE OR REPLACE FUNCTION public.notify_intervention_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.scope = 'student' AND NEW.scope_id IS NOT NULL THEN
    PERFORM public.emit_notification(
      NEW.scope_id,
      'Support intervention opened',
      'A support intervention has been opened to help you. Please review the recommended actions.',
      'intervention_assigned',
      'outcome_intervention', NEW.id,
      jsonb_build_object('category', NEW.category, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_intervention_assigned ON public.outcome_intervention;
CREATE TRIGGER trg_notify_intervention_assigned
AFTER INSERT ON public.outcome_intervention
FOR EACH ROW EXECUTE FUNCTION public.notify_intervention_assigned();

-- 3e) Registration window opens (term-level fan-out is heavy; emit per-window event row only,
--     leave per-student fan-out to a future scheduled producer to keep this migration safe).

-- 4) SYSTEM HEALTH SUMMARY VIEW ------------------------------------------
CREATE OR REPLACE VIEW public.system_health_summary
WITH (security_invoker = on)
AS
SELECT
  (SELECT count(*) FROM public.cron_execution_log WHERE started_at > now() - interval '24 hours') AS cron_runs_24h,
  (SELECT count(*) FROM public.cron_execution_log WHERE status = 'error' AND started_at > now() - interval '24 hours') AS cron_errors_24h,
  (SELECT count(*) FROM public.ai_output_log WHERE created_at > now() - interval '24 hours') AS ai_calls_24h,
  (SELECT count(*) FROM public.ai_output_log WHERE status = 'error' AND created_at > now() - interval '24 hours') AS ai_errors_24h,
  (SELECT count(*) FROM public.ai_output_log WHERE human_review_required = true AND reviewed_at IS NULL) AS ai_pending_review,
  (SELECT count(*) FROM public.notifications WHERE created_at > now() - interval '24 hours') AS notifications_24h,
  (SELECT count(*) FROM public.human_review_requests WHERE status IN ('pending','open','submitted')) AS human_reviews_open,
  (SELECT count(*) FROM public.academic_integrity_alerts WHERE created_at > now() - interval '24 hours') AS integrity_alerts_24h,
  now() AS as_of;

GRANT SELECT ON public.system_health_summary TO authenticated;

-- Restrict view body to admins via wrapper RPC (cheap; view itself is harmless)
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS SETOF public.system_health_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.system_health_summary
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin');
$$;

REVOKE EXECUTE ON FUNCTION public.get_system_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;
