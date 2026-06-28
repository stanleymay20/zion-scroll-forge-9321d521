-- =====================================================================
-- Sprint D1 — Operations Foundation
-- =====================================================================

-- ---------- 1. Maintenance mode --------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  is_enabled boolean NOT NULL DEFAULT false,
  reason text,
  banner_message text,
  enabled_by uuid REFERENCES auth.users(id),
  enabled_at timestamptz,
  expected_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_settings TO anon, authenticated;
GRANT ALL ON public.maintenance_settings TO service_role;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_settings_public_read" ON public.maintenance_settings;
CREATE POLICY "maintenance_settings_public_read"
  ON public.maintenance_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "maintenance_settings_admin_write" ON public.maintenance_settings;
CREATE POLICY "maintenance_settings_admin_write"
  ON public.maintenance_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

INSERT INTO public.maintenance_settings (id, is_enabled) VALUES (true, false) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_maintenance_mode()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_enabled FROM public.maintenance_settings WHERE id = true), false);
$$;

CREATE OR REPLACE FUNCTION public.assert_not_maintenance()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_maintenance_mode()
     AND NOT (public.has_role(auth.uid(),'admin'::app_role)
              OR public.has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'maintenance_mode_active'
      USING HINT = 'The platform is in maintenance mode. Writes are temporarily disabled.';
  END IF;
END;
$$;

-- ---------- 2. ops_log -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.ops_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  trace_id uuid,
  span_id uuid,
  source text NOT NULL,
  event text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('debug','info','warn','error','fatal')),
  actor_id uuid,
  actor_role text,
  fingerprint text,
  duration_ms integer,
  http_status integer,
  message text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ops_log_occurred_at_idx ON public.ops_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS ops_log_correlation_idx ON public.ops_log (correlation_id);
CREATE INDEX IF NOT EXISTS ops_log_source_event_idx ON public.ops_log (source, event, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ops_log_fingerprint_idx ON public.ops_log (fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS ops_log_severity_idx ON public.ops_log (severity, occurred_at DESC) WHERE severity IN ('error','fatal');

GRANT SELECT, INSERT ON public.ops_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ops_log_id_seq TO authenticated, service_role;
GRANT ALL ON public.ops_log TO service_role;
ALTER TABLE public.ops_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_log_admin_read" ON public.ops_log;
CREATE POLICY "ops_log_admin_read" ON public.ops_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

DROP POLICY IF EXISTS "ops_log_authenticated_insert" ON public.ops_log;
CREATE POLICY "ops_log_authenticated_insert" ON public.ops_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.ops_log_write(
  _source text, _event text, _severity text DEFAULT 'info',
  _message text DEFAULT NULL, _context jsonb DEFAULT '{}'::jsonb,
  _correlation_id uuid DEFAULT NULL, _duration_ms integer DEFAULT NULL,
  _http_status integer DEFAULT NULL, _fingerprint text DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id bigint;
BEGIN
  INSERT INTO public.ops_log (correlation_id, source, event, severity, actor_id, actor_role,
    fingerprint, duration_ms, http_status, message, context)
  VALUES (COALESCE(_correlation_id, gen_random_uuid()), _source, _event, _severity, auth.uid(),
    NULLIF(current_setting('request.jwt.claims', true)::json->>'role',''),
    _fingerprint, _duration_ms, _http_status, _message, COALESCE(_context,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ops_log_write(text,text,text,text,jsonb,uuid,integer,integer,text)
  TO authenticated, service_role;

-- ---------- 3. incident_log ------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  severity text NOT NULL CHECK (severity IN ('sev1','sev2','sev3','sev4')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','mitigated','resolved','closed')),
  title text NOT NULL,
  summary text,
  affected_surface text,
  detected_via text,
  opened_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  resolution text,
  postmortem_url text,
  related_correlation_id uuid,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incident_log_status_idx ON public.incident_log (status, opened_at DESC);
CREATE INDEX IF NOT EXISTS incident_log_severity_idx ON public.incident_log (severity, opened_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.incident_log TO authenticated;
GRANT ALL ON public.incident_log TO service_role;
ALTER TABLE public.incident_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_log_admin_all" ON public.incident_log;
CREATE POLICY "incident_log_admin_all" ON public.incident_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

-- ---------- 4. background_job_runs -----------------------------------
CREATE TABLE IF NOT EXISTS public.background_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed','timed_out')),
  duration_ms integer,
  rows_processed integer,
  error_message text,
  correlation_id uuid,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS bjr_job_started_idx ON public.background_job_runs (job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS bjr_status_idx ON public.background_job_runs (status, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.background_job_runs TO authenticated;
GRANT ALL ON public.background_job_runs TO service_role;
ALTER TABLE public.background_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bjr_admin_all" ON public.background_job_runs;
CREATE POLICY "bjr_admin_all" ON public.background_job_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

-- ---------- 5. queue_health_snapshots --------------------------------
CREATE TABLE IF NOT EXISTS public.queue_health_snapshots (
  id bigserial PRIMARY KEY,
  captured_at timestamptz NOT NULL DEFAULT now(),
  queue_name text NOT NULL,
  depth integer NOT NULL DEFAULT 0,
  oldest_age_seconds integer NOT NULL DEFAULT 0,
  dlq_depth integer NOT NULL DEFAULT 0,
  throughput_per_minute numeric,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS qhs_captured_idx ON public.queue_health_snapshots (queue_name, captured_at DESC);

GRANT SELECT, INSERT ON public.queue_health_snapshots TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.queue_health_snapshots_id_seq TO authenticated, service_role;
GRANT ALL ON public.queue_health_snapshots TO service_role;
ALTER TABLE public.queue_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qhs_admin_all" ON public.queue_health_snapshots;
CREATE POLICY "qhs_admin_all" ON public.queue_health_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

-- ---------- 6. release_events ----------------------------------------
CREATE TABLE IF NOT EXISTS public.release_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  released_at timestamptz NOT NULL DEFAULT now(),
  version_tag text NOT NULL,
  commit_sha text,
  environment text NOT NULL DEFAULT 'production',
  released_by uuid REFERENCES auth.users(id),
  notes text,
  rollback_of uuid REFERENCES public.release_events(id),
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS release_events_env_idx ON public.release_events (environment, released_at DESC);

GRANT SELECT, INSERT ON public.release_events TO authenticated;
GRANT ALL ON public.release_events TO service_role;
ALTER TABLE public.release_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "release_events_admin_all" ON public.release_events;
CREATE POLICY "release_events_admin_all" ON public.release_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

-- ---------- 7. backup_verifications ----------------------------------
CREATE TABLE IF NOT EXISTS public.backup_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_at timestamptz NOT NULL DEFAULT now(),
  backup_snapshot_id text,
  backup_taken_at timestamptz,
  storage_location text,
  size_bytes bigint,
  checksum text,
  status text NOT NULL CHECK (status IN ('pass','fail','warning')),
  verified_by uuid REFERENCES auth.users(id),
  notes text
);
CREATE INDEX IF NOT EXISTS backup_verifications_idx ON public.backup_verifications (verified_at DESC);

GRANT SELECT, INSERT ON public.backup_verifications TO authenticated;
GRANT ALL ON public.backup_verifications TO service_role;
ALTER TABLE public.backup_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup_verifications_admin_all" ON public.backup_verifications;
CREATE POLICY "backup_verifications_admin_all" ON public.backup_verifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

-- ---------- 8. restore_drills ----------------------------------------
CREATE TABLE IF NOT EXISTS public.restore_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drilled_at timestamptz NOT NULL DEFAULT now(),
  scenario text NOT NULL,
  rto_target_minutes integer,
  rto_actual_minutes integer,
  rpo_target_minutes integer,
  rpo_actual_minutes integer,
  outcome text NOT NULL CHECK (outcome IN ('pass','fail','partial')),
  data_integrity_check text CHECK (data_integrity_check IN ('pass','fail','not_run')),
  drilled_by uuid REFERENCES auth.users(id),
  notes text,
  evidence_url text
);
CREATE INDEX IF NOT EXISTS restore_drills_idx ON public.restore_drills (drilled_at DESC);

GRANT SELECT, INSERT ON public.restore_drills TO authenticated;
GRANT ALL ON public.restore_drills TO service_role;
ALTER TABLE public.restore_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restore_drills_admin_all" ON public.restore_drills;
CREATE POLICY "restore_drills_admin_all" ON public.restore_drills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role));

-- ---------- 9. KPI views (single source of truth) --------------------

CREATE OR REPLACE VIEW public.vw_kpi_enrollment WITH (security_invoker = on) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*)::int AS enrollments_created,
  count(*) FILTER (WHERE status::text = 'enrolled')::int AS enrollments_active,
  count(*) FILTER (WHERE status::text = 'waitlisted')::int AS enrollments_waitlisted,
  count(*) FILTER (WHERE status::text IN ('dropped','withdrawn'))::int AS enrollments_dropped
FROM public.section_enrollments
WHERE created_at >= now() - interval '180 days'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_retention WITH (security_invoker = on) AS
SELECT
  date_trunc('month', computed_at)::date AS month,
  avg(NULLIF(retention_rate, 0))::numeric(6,4) AS avg_retention_rate,
  avg(NULLIF(completion_rate, 0))::numeric(6,4) AS avg_completion_rate,
  count(*)::int AS snapshots
FROM public.retention_snapshots
WHERE computed_at >= now() - interval '12 months'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_course_completion WITH (security_invoker = on) AS
SELECT
  date_trunc('day', completed_at)::date AS day,
  count(*)::int AS modules_completed,
  count(DISTINCT user_id)::int AS distinct_students
FROM public.module_completions
WHERE completed_at >= now() - interval '90 days'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_graduation_pipeline WITH (security_invoker = on) AS
SELECT
  COALESCE(status,'unknown') AS status,
  count(*)::int AS candidate_count
FROM public.graduation_candidates
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_faculty_utilization WITH (security_invoker = on) AS
SELECT
  date_trunc('week', snapshot_at)::date AS week,
  count(*)::int AS faculty_rows,
  count(DISTINCT faculty_user_id)::int AS distinct_faculty,
  avg(NULLIF(course_count, 0))::numeric(6,2) AS avg_course_count,
  avg(NULLIF(student_count, 0))::numeric(8,2) AS avg_student_count,
  avg(NULLIF(on_time_post_rate, 0))::numeric(6,4) AS avg_on_time_post_rate
FROM public.faculty_productivity_snapshots
WHERE snapshot_at >= now() - interval '180 days'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_course_fill WITH (security_invoker = on) AS
SELECT
  cs.id AS section_id,
  cs.term_id,
  cs.course_id,
  cs.seat_capacity,
  COALESCE(cs.enrolled_count, 0) AS enrolled_count,
  CASE WHEN COALESCE(cs.seat_capacity,0) > 0
       THEN (COALESCE(cs.enrolled_count,0)::numeric / cs.seat_capacity)
       ELSE NULL END AS fill_rate
FROM public.course_sections cs
WHERE COALESCE(cs.active, true) = true;

CREATE OR REPLACE VIEW public.vw_kpi_outcome_mastery WITH (security_invoker = on) AS
SELECT
  date_trunc('week', updated_at)::date AS week,
  count(*)::int AS mastery_rows,
  count(DISTINCT user_id)::int AS distinct_students,
  avg(NULLIF(score_pct, 0))::numeric(6,2) AS avg_score_pct
FROM public.student_outcome_mastery
WHERE updated_at >= now() - interval '180 days'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_accreditation_readiness WITH (security_invoker = on) AS
SELECT
  COALESCE(verification_state::text,'unknown') AS verification_state,
  count(*)::int AS evidence_items
FROM public.accreditation_evidence
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_financial_health WITH (security_invoker = on) AS
SELECT
  date_trunc('month', created_at)::date AS month,
  count(*)::int AS invoices_created,
  count(*) FILTER (WHERE status = 'paid')::int AS invoices_paid,
  count(*) FILTER (WHERE status IN ('overdue','past_due','unpaid'))::int AS invoices_overdue,
  (coalesce(sum(amount_cents),0)::numeric / 100)::numeric(14,2) AS billed_total,
  (coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'),0)::numeric / 100)::numeric(14,2) AS collected_total
FROM public.invoices
WHERE created_at >= now() - interval '12 months'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_system_health WITH (security_invoker = on) AS
SELECT
  date_trunc('hour', occurred_at) AS hour,
  count(*)::int AS log_events,
  count(*) FILTER (WHERE severity IN ('error','fatal'))::int AS error_events,
  count(*) FILTER (WHERE severity = 'warn')::int AS warn_events,
  count(DISTINCT correlation_id)::int AS distinct_correlations,
  avg(NULLIF(duration_ms,0))::numeric(10,2) AS avg_duration_ms
FROM public.ops_log
WHERE occurred_at >= now() - interval '48 hours'
GROUP BY 1;

CREATE OR REPLACE VIEW public.vw_kpi_ai_review_backlog WITH (security_invoker = on) AS
SELECT
  COALESCE(status,'unknown') AS status,
  count(*)::int AS request_count,
  min(created_at) AS oldest_open
FROM public.human_review_requests
GROUP BY 1;
