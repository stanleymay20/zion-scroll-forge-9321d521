
CREATE TABLE IF NOT EXISTS public.retention_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_id uuid,
  program_label text NOT NULL,
  cohort_year int NOT NULL,
  cohort_size int NOT NULL,
  still_enrolled int NOT NULL DEFAULT 0,
  graduated int NOT NULL DEFAULT 0,
  withdrawn int NOT NULL DEFAULT 0,
  retention_rate numeric(5,2),
  completion_rate numeric(5,2),
  median_gpa numeric(4,2),
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid,
  is_publishable boolean NOT NULL DEFAULT false,
  insufficient_reason text,
  methodology_notes text
);
ALTER TABLE public.retention_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public snapshots readable" ON public.retention_snapshots;
CREATE POLICY "public snapshots readable" ON public.retention_snapshots FOR SELECT
  USING (is_publishable = true
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'registrar')
         OR public.has_role(auth.uid(),'faculty'));

DROP POLICY IF EXISTS "registrar manages snapshots" ON public.retention_snapshots;
CREATE POLICY "registrar manages snapshots" ON public.retention_snapshots FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE TABLE IF NOT EXISTS public.at_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  signal_kind text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  detail text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text
);
CREATE INDEX IF NOT EXISTS idx_at_risk_student ON public.at_risk_signals(student_id);
ALTER TABLE public.at_risk_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student sees own risk" ON public.at_risk_signals;
CREATE POLICY "student sees own risk" ON public.at_risk_signals FOR SELECT
  USING (student_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'registrar')
         OR public.has_role(auth.uid(),'faculty'));

DROP POLICY IF EXISTS "registrar manages risk" ON public.at_risk_signals;
CREATE POLICY "registrar manages risk" ON public.at_risk_signals FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

-- Fail-closed retention snapshot computation.
CREATE OR REPLACE FUNCTION public.compute_retention_snapshot(p_degree_id uuid, p_cohort_year int, p_label text DEFAULT NULL)
RETURNS public.retention_snapshots
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cohort int;
  v_still int;
  v_grad int;
  v_with int;
  v_gpa numeric;
  v_row public.retention_snapshots;
  v_publishable boolean := false;
  v_reason text := NULL;
  v_label text := COALESCE(p_label, 'degree:' || COALESCE(p_degree_id::text,'all'));
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status IN ('active','enrolled','in_progress')),
    count(*) FILTER (WHERE status = 'graduated' OR actual_graduation IS NOT NULL),
    count(*) FILTER (WHERE status IN ('withdrawn','dropped'))
  INTO v_cohort, v_still, v_grad, v_with
  FROM public.student_degree_enrollments
  WHERE (p_degree_id IS NULL OR degree_id = p_degree_id)
    AND extract(year FROM enrolled_at) = p_cohort_year;

  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY gpa) INTO v_gpa
  FROM public.student_degree_enrollments
  WHERE (p_degree_id IS NULL OR degree_id = p_degree_id)
    AND extract(year FROM enrolled_at) = p_cohort_year
    AND gpa IS NOT NULL;

  IF v_cohort < 10 THEN
    v_publishable := false;
    v_reason := 'insufficient_cohort_size (n<10)';
  ELSE
    v_publishable := true;
  END IF;

  INSERT INTO public.retention_snapshots (
    degree_id, program_label, cohort_year, cohort_size,
    still_enrolled, graduated, withdrawn,
    retention_rate, completion_rate, median_gpa,
    is_publishable, insufficient_reason, methodology_notes, computed_by
  ) VALUES (
    p_degree_id, v_label, p_cohort_year, COALESCE(v_cohort,0),
    COALESCE(v_still,0), COALESCE(v_grad,0), COALESCE(v_with,0),
    CASE WHEN v_cohort >= 10 THEN ROUND(100.0 * (COALESCE(v_still,0)+COALESCE(v_grad,0)) / NULLIF(v_cohort,0), 2) ELSE NULL END,
    CASE WHEN v_cohort >= 10 THEN ROUND(100.0 * COALESCE(v_grad,0) / NULLIF(v_cohort,0), 2) ELSE NULL END,
    CASE WHEN v_cohort >= 10 THEN v_gpa ELSE NULL END,
    v_publishable, v_reason,
    'Computed from student_degree_enrollments. Cohorts <10 are stored but not published.',
    auth.uid()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END $$;

-- Recompute at-risk signals for all active enrollments.
CREATE OR REPLACE FUNCTION public.recompute_at_risk_signals()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
BEGIN
  -- Clear unresolved auto-generated signals (reason prefix 'auto:')
  DELETE FROM public.at_risk_signals
   WHERE resolved_at IS NULL AND detail LIKE 'auto:%';

  -- Low progress: < 25% after 30 days
  INSERT INTO public.at_risk_signals (student_id, signal_kind, severity, detail)
  SELECT user_id, 'progress_stalled', 'medium',
         'auto:progress=' || ROUND(coalesce(progress,0)::numeric,2)::text
  FROM public.enrollments
  WHERE coalesce(progress,0) < 25
    AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- GPA risk: below 2.0
  INSERT INTO public.at_risk_signals (student_id, signal_kind, severity, detail)
  SELECT user_id, 'gpa_risk', 'high',
         'auto:gpa=' || gpa::text
  FROM public.student_degree_enrollments
  WHERE gpa IS NOT NULL AND gpa < 2.0
    AND status IN ('active','enrolled','in_progress');

  RETURN v_count;
END $$;
