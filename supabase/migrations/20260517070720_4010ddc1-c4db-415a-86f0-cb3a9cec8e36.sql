
-- =========================================================
-- Phase A: Curriculum Depth Gates
-- =========================================================

-- 1. Extend course_modules with authoring fields
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS learning_objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_duration_min integer,
  ADD COLUMN IF NOT EXISTS module_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS module_prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tutor_context text;

-- 2. Depth-score cache table (one row per program, recomputed on demand)
CREATE TABLE IF NOT EXISTS public.curriculum_depth_scores (
  program_id uuid PRIMARY KEY REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  module_count integer NOT NULL DEFAULT 0,
  outcomes_count integer NOT NULL DEFAULT 0,
  reference_density numeric NOT NULL DEFAULT 0,
  assessment_diversity integer NOT NULL DEFAULT 0,
  has_practicum boolean NOT NULL DEFAULT false,
  has_research boolean NOT NULL DEFAULT false,
  faculty_reviewed_courses integer NOT NULL DEFAULT 0,
  instructional_hours numeric NOT NULL DEFAULT 0,
  sequencing_score integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  gate_passed boolean NOT NULL DEFAULT false,
  gate_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_depth_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read depth scores" ON public.curriculum_depth_scores;
CREATE POLICY "Staff can read depth scores"
  ON public.curriculum_depth_scores
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'registrar')
  );

DROP POLICY IF EXISTS "Admins manage depth scores" ON public.curriculum_depth_scores;
CREATE POLICY "Admins manage depth scores"
  ON public.curriculum_depth_scores
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- 3. Scoring functions

-- 3a. Module-level depth score (0-100)
CREATE OR REPLACE FUNCTION public.module_depth_score(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int := 0;
  v_with_objectives int := 0;
  v_with_duration int := 0;
  v_with_references int := 0;
  v_with_activities int := 0;
  v_content_rich int := 0;
  v_score int := 0;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(learning_objectives,'[]'::jsonb)) >= 2),
    COUNT(*) FILTER (WHERE estimated_duration_min IS NOT NULL AND estimated_duration_min > 0),
    COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(module_references,'[]'::jsonb)) >= 2),
    COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(activities,'[]'::jsonb)) >= 1),
    COUNT(*) FILTER (WHERE COALESCE(content_char_count,0) >= 1500)
  INTO v_total, v_with_objectives, v_with_duration, v_with_references, v_with_activities, v_content_rich
  FROM public.course_modules
  WHERE course_id = p_course_id;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('total_modules',0,'score',0,'reasons', jsonb_build_array('no_modules'));
  END IF;

  v_score := LEAST(100, (
    (v_with_objectives  * 20 / v_total) +
    (v_with_duration    * 10 / v_total) +
    (v_with_references  * 20 / v_total) +
    (v_with_activities  * 15 / v_total) +
    (v_content_rich     * 35 / v_total)
  ));

  RETURN jsonb_build_object(
    'total_modules', v_total,
    'with_objectives', v_with_objectives,
    'with_duration', v_with_duration,
    'with_references', v_with_references,
    'with_activities', v_with_activities,
    'content_rich', v_content_rich,
    'score', v_score
  );
END;
$$;

-- 3b. Assessment rigor score (0-100)
CREATE OR REPLACE FUNCTION public.assessment_rigor_score(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int := 0;
  v_distinct_types int := 0;
  v_has_project boolean := false;
  v_has_quiz boolean := false;
  v_has_capstone boolean := false;
  v_score int := 0;
BEGIN
  SELECT
    COUNT(*),
    COUNT(DISTINCT type),
    bool_or(type = 'project' OR title ILIKE '%project%'),
    bool_or(type = 'quiz' OR title ILIKE '%quiz%'),
    bool_or(title ILIKE '%capstone%' OR title ILIKE '%thesis%' OR title ILIKE '%dissertation%')
  INTO v_total, v_distinct_types, v_has_project, v_has_quiz, v_has_capstone
  FROM public.assignments
  WHERE course_id = p_course_id;

  v_score := LEAST(100,
    (LEAST(v_total,5) * 10) +
    (v_distinct_types * 10) +
    (CASE WHEN v_has_project THEN 15 ELSE 0 END) +
    (CASE WHEN v_has_quiz THEN 10 ELSE 0 END) +
    (CASE WHEN v_has_capstone THEN 25 ELSE 0 END)
  );

  RETURN jsonb_build_object(
    'total_assessments', v_total,
    'distinct_types', v_distinct_types,
    'has_project', v_has_project,
    'has_quiz', v_has_quiz,
    'has_capstone', v_has_capstone,
    'score', v_score
  );
END;
$$;

-- 3c. Program-level curriculum depth score with tier gate
CREATE OR REPLACE FUNCTION public.curriculum_depth_score(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level text;
  v_course_count int := 0;
  v_total_modules int := 0;
  v_outcomes int := 0;
  v_assess_diversity int := 0;
  v_practicum boolean := false;
  v_research boolean := false;
  v_faculty_reviewed int := 0;
  v_instructional_hours numeric := 0;
  v_seq_score int := 0;
  v_total int := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_passed boolean := false;
  v_min_courses int;
  v_min_modules_per_course int;
  v_required_features text[];
BEGIN
  SELECT lower(COALESCE(level,'')) INTO v_level FROM public.degree_programs WHERE id = p_program_id;
  IF v_level IS NULL THEN
    RETURN jsonb_build_object('error','program_not_found');
  END IF;

  SELECT COUNT(*) INTO v_course_count
  FROM public.degree_program_courses WHERE degree_program_id = p_program_id;

  SELECT COUNT(*) INTO v_total_modules
  FROM public.course_modules cm
  JOIN public.degree_program_courses dpc ON dpc.course_id = cm.course_id
  WHERE dpc.degree_program_id = p_program_id;

  SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.learning_outcomes,'[]'::jsonb))),0)
  INTO v_outcomes
  FROM public.courses c
  JOIN public.degree_program_courses dpc ON dpc.course_id = c.id
  WHERE dpc.degree_program_id = p_program_id;

  SELECT COUNT(DISTINCT a.type) INTO v_assess_diversity
  FROM public.assignments a
  JOIN public.degree_program_courses dpc ON dpc.course_id = a.course_id
  WHERE dpc.degree_program_id = p_program_id;

  SELECT bool_or(c.title ILIKE '%practic%' OR c.title ILIKE '%intern%' OR c.title ILIKE '%field%')
  INTO v_practicum
  FROM public.courses c
  JOIN public.degree_program_courses dpc ON dpc.course_id = c.id
  WHERE dpc.degree_program_id = p_program_id;

  SELECT bool_or(c.title ILIKE '%research%' OR c.title ILIKE '%thesis%' OR c.title ILIKE '%dissertation%' OR c.title ILIKE '%capstone%')
  INTO v_research
  FROM public.courses c
  JOIN public.degree_program_courses dpc ON dpc.course_id = c.id
  WHERE dpc.degree_program_id = p_program_id;

  SELECT COUNT(*) INTO v_faculty_reviewed
  FROM public.courses c
  JOIN public.degree_program_courses dpc ON dpc.course_id = c.id
  WHERE dpc.degree_program_id = p_program_id
    AND c.reviewed_by IS NOT NULL;

  SELECT COALESCE(SUM(c.credit_hours),0) INTO v_instructional_hours
  FROM public.courses c
  JOIN public.degree_program_courses dpc ON dpc.course_id = c.id
  WHERE dpc.degree_program_id = p_program_id;

  SELECT COUNT(*) INTO v_seq_score
  FROM public.degree_program_courses
  WHERE degree_program_id = p_program_id AND sequence_order IS NOT NULL;

  -- Tier gates
  IF v_level LIKE '%certificate%' OR v_level LIKE '%cert%' THEN
    v_min_courses := 4; v_min_modules_per_course := 2;
    v_required_features := ARRAY['capstone_or_project'];
  ELSIF v_level LIKE '%bachelor%' OR v_level = 'undergraduate' THEN
    v_min_courses := 30; v_min_modules_per_course := 4;
    v_required_features := ARRAY['research_methods','ethics','practicum','capstone','sequencing'];
  ELSIF v_level LIKE '%master%' OR v_level = 'graduate' THEN
    v_min_courses := 10; v_min_modules_per_course := 4;
    v_required_features := ARRAY['thesis_or_capstone','advanced_methods','ethics','assessment_diversity'];
  ELSIF v_level LIKE '%doctor%' OR v_level LIKE '%phd%' OR v_level LIKE '%dphil%' THEN
    v_min_courses := 6; v_min_modules_per_course := 4;
    v_required_features := ARRAY['dissertation','methodology_sequence','supervisor'];
  ELSE
    v_min_courses := 4; v_min_modules_per_course := 2;
    v_required_features := ARRAY['capstone_or_project'];
  END IF;

  -- Gate evaluation
  IF v_course_count < v_min_courses THEN
    v_reasons := v_reasons || jsonb_build_array(
      format('needs_%s_courses_has_%s', v_min_courses, v_course_count));
  END IF;

  IF v_course_count > 0 AND (v_total_modules::numeric / v_course_count) < v_min_modules_per_course THEN
    v_reasons := v_reasons || jsonb_build_array(
      format('needs_avg_%s_modules_per_course', v_min_modules_per_course));
  END IF;

  IF 'capstone_or_project' = ANY(v_required_features)
     OR 'thesis_or_capstone' = ANY(v_required_features)
     OR 'dissertation' = ANY(v_required_features)
     OR 'capstone' = ANY(v_required_features) THEN
    IF NOT v_research THEN
      v_reasons := v_reasons || jsonb_build_array('missing_capstone_thesis_or_dissertation');
    END IF;
  END IF;

  IF 'practicum' = ANY(v_required_features) AND NOT v_practicum THEN
    v_reasons := v_reasons || jsonb_build_array('missing_practicum');
  END IF;

  IF 'assessment_diversity' = ANY(v_required_features) AND v_assess_diversity < 3 THEN
    v_reasons := v_reasons || jsonb_build_array('needs_3_assessment_types');
  END IF;

  IF 'sequencing' = ANY(v_required_features) AND v_seq_score < v_min_courses THEN
    v_reasons := v_reasons || jsonb_build_array('missing_course_sequencing');
  END IF;

  v_passed := (jsonb_array_length(v_reasons) = 0);

  -- Composite score
  v_total := LEAST(100, (
    (LEAST(v_course_count, v_min_courses) * 100 / GREATEST(v_min_courses,1)) / 4 +
    (CASE WHEN v_course_count = 0 THEN 0
          ELSE LEAST(100, (v_total_modules * 100 / (v_course_count * v_min_modules_per_course))) / 4 END) +
    (LEAST(v_assess_diversity, 4) * 5) +
    (CASE WHEN v_practicum THEN 5 ELSE 0 END) +
    (CASE WHEN v_research THEN 10 ELSE 0 END) +
    (CASE WHEN v_course_count = 0 THEN 0
          ELSE LEAST(20, v_faculty_reviewed * 20 / v_course_count) END)
  ));

  -- Cache
  INSERT INTO public.curriculum_depth_scores AS d (
    program_id, module_count, outcomes_count, reference_density,
    assessment_diversity, has_practicum, has_research,
    faculty_reviewed_courses, instructional_hours, sequencing_score,
    total_score, gate_passed, gate_reasons, computed_at
  ) VALUES (
    p_program_id, v_total_modules, v_outcomes, 0,
    v_assess_diversity, v_practicum, v_research,
    v_faculty_reviewed, v_instructional_hours, v_seq_score,
    v_total, v_passed, v_reasons, now()
  )
  ON CONFLICT (program_id) DO UPDATE SET
    module_count = EXCLUDED.module_count,
    outcomes_count = EXCLUDED.outcomes_count,
    assessment_diversity = EXCLUDED.assessment_diversity,
    has_practicum = EXCLUDED.has_practicum,
    has_research = EXCLUDED.has_research,
    faculty_reviewed_courses = EXCLUDED.faculty_reviewed_courses,
    instructional_hours = EXCLUDED.instructional_hours,
    sequencing_score = EXCLUDED.sequencing_score,
    total_score = EXCLUDED.total_score,
    gate_passed = EXCLUDED.gate_passed,
    gate_reasons = EXCLUDED.gate_reasons,
    computed_at = now();

  RETURN jsonb_build_object(
    'program_id', p_program_id,
    'level', v_level,
    'course_count', v_course_count,
    'total_modules', v_total_modules,
    'outcomes_count', v_outcomes,
    'assessment_diversity', v_assess_diversity,
    'has_practicum', v_practicum,
    'has_research', v_research,
    'faculty_reviewed', v_faculty_reviewed,
    'instructional_hours', v_instructional_hours,
    'total_score', v_total,
    'gate_passed', v_passed,
    'gate_reasons', v_reasons
  );
END;
$$;

-- 4. Publication gate trigger on degree_programs
CREATE OR REPLACE FUNCTION public.enforce_program_depth_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depth jsonb;
  v_actor_is_admin boolean;
BEGIN
  -- Only evaluate when promoting to public/external
  IF NEW.lifecycle_status IS DISTINCT FROM 'active_public'
     AND COALESCE(NEW.is_external_facing,false) = false THEN
    RETURN NEW;
  END IF;

  -- Skip if no transition into a public state
  IF TG_OP = 'UPDATE'
     AND OLD.lifecycle_status = NEW.lifecycle_status
     AND COALESCE(OLD.is_external_facing,false) = COALESCE(NEW.is_external_facing,false) THEN
    RETURN NEW;
  END IF;

  v_actor_is_admin := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin');

  v_depth := public.curriculum_depth_score(NEW.id);

  IF (v_depth->>'gate_passed')::boolean = false AND NOT v_actor_is_admin THEN
    RAISE EXCEPTION 'Curriculum depth gate failed for program %: %', NEW.id, v_depth->'gate_reasons'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Always log
  PERFORM public.log_quality_action(
    'program_publication_gate',
    'degree_program',
    NEW.id,
    jsonb_build_object('lifecycle_status', OLD.lifecycle_status, 'external', OLD.is_external_facing),
    jsonb_build_object('lifecycle_status', NEW.lifecycle_status, 'external', NEW.is_external_facing, 'depth', v_depth),
    CASE WHEN (v_depth->>'gate_passed')::boolean THEN 'depth_gate_passed'
         ELSE 'depth_gate_overridden_by_admin' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_program_depth_gate ON public.degree_programs;
CREATE TRIGGER trg_enforce_program_depth_gate
  BEFORE INSERT OR UPDATE OF lifecycle_status, is_external_facing
  ON public.degree_programs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_program_depth_gate();

-- 5. Module quality_verified guard
CREATE OR REPLACE FUNCTION public.enforce_module_authoring_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_is_admin boolean;
BEGIN
  IF COALESCE(NEW.quality_verified,false) = false THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.quality_verified,false) = true THEN
    RETURN NEW;
  END IF;

  v_actor_is_admin := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin');

  IF jsonb_array_length(COALESCE(NEW.learning_objectives,'[]'::jsonb)) < 2
     OR NEW.estimated_duration_min IS NULL OR NEW.estimated_duration_min <= 0
     OR jsonb_array_length(COALESCE(NEW.module_references,'[]'::jsonb)) < 2
     OR jsonb_array_length(COALESCE(NEW.activities,'[]'::jsonb)) < 1
     OR COALESCE(NEW.content_char_count,0) < 1500
  THEN
    IF NOT v_actor_is_admin THEN
      RAISE EXCEPTION 'Module % cannot be verified: requires >=2 learning objectives, duration, >=2 references, >=1 activity, and >=1500 chars of content', NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_module_authoring_gate ON public.course_modules;
CREATE TRIGGER trg_enforce_module_authoring_gate
  BEFORE INSERT OR UPDATE OF quality_verified
  ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_module_authoring_gate();
