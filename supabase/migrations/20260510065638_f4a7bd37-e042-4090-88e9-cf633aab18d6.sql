
-- =========================================================
-- PHASE 1: Institutional Layer + Credential Class
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.institutional_layer AS ENUM (
    'accreditation_track','research_innovation','scroll_distinction'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.credential_class AS ENUM (
    'academic_degree','professional_certificate','diploma',
    'research_fellowship','honorific_distinction','spiritual_overlay'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.curriculum_status AS ENUM (
    'pending_authorship','authored','faculty_review','accreditation_review','approved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.degree_programs
  ADD COLUMN IF NOT EXISTS institutional_layer public.institutional_layer,
  ADD COLUMN IF NOT EXISTS credential_class public.credential_class;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS curriculum_status public.curriculum_status DEFAULT 'pending_authorship',
  ADD COLUMN IF NOT EXISTS faculty_author_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

-- Backfill institutional layer
UPDATE public.degree_programs
SET institutional_layer = 'scroll_distinction',
    credential_class    = 'honorific_distinction'
WHERE lifecycle_status = 'internal_honorific'
   OR title ILIKE '%exousia%'
   OR title ILIKE '%authority of nations%'
   OR title ILIKE '%scrollmaster%';

UPDATE public.degree_programs
SET institutional_layer = 'research_innovation',
    credential_class    = COALESCE(credential_class,'research_fellowship')
WHERE institutional_layer IS NULL
  AND (lifecycle_status IN ('experimental') OR program_status IN ('pilot','experimental','needs_rework'));

UPDATE public.degree_programs
SET institutional_layer = 'accreditation_track',
    credential_class    = COALESCE(credential_class,
      CASE
        WHEN level ILIKE '%certificate%' THEN 'professional_certificate'::public.credential_class
        WHEN level ILIKE '%diploma%' THEN 'diploma'::public.credential_class
        ELSE 'academic_degree'::public.credential_class
      END)
WHERE institutional_layer IS NULL;

CREATE INDEX IF NOT EXISTS idx_degree_programs_layer ON public.degree_programs(institutional_layer);
CREATE INDEX IF NOT EXISTS idx_courses_curriculum_status ON public.courses(curriculum_status);

-- =========================================================
-- PHASE 2: Evidence + External Standards
-- =========================================================
CREATE TABLE IF NOT EXISTS public.course_evidence_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  required_readings jsonb NOT NULL DEFAULT '[]'::jsonb,
  assessment_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  faculty_author text,
  reviewed_by text,
  last_reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

CREATE TABLE IF NOT EXISTS public.external_standard_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('course','program')),
  entity_id uuid NOT NULL,
  standard_body text NOT NULL CHECK (standard_body IN ('ACM','IEEE','UNESCO','BOLOGNA','UK_FHEQ','EQF','EU_AI_ACT','ECTS','ABET','AACSB','QAA')),
  standard_code text NOT NULL,
  standard_title text,
  alignment_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, standard_body, standard_code)
);

CREATE TABLE IF NOT EXISTS public.practicum_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  required_hours int NOT NULL DEFAULT 0,
  supervisor_required boolean NOT NULL DEFAULT true,
  reflection_required boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.thesis_dissertation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  min_word_count int,
  proposal_required boolean NOT NULL DEFAULT true,
  oral_defense_required boolean NOT NULL DEFAULT true,
  publication_required boolean NOT NULL DEFAULT false,
  ethics_review_required boolean NOT NULL DEFAULT true,
  supervisor_required boolean NOT NULL DEFAULT true,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transcript_equivalency_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL DEFAULT 'SCROLL_CREDIT',
  target_system text NOT NULL,
  conversion_factor numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_system, target_system)
);

INSERT INTO public.transcript_equivalency_rules (source_system, target_system, conversion_factor, notes) VALUES
  ('SCROLL_CREDIT','ECTS',1.0,'1 Scroll credit ≈ 1 ECTS (25–30 study hours)'),
  ('SCROLL_CREDIT','US_SEMESTER_HOUR',0.5,'2 Scroll credits ≈ 1 US semester hour'),
  ('SCROLL_CREDIT','UK_CATS',2.0,'1 Scroll credit ≈ 2 UK CATS credits')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.course_evidence_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_standard_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_dissertation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_equivalency_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read evidence" ON public.course_evidence_requirements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin write evidence" ON public.course_evidence_requirements FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read standards" ON public.external_standard_mappings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin write standards" ON public.external_standard_mappings FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read practicum" ON public.practicum_requirements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin write practicum" ON public.practicum_requirements FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read thesis" ON public.thesis_dissertation_rules FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin write thesis" ON public.thesis_dissertation_rules FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read equivalency" ON public.transcript_equivalency_rules FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admin write equivalency" ON public.transcript_equivalency_rules FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- PHASE 3: Quality Gate Functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.curriculum_depth_validator(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_courses int := 0;
  v_total_credits int := 0;
  v_approved_courses int := 0;
  v_pending int := 0;
  v_min_courses int := 8;
  v_min_credits int := 30;
  v_level text;
BEGIN
  SELECT level INTO v_level FROM degree_programs WHERE id = p_program_id;

  -- Adjust expected min by level
  v_min_courses := CASE
    WHEN v_level ILIKE '%certificate%' THEN 4
    WHEN v_level ILIKE '%diploma%'     THEN 6
    WHEN v_level ILIKE '%bachelor%'    THEN 30
    WHEN v_level ILIKE '%master%'      THEN 8
    WHEN v_level ILIKE '%doctor%' OR v_level ILIKE '%phd%' THEN 6
    ELSE 8
  END;
  v_min_credits := CASE
    WHEN v_level ILIKE '%certificate%' THEN 9
    WHEN v_level ILIKE '%diploma%'     THEN 18
    WHEN v_level ILIKE '%bachelor%'    THEN 120
    WHEN v_level ILIKE '%master%'      THEN 30
    WHEN v_level ILIKE '%doctor%' OR v_level ILIKE '%phd%' THEN 60
    ELSE 30
  END;

  SELECT
    COUNT(*),
    COALESCE(SUM(c.credit_hours),0),
    COUNT(*) FILTER (WHERE c.curriculum_status = 'approved'),
    COUNT(*) FILTER (WHERE c.curriculum_status IN ('pending_authorship','authored','faculty_review','accreditation_review'))
  INTO v_total_courses, v_total_credits, v_approved_courses, v_pending
  FROM degree_program_courses dpc
  JOIN courses c ON c.id = dpc.course_id
  WHERE dpc.degree_program_id = p_program_id;

  RETURN jsonb_build_object(
    'level', v_level,
    'total_courses', v_total_courses,
    'approved_courses', v_approved_courses,
    'pending_courses', v_pending,
    'total_credits', v_total_credits,
    'min_courses', v_min_courses,
    'min_credits', v_min_credits,
    'meets_course_min', v_total_courses >= v_min_courses,
    'meets_credit_min', v_total_credits >= v_min_credits,
    'all_courses_approved', v_pending = 0 AND v_total_courses > 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_program_quality_gate(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_depth jsonb;
  v_missing text[] := '{}';
  v_plo_count int;
  v_target_count int;
  v_canonical_count int;
  v_layer public.institutional_layer;
BEGIN
  SELECT institutional_layer INTO v_layer FROM degree_programs WHERE id = p_program_id;

  v_depth := public.curriculum_depth_validator(p_program_id);

  IF NOT (v_depth->>'meets_course_min')::boolean THEN
    v_missing := array_append(v_missing, 'insufficient_courses');
  END IF;
  IF NOT (v_depth->>'meets_credit_min')::boolean THEN
    v_missing := array_append(v_missing, 'insufficient_credits');
  END IF;
  IF NOT (v_depth->>'all_courses_approved')::boolean THEN
    v_missing := array_append(v_missing, 'unapproved_courses');
  END IF;

  SELECT COUNT(*) INTO v_plo_count FROM program_learning_outcomes WHERE program_id = p_program_id;
  IF v_plo_count < 3 THEN v_missing := array_append(v_missing,'program_learning_outcomes<3'); END IF;

  SELECT COUNT(*) INTO v_target_count FROM program_accreditation_targets WHERE program_id = p_program_id;
  IF v_target_count = 0 THEN v_missing := array_append(v_missing,'no_accreditation_target'); END IF;

  SELECT COUNT(*) INTO v_canonical_count FROM program_canonical_faculty WHERE program_id = p_program_id;
  IF v_canonical_count = 0 THEN v_missing := array_append(v_missing,'no_canonical_faculty'); END IF;

  -- Mandatory blueprint slots filled
  IF EXISTS (
    SELECT 1 FROM accreditation_blueprint
    WHERE degree_program_id = p_program_id AND course_id IS NULL
  ) THEN
    v_missing := array_append(v_missing,'unfilled_blueprint_slots');
  END IF;

  RETURN jsonb_build_object(
    'program_id', p_program_id,
    'institutional_layer', v_layer,
    'depth', v_depth,
    'plo_count', v_plo_count,
    'accreditation_targets', v_target_count,
    'missing', v_missing,
    'passes', array_length(v_missing,1) IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accreditation_readiness_score(p_program_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb := public.enforce_program_quality_gate(p_program_id);
  v_score int := 100;
  v_missing_count int;
BEGIN
  v_missing_count := COALESCE(jsonb_array_length(v->'missing'),0);
  v_score := GREATEST(0, 100 - (v_missing_count * 15));
  RETURN v_score;
END;
$$;

-- Blocking trigger: program cannot become 'active' unless gate passes
CREATE OR REPLACE FUNCTION public.tg_block_program_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gate jsonb;
BEGIN
  IF NEW.lifecycle_status = 'active'
     AND (OLD.lifecycle_status IS DISTINCT FROM 'active') THEN
    v_gate := public.enforce_program_quality_gate(NEW.id);
    IF NOT (v_gate->>'passes')::boolean THEN
      RAISE EXCEPTION 'Program quality gate failed: %', v_gate->'missing'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_program_activation ON public.degree_programs;
CREATE TRIGGER trg_block_program_activation
BEFORE UPDATE ON public.degree_programs
FOR EACH ROW EXECUTE FUNCTION public.tg_block_program_activation();
