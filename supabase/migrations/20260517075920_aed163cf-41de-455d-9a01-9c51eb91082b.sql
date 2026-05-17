-- ============================================================
-- PR8: Outcomes Truth & Employment Evidence
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.employment_verification_state AS ENUM (
    'self_reported','employer_verified','partially_verified','expired','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.research_output_type AS ENUM (
    'paper','conference','repository','patent','public_demo','dataset','thesis'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.peer_review_state AS ENUM (
    'not_reviewed','under_review','peer_reviewed','retracted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.outcome_status AS ENUM (
    'pending','reviewed','verified','rejected','retracted','expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- graduate_outcomes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.graduate_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID,
  program_name TEXT NOT NULL,
  cohort_year INT NOT NULL,
  graduation_date DATE,
  final_gpa NUMERIC(4,2),
  is_graduated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  reviewer_user_id UUID,
  reviewer_role TEXT,
  reviewed_at TIMESTAMPTZ,
  status public.outcome_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grad_outcomes_user ON public.graduate_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_grad_outcomes_program_year ON public.graduate_outcomes(program_id, cohort_year);
ALTER TABLE public.graduate_outcomes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- employment_verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  graduate_outcome_id UUID REFERENCES public.graduate_outcomes(id) ON DELETE SET NULL,
  employer_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employment_type TEXT,
  start_date DATE,
  end_date DATE,
  country TEXT,
  is_field_aligned BOOLEAN,
  verification_state public.employment_verification_state NOT NULL DEFAULT 'self_reported',
  verification_method TEXT,
  evidence_source TEXT,
  reviewer_user_id UUID,
  reviewer_role TEXT,
  verified_at TIMESTAMPTZ,
  recheck_due_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_verif_user ON public.employment_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_verif_state ON public.employment_verifications(verification_state);
ALTER TABLE public.employment_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- research_outputs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.research_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID,
  output_type public.research_output_type NOT NULL,
  title TEXT NOT NULL,
  venue TEXT,
  url TEXT,
  doi TEXT,
  published_date DATE,
  peer_review_state public.peer_review_state NOT NULL DEFAULT 'not_reviewed',
  citation_count INT NOT NULL DEFAULT 0,
  status public.outcome_status NOT NULL DEFAULT 'pending',
  reviewer_user_id UUID,
  reviewer_role TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_user ON public.research_outputs(user_id);
ALTER TABLE public.research_outputs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- practicum_outcomes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.practicum_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  practicum_provider_id UUID,
  provider_name TEXT NOT NULL,
  role_description TEXT,
  hours_completed INT,
  start_date DATE,
  end_date DATE,
  signed_off_by_provider BOOLEAN NOT NULL DEFAULT false,
  provider_signoff_at TIMESTAMPTZ,
  provider_signoff_contact TEXT,
  status public.outcome_status NOT NULL DEFAULT 'pending',
  reviewer_user_id UUID,
  reviewer_role TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prac_user ON public.practicum_outcomes(user_id);
ALTER TABLE public.practicum_outcomes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- outcome_evidence_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outcome_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_table TEXT NOT NULL,
  outcome_id UUID NOT NULL,
  evidence_kind TEXT NOT NULL,
  evidence_url TEXT,
  evidence_summary TEXT,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcome_evidence_outcome ON public.outcome_evidence_links(outcome_table, outcome_id);
ALTER TABLE public.outcome_evidence_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- cohort_outcome_metrics (only published metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cohort_outcome_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID,
  program_name TEXT NOT NULL,
  cohort_year INT NOT NULL,
  reporting_window_start DATE NOT NULL,
  reporting_window_end DATE NOT NULL,
  total_graduates INT NOT NULL DEFAULT 0,
  verified_sample_size INT NOT NULL DEFAULT 0,
  employer_verified_count INT NOT NULL DEFAULT 0,
  self_reported_count INT NOT NULL DEFAULT 0,
  field_aligned_count INT NOT NULL DEFAULT 0,
  median_time_to_employment_days INT,
  research_outputs_count INT NOT NULL DEFAULT 0,
  practicum_completion_count INT NOT NULL DEFAULT 0,
  methodology_notes TEXT,
  excluded_cohorts TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  computed_by UUID,
  is_public BOOLEAN NOT NULL DEFAULT false,
  insufficient_evidence_reason TEXT,
  UNIQUE(program_id, cohort_year, reporting_window_start)
);

ALTER TABLE public.cohort_outcome_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Immutability + auto-expire triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_block_verified_outcome_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'verified' THEN
    RAISE EXCEPTION 'Verified outcomes cannot be deleted (id=%). Retract instead.', OLD.id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_grad_outcomes_no_del ON public.graduate_outcomes;
CREATE TRIGGER trg_grad_outcomes_no_del BEFORE DELETE ON public.graduate_outcomes
FOR EACH ROW EXECUTE FUNCTION public.tg_block_verified_outcome_delete();

DROP TRIGGER IF EXISTS trg_research_no_del ON public.research_outputs;
CREATE TRIGGER trg_research_no_del BEFORE DELETE ON public.research_outputs
FOR EACH ROW EXECUTE FUNCTION public.tg_block_verified_outcome_delete();

DROP TRIGGER IF EXISTS trg_prac_no_del ON public.practicum_outcomes;
CREATE TRIGGER trg_prac_no_del BEFORE DELETE ON public.practicum_outcomes
FOR EACH ROW EXECUTE FUNCTION public.tg_block_verified_outcome_delete();

CREATE OR REPLACE FUNCTION public.tg_block_employment_verified_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.verification_state IN ('employer_verified','partially_verified') THEN
    RAISE EXCEPTION 'Employer-verified employment record cannot be deleted (id=%). Mark expired or rejected.', OLD.id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_emp_no_del ON public.employment_verifications;
CREATE TRIGGER trg_emp_no_del BEFORE DELETE ON public.employment_verifications
FOR EACH ROW EXECUTE FUNCTION public.tg_block_employment_verified_delete();

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_grad_touch ON public.graduate_outcomes;
CREATE TRIGGER trg_grad_touch BEFORE UPDATE ON public.graduate_outcomes
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
DROP TRIGGER IF EXISTS trg_emp_touch ON public.employment_verifications;
CREATE TRIGGER trg_emp_touch BEFORE UPDATE ON public.employment_verifications
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============================================================
-- Cohort aggregator (FAIL CLOSED)
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_cohort_outcomes(
  _program_id UUID,
  _cohort_year INT,
  _window_start DATE,
  _window_end DATE,
  _publish BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total INT;
  verified_count INT;
  employer_verified INT;
  self_reported INT;
  field_aligned INT;
  research_count INT;
  prac_count INT;
  median_days INT;
  prog_name TEXT;
  metric_id UUID;
  insufficient TEXT := NULL;
  caller UUID := auth.uid();
BEGIN
  -- Only registrar/admin/superadmin may compute
  IF NOT (has_role(caller,'registrar') OR has_role(caller,'admin') OR has_role(caller,'superadmin')) THEN
    RAISE EXCEPTION 'Only registrar/admin may recompute cohort outcomes';
  END IF;

  SELECT count(*) INTO total
  FROM graduate_outcomes
  WHERE program_id = _program_id AND cohort_year = _cohort_year AND is_graduated = true;

  SELECT count(*) FILTER (WHERE ev.verification_state IN ('employer_verified','partially_verified'))
  INTO verified_count
  FROM graduate_outcomes g
  LEFT JOIN employment_verifications ev ON ev.user_id = g.user_id
  WHERE g.program_id = _program_id AND g.cohort_year = _cohort_year AND g.is_graduated = true;

  SELECT
    count(*) FILTER (WHERE ev.verification_state = 'employer_verified'),
    count(*) FILTER (WHERE ev.verification_state = 'self_reported'),
    count(*) FILTER (WHERE ev.is_field_aligned IS TRUE AND ev.verification_state IN ('employer_verified','partially_verified'))
  INTO employer_verified, self_reported, field_aligned
  FROM graduate_outcomes g
  LEFT JOIN employment_verifications ev ON ev.user_id = g.user_id
  WHERE g.program_id = _program_id AND g.cohort_year = _cohort_year AND g.is_graduated = true;

  SELECT percentile_cont(0.5) WITHIN GROUP (
    ORDER BY (ev.start_date - g.graduation_date)
  )::INT
  INTO median_days
  FROM graduate_outcomes g
  JOIN employment_verifications ev ON ev.user_id = g.user_id
   AND ev.verification_state IN ('employer_verified','partially_verified')
   AND ev.start_date IS NOT NULL AND g.graduation_date IS NOT NULL
  WHERE g.program_id = _program_id AND g.cohort_year = _cohort_year;

  SELECT count(*) INTO research_count
  FROM research_outputs r
  JOIN graduate_outcomes g ON g.user_id = r.user_id
  WHERE g.program_id = _program_id AND g.cohort_year = _cohort_year
    AND r.status = 'verified';

  SELECT count(*) INTO prac_count
  FROM practicum_outcomes p
  JOIN graduate_outcomes g ON g.user_id = p.user_id
  WHERE g.program_id = _program_id AND g.cohort_year = _cohort_year
    AND p.status = 'verified';

  SELECT name INTO prog_name FROM degree_programs WHERE id = _program_id;

  IF COALESCE(verified_count,0) < 5 THEN
    insufficient := format('Verified graduate sample is %s; minimum 5 required to publish statistical outcomes.', COALESCE(verified_count,0));
  END IF;

  INSERT INTO cohort_outcome_metrics (
    program_id, program_name, cohort_year, reporting_window_start, reporting_window_end,
    total_graduates, verified_sample_size, employer_verified_count, self_reported_count,
    field_aligned_count, median_time_to_employment_days, research_outputs_count,
    practicum_completion_count, computed_by, is_public, insufficient_evidence_reason,
    methodology_notes
  ) VALUES (
    _program_id, COALESCE(prog_name,'Unknown program'), _cohort_year, _window_start, _window_end,
    COALESCE(total,0), COALESCE(verified_count,0), COALESCE(employer_verified,0), COALESCE(self_reported,0),
    COALESCE(field_aligned,0), median_days, COALESCE(research_count,0),
    COALESCE(prac_count,0), caller,
    (_publish AND insufficient IS NULL),
    insufficient,
    'Counts only employer_verified or partially_verified placements. Self-reported employment is excluded from public metrics. Minimum verified sample size is 5.'
  )
  ON CONFLICT (program_id, cohort_year, reporting_window_start) DO UPDATE
  SET total_graduates = EXCLUDED.total_graduates,
      verified_sample_size = EXCLUDED.verified_sample_size,
      employer_verified_count = EXCLUDED.employer_verified_count,
      self_reported_count = EXCLUDED.self_reported_count,
      field_aligned_count = EXCLUDED.field_aligned_count,
      median_time_to_employment_days = EXCLUDED.median_time_to_employment_days,
      research_outputs_count = EXCLUDED.research_outputs_count,
      practicum_completion_count = EXCLUDED.practicum_completion_count,
      is_public = EXCLUDED.is_public,
      insufficient_evidence_reason = EXCLUDED.insufficient_evidence_reason,
      computed_at = now(),
      computed_by = caller
  RETURNING id INTO metric_id;

  RETURN metric_id;
END $$;

-- ============================================================
-- RLS policies
-- ============================================================

-- graduate_outcomes
DROP POLICY IF EXISTS "Students see their own grad outcome" ON public.graduate_outcomes;
CREATE POLICY "Students see their own grad outcome"
ON public.graduate_outcomes FOR SELECT TO authenticated
USING (user_id = auth.uid()
  OR has_role(auth.uid(),'faculty')
  OR has_role(auth.uid(),'registrar')
  OR has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Students can self-submit grad outcome" ON public.graduate_outcomes;
CREATE POLICY "Students can self-submit grad outcome"
ON public.graduate_outcomes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Governance can update grad outcome" ON public.graduate_outcomes;
CREATE POLICY "Governance can update grad outcome"
ON public.graduate_outcomes FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'))
WITH CHECK (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

-- employment_verifications
DROP POLICY IF EXISTS "Students see/edit own employment" ON public.employment_verifications;
CREATE POLICY "Students see/edit own employment"
ON public.employment_verifications FOR SELECT TO authenticated
USING (user_id = auth.uid()
  OR has_role(auth.uid(),'faculty')
  OR has_role(auth.uid(),'registrar')
  OR has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Students self-report employment" ON public.employment_verifications;
CREATE POLICY "Students self-report employment"
ON public.employment_verifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND verification_state = 'self_reported');

DROP POLICY IF EXISTS "Governance manages employment verification" ON public.employment_verifications;
CREATE POLICY "Governance manages employment verification"
ON public.employment_verifications FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'))
WITH CHECK (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

-- research_outputs
DROP POLICY IF EXISTS "Read research outputs" ON public.research_outputs;
CREATE POLICY "Read research outputs"
ON public.research_outputs FOR SELECT TO authenticated
USING (user_id = auth.uid()
  OR has_role(auth.uid(),'faculty')
  OR has_role(auth.uid(),'registrar')
  OR has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Students submit research output" ON public.research_outputs;
CREATE POLICY "Students submit research output"
ON public.research_outputs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'faculty') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Governance verifies research output" ON public.research_outputs;
CREATE POLICY "Governance verifies research output"
ON public.research_outputs FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'faculty') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'))
WITH CHECK (has_role(auth.uid(),'faculty') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

-- practicum_outcomes
DROP POLICY IF EXISTS "Read practicum outcomes" ON public.practicum_outcomes;
CREATE POLICY "Read practicum outcomes"
ON public.practicum_outcomes FOR SELECT TO authenticated
USING (user_id = auth.uid()
  OR has_role(auth.uid(),'faculty')
  OR has_role(auth.uid(),'registrar')
  OR has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Students submit practicum" ON public.practicum_outcomes;
CREATE POLICY "Students submit practicum"
ON public.practicum_outcomes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Governance verifies practicum" ON public.practicum_outcomes;
CREATE POLICY "Governance verifies practicum"
ON public.practicum_outcomes FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'))
WITH CHECK (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

-- outcome_evidence_links
DROP POLICY IF EXISTS "Read outcome evidence" ON public.outcome_evidence_links;
CREATE POLICY "Read outcome evidence"
ON public.outcome_evidence_links FOR SELECT TO authenticated
USING (has_role(auth.uid(),'faculty') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Governance manages outcome evidence" ON public.outcome_evidence_links;
CREATE POLICY "Governance manages outcome evidence"
ON public.outcome_evidence_links FOR ALL TO authenticated
USING (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'))
WITH CHECK (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

-- cohort_outcome_metrics
DROP POLICY IF EXISTS "Public sees published cohort metrics" ON public.cohort_outcome_metrics;
CREATE POLICY "Public sees published cohort metrics"
ON public.cohort_outcome_metrics FOR SELECT
USING (is_public = true AND verified_sample_size >= 5);

DROP POLICY IF EXISTS "Staff see all cohort metrics" ON public.cohort_outcome_metrics;
CREATE POLICY "Staff see all cohort metrics"
ON public.cohort_outcome_metrics FOR SELECT TO authenticated
USING (has_role(auth.uid(),'faculty') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "Governance manages cohort metrics" ON public.cohort_outcome_metrics;
CREATE POLICY "Governance manages cohort metrics"
ON public.cohort_outcome_metrics FOR ALL TO authenticated
USING (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'))
WITH CHECK (has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'superadmin'));