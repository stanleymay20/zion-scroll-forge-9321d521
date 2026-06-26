-- Sprint 2: Notification idempotency + system_health rebuild
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_uq
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

DROP FUNCTION IF EXISTS public.get_system_health();

CREATE FUNCTION public.get_system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'registrar')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'cron_runs_24h',          (SELECT count(*) FROM public.cron_execution_log WHERE started_at > now() - interval '24 hours'),
    'cron_errors_24h',        (SELECT count(*) FROM public.cron_execution_log WHERE started_at > now() - interval '24 hours' AND status='error'),
    'ai_calls_24h',           (SELECT count(*) FROM public.ai_output_log WHERE created_at > now() - interval '24 hours'),
    'ai_errors_24h',          (SELECT count(*) FROM public.ai_output_log WHERE created_at > now() - interval '24 hours' AND status='error'),
    'ai_review_pending',      (SELECT count(*) FROM public.ai_output_log WHERE human_review_required = true),
    'notifications_24h',      (SELECT count(*) FROM public.notifications WHERE created_at > now() - interval '24 hours'),
    'integrity_alerts_open',  COALESCE((SELECT count(*) FROM public.academic_integrity_alerts WHERE resolved_at IS NULL), 0),
    'human_review_queue_depth', (SELECT count(*) FROM public.human_review_requests WHERE status IN ('pending','in_review'))
  ) INTO v;
  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;