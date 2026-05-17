
-- Enum
DO $$ BEGIN
  CREATE TYPE public.evidence_verification_state AS ENUM ('pending','verified','expired','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Faculty credentials
CREATE TABLE IF NOT EXISTS public.faculty_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id uuid NOT NULL,
  credential_type text NOT NULL, -- degree | license | certification | award
  title text NOT NULL,
  issuing_institution text NOT NULL,
  field text,
  level text, -- bachelor | master | doctorate | professional
  issued_date date,
  document_url text,
  verification_state public.evidence_verification_state NOT NULL DEFAULT 'pending',
  verified_by uuid,
  verified_at timestamptz,
  evidence_expiry_date date,
  review_due_at date,
  last_reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faculty_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty manage own credentials"
  ON public.faculty_credentials FOR ALL
  USING (auth.uid() = faculty_user_id)
  WITH CHECK (auth.uid() = faculty_user_id AND verification_state = 'pending');
CREATE POLICY "Staff view all credentials"
  ON public.faculty_credentials FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Admin verify credentials"
  ON public.faculty_credentials FOR UPDATE
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  );

-- 2. Accreditation evidence
CREATE TABLE IF NOT EXISTS public.accreditation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid,
  control_id text NOT NULL, -- accreditation control identifier (e.g. 'A.2.1')
  framework text, -- e.g. WSCUC, ABHE, etc.
  evidence_type text NOT NULL, -- syllabus | faculty_cv | assessment_sample | advisory_minutes | survey | rubric | policy
  title text NOT NULL,
  description text,
  source_url text,
  attribution_user_id uuid, -- who authored or owns the evidence
  reviewed_by uuid,
  verification_state public.evidence_verification_state NOT NULL DEFAULT 'pending',
  evidence_expiry_date date,
  review_due_at date,
  last_reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accred_evidence_program ON public.accreditation_evidence(program_id);
CREATE INDEX IF NOT EXISTS idx_accred_evidence_control ON public.accreditation_evidence(control_id);
ALTER TABLE public.accreditation_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view all evidence"
  ON public.accreditation_evidence FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Admin manages evidence"
  ON public.accreditation_evidence FOR ALL
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  );

-- 3. External partnerships
CREATE TABLE IF NOT EXISTS public.external_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  partner_type text, -- university | church | ngo | employer | research
  scope text,
  mou_url text,
  contact_email text,
  verification_state public.evidence_verification_state NOT NULL DEFAULT 'pending',
  verified_by uuid,
  evidence_expiry_date date,
  review_due_at date,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.external_partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view partnerships"
  ON public.external_partnerships FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Admin manages partnerships"
  ON public.external_partnerships FOR ALL
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  );

-- 4. Practicum providers
CREATE TABLE IF NOT EXISTS public.practicum_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  address text,
  supervisor_name text,
  supervisor_email text,
  capacity int,
  verification_state public.evidence_verification_state NOT NULL DEFAULT 'pending',
  verified_by uuid,
  evidence_expiry_date date,
  review_due_at date,
  last_reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.practicum_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view practicum providers"
  ON public.practicum_providers FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Admin manages practicum providers"
  ON public.practicum_providers FOR ALL
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  );

-- 5. Assessment effectiveness reviews
CREATE TABLE IF NOT EXISTS public.assessment_effectiveness_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL,
  term_id uuid,
  reviewed_by uuid NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  plo_attainment_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings text NOT NULL,
  action_plan text,
  verification_state public.evidence_verification_state NOT NULL DEFAULT 'pending',
  review_due_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_effectiveness_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view effectiveness reviews"
  ON public.assessment_effectiveness_reviews FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Faculty author effectiveness reviews"
  ON public.assessment_effectiveness_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewed_by AND (
      public.has_role(auth.uid(),'faculty') OR
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'superadmin')
    )
  );
CREATE POLICY "Admin manages effectiveness reviews"
  ON public.assessment_effectiveness_reviews FOR UPDATE
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin') OR
    public.has_role(auth.uid(),'registrar')
  );

-- 6. Readiness function
CREATE OR REPLACE FUNCTION public.accreditation_readiness(_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_curriculum_pass boolean := false;
  v_faculty_review boolean := false;
  v_plo_data boolean := false;
  v_effectiveness boolean := false;
  v_evidence_total int := 0;
  v_evidence_verified int := 0;
  v_evidence_expired int := 0;
  v_missing_evidence jsonb := '[]'::jsonb;
  v_faculty_gaps int := 0;
  v_expired_reviews int := 0;
  v_score numeric := 0;
  v_ready boolean := false;
  v_controls_pass int := 0;
  v_controls_total int := 6;
BEGIN
  IF NOT (
    public.has_role(v_caller,'faculty') OR
    public.has_role(v_caller,'registrar') OR
    public.has_role(v_caller,'admin') OR
    public.has_role(v_caller,'superadmin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Curriculum depth gate (uses prior PR1 function if present)
  BEGIN
    SELECT (public.curriculum_depth_score(_program_id)->>'passes_gate')::boolean
    INTO v_curriculum_pass;
  EXCEPTION WHEN undefined_function THEN
    v_curriculum_pass := false;
  END;

  SELECT EXISTS(
    SELECT 1 FROM public.faculty_curriculum_reviews
    WHERE status = 'approved'
  ) INTO v_faculty_review;

  SELECT EXISTS(
    SELECT 1 FROM public.program_learning_outcomes WHERE program_id = _program_id
  ) INTO v_plo_data;

  SELECT EXISTS(
    SELECT 1 FROM public.assessment_effectiveness_reviews
    WHERE program_id = _program_id AND verification_state = 'verified'
  ) INTO v_effectiveness;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE verification_state = 'verified'),
         COUNT(*) FILTER (WHERE verification_state = 'expired'
                           OR (evidence_expiry_date IS NOT NULL AND evidence_expiry_date < CURRENT_DATE))
  INTO v_evidence_total, v_evidence_verified, v_evidence_expired
  FROM public.accreditation_evidence
  WHERE program_id = _program_id;

  -- Faculty credentials: number of program-assigned faculty without verified credentials
  SELECT COUNT(*) INTO v_faculty_gaps
  FROM public.program_canonical_faculty pcf
  LEFT JOIN public.faculty_credentials fc
    ON fc.faculty_user_id = pcf.faculty_user_id
       AND fc.verification_state = 'verified'
  WHERE pcf.degree_program_id = _program_id
    AND fc.id IS NULL;

  SELECT COUNT(*) INTO v_expired_reviews
  FROM public.accreditation_evidence
  WHERE program_id = _program_id
    AND review_due_at IS NOT NULL AND review_due_at < CURRENT_DATE;

  -- Missing-evidence list (canonical control types not present)
  WITH required AS (
    SELECT unnest(ARRAY['syllabus','faculty_cv','assessment_sample','advisory_minutes','rubric','policy']) AS t
  ), present AS (
    SELECT DISTINCT evidence_type FROM public.accreditation_evidence
    WHERE program_id = _program_id AND verification_state = 'verified'
  )
  SELECT COALESCE(jsonb_agg(r.t), '[]'::jsonb) INTO v_missing_evidence
  FROM required r LEFT JOIN present p ON p.evidence_type = r.t
  WHERE p.evidence_type IS NULL;

  v_controls_pass :=
    (CASE WHEN v_curriculum_pass THEN 1 ELSE 0 END) +
    (CASE WHEN v_faculty_review THEN 1 ELSE 0 END) +
    (CASE WHEN v_plo_data THEN 1 ELSE 0 END) +
    (CASE WHEN v_effectiveness THEN 1 ELSE 0 END) +
    (CASE WHEN v_evidence_total > 0
          AND v_evidence_verified::numeric / v_evidence_total >= 0.8 THEN 1 ELSE 0 END) +
    (CASE WHEN v_faculty_gaps = 0 THEN 1 ELSE 0 END);

  v_score := ROUND((v_controls_pass::numeric / v_controls_total) * 100, 1);
  v_ready := v_controls_pass = v_controls_total
             AND v_expired_reviews = 0
             AND jsonb_array_length(v_missing_evidence) = 0;

  RETURN jsonb_build_object(
    'program_id', _program_id,
    'readiness_score', v_score,
    'accreditation_ready', v_ready,
    'controls', jsonb_build_object(
      'curriculum_depth_pass', v_curriculum_pass,
      'faculty_review_present', v_faculty_review,
      'plo_data_present', v_plo_data,
      'effectiveness_review_present', v_effectiveness,
      'evidence_completeness_ok', v_evidence_total > 0 AND v_evidence_verified::numeric / GREATEST(v_evidence_total,1) >= 0.8,
      'no_faculty_credential_gaps', v_faculty_gaps = 0
    ),
    'evidence', jsonb_build_object(
      'total', v_evidence_total,
      'verified', v_evidence_verified,
      'expired', v_evidence_expired,
      'missing_types', v_missing_evidence
    ),
    'faculty_credential_gaps', v_faculty_gaps,
    'expired_reviews', v_expired_reviews
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accreditation_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accreditation_readiness(uuid) TO authenticated;

-- 7. Auto-expire trigger: when evidence_expiry_date < today, flip state to 'expired'
CREATE OR REPLACE FUNCTION public.tg_evidence_auto_expire()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.evidence_expiry_date IS NOT NULL
     AND NEW.evidence_expiry_date < CURRENT_DATE
     AND NEW.verification_state = 'verified' THEN
    NEW.verification_state := 'expired';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accred_evidence_expire
  BEFORE INSERT OR UPDATE ON public.accreditation_evidence
  FOR EACH ROW EXECUTE FUNCTION public.tg_evidence_auto_expire();
CREATE TRIGGER trg_faculty_credentials_expire
  BEFORE INSERT OR UPDATE ON public.faculty_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_evidence_auto_expire();
CREATE TRIGGER trg_partnerships_expire
  BEFORE INSERT OR UPDATE ON public.external_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.tg_evidence_auto_expire();
CREATE TRIGGER trg_practicum_expire
  BEFORE INSERT OR UPDATE ON public.practicum_providers
  FOR EACH ROW EXECUTE FUNCTION public.tg_evidence_auto_expire();
