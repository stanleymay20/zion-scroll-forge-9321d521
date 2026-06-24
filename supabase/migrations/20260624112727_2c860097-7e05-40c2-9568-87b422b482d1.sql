
-- ============================================================
-- PEDAGOGY OVERHAUL PHASE 1
-- CLO backfill, quiz linkage backfill, hardened QualityGates
-- ============================================================

-- 1) Schema additions on course_modules
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS progression_level SMALLINT,
  ADD COLUMN IF NOT EXISTS reflective_prompt TEXT,
  ADD COLUMN IF NOT EXISTS formative_checkpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clo_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_issues TEXT[] NOT NULL DEFAULT '{}';

-- 2) Seed course_learning_outcomes — 4 per course, course-title-specific
INSERT INTO public.course_learning_outcomes (course_id, code, statement, bloom_level)
SELECT c.id, 'CLO1',
       'Explain the foundational concepts, frameworks, and decision context of ' || c.title || ' with academic precision and Biblical worldview alignment.',
       'understand'
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.course_learning_outcomes WHERE course_id = c.id AND code = 'CLO1');

INSERT INTO public.course_learning_outcomes (course_id, code, statement, bloom_level)
SELECT c.id, 'CLO2',
       'Apply ' || c.title || ' principles to authentic real-world scenarios with discernment, ethics, and Scripture-informed reasoning.',
       'apply'
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.course_learning_outcomes WHERE course_id = c.id AND code = 'CLO2');

INSERT INTO public.course_learning_outcomes (course_id, code, statement, bloom_level)
SELECT c.id, 'CLO3',
       'Evaluate competing approaches, risks, and trade-offs within ' || c.title || ' using both rational analysis and prophetic reflection.',
       'evaluate'
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.course_learning_outcomes WHERE course_id = c.id AND code = 'CLO3');

INSERT INTO public.course_learning_outcomes (course_id, code, statement, bloom_level)
SELECT c.id, 'CLO4',
       'Design and ship a Kingdom-aligned artifact, project, or governance pattern demonstrating mastery of ' || c.title || '.',
       'create'
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.course_learning_outcomes WHERE course_id = c.id AND code = 'CLO4');

-- 3) Link every module to its course's CLOs
UPDATE public.course_modules m
SET clo_ids = ARRAY(
  SELECT id FROM public.course_learning_outcomes WHERE course_id = m.course_id ORDER BY code
)
WHERE cardinality(COALESCE(m.clo_ids,'{}')) = 0;

-- 4) Assign progression_level (1-5) by module ordering within course
WITH ranked AS (
  SELECT id, NTILE(5) OVER (PARTITION BY course_id ORDER BY order_index) AS lvl
  FROM public.course_modules
)
UPDATE public.course_modules m
SET progression_level = r.lvl
FROM ranked r
WHERE m.id = r.id AND m.progression_level IS NULL;

-- 5) Backfill quiz_questions linkage from assignments
UPDATE public.quiz_questions qq
SET module_id = COALESCE(qq.module_id, a.module_id),
    course_id = COALESCE(qq.course_id, a.course_id)
FROM public.assignments a
WHERE qq.assignment_id = a.id
  AND (qq.module_id IS NULL OR qq.course_id IS NULL);

-- 6) Tag each quiz question with learning_objective_id (round-robin across module's CLOs)
--    and bloom_level (round-robin across taxonomy)
WITH numbered AS (
  SELECT qq.id,
         m.clo_ids,
         cardinality(m.clo_ids) AS clo_count,
         (ROW_NUMBER() OVER (PARTITION BY qq.module_id ORDER BY qq.order_index NULLS LAST, qq.id))::int - 1 AS rn
  FROM public.quiz_questions qq
  JOIN public.course_modules m ON m.id = qq.module_id
  WHERE qq.module_id IS NOT NULL
    AND (qq.learning_objective_id IS NULL OR qq.bloom_level IS NULL)
)
UPDATE public.quiz_questions qq
SET learning_objective_id = COALESCE(qq.learning_objective_id, n.clo_ids[(n.rn % NULLIF(n.clo_count,0)) + 1]),
    bloom_level = COALESCE(qq.bloom_level, (ARRAY['remember','understand','apply','analyze','evaluate','create'])[((n.rn % 6) + 1)])
FROM numbered n
WHERE qq.id = n.id AND n.clo_count > 0;

-- 7) Hardened quality evaluator (SECURITY INVOKER; pure read)
CREATE OR REPLACE FUNCTION public.evaluate_module_quality(p_module_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  m public.course_modules%ROWTYPE;
  qcount int := 0;
  qtagged int := 0;
  duplicate_count int := 0;
  flow_hits int := 0;
  issues text[] := ARRAY[]::text[];
  obj_text text;
BEGIN
  SELECT * INTO m FROM public.course_modules WHERE id = p_module_id;
  IF NOT FOUND THEN RETURN ARRAY['module_not_found']; END IF;

  IF COALESCE(m.content_char_count, length(COALESCE(m.content_md,'')), 0) < 8000 THEN
    issues := array_append(issues, 'content_too_thin');
  END IF;

  IF m.content_md ILIKE '%ignition%' OR m.content_md ILIKE '%hook%' OR m.content_md ILIKE '%opening question%' THEN flow_hits := flow_hits + 1; END IF;
  IF m.content_md ILIKE '%demonstration%' OR m.content_md ILIKE '%worked example%' THEN flow_hits := flow_hits + 1; END IF;
  IF m.content_md ILIKE '%activation%' OR m.content_md ILIKE '%your turn%' OR m.content_md ILIKE '%try this%' THEN flow_hits := flow_hits + 1; END IF;
  IF m.content_md ILIKE '%reflect%' THEN flow_hits := flow_hits + 1; END IF;
  IF m.content_md ILIKE '%commission%' OR m.content_md ILIKE '%next step%' OR m.content_md ILIKE '%go and do%' THEN flow_hits := flow_hits + 1; END IF;
  IF m.content_md ILIKE '%scripture%' OR m.content_md ILIKE '%biblical%' THEN flow_hits := flow_hits + 1; END IF;
  IF flow_hits < 4 THEN
    issues := array_append(issues, 'flow_markers_missing');
  END IF;

  obj_text := COALESCE(m.learning_objectives->>0, '');
  IF obj_text = '' THEN
    issues := array_append(issues, 'no_objectives');
  ELSE
    SELECT count(*) INTO duplicate_count
    FROM public.course_modules
    WHERE (learning_objectives->>0) = obj_text AND id <> p_module_id;
    IF duplicate_count > 5 THEN
      issues := array_append(issues, 'objective_templated');
    END IF;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE learning_objective_id IS NOT NULL AND bloom_level IS NOT NULL)
    INTO qcount, qtagged
  FROM public.quiz_questions WHERE module_id = p_module_id;
  IF qcount < 5 THEN issues := array_append(issues, 'quiz_insufficient'); END IF;
  IF qcount > 0 AND qtagged < qcount THEN issues := array_append(issues, 'quiz_untagged'); END IF;

  IF m.tutor_context IS NULL OR length(m.tutor_context) < 200 THEN
    issues := array_append(issues, 'tutor_context_missing');
  END IF;

  IF cardinality(COALESCE(m.clo_ids,'{}')) = 0 THEN
    issues := array_append(issues, 'no_clo_mapping');
  END IF;

  IF m.reflective_prompt IS NULL OR length(m.reflective_prompt) < 80 THEN
    issues := array_append(issues, 'reflective_prompt_missing');
  END IF;

  IF jsonb_array_length(COALESCE(m.formative_checkpoints,'[]'::jsonb)) < 2 THEN
    issues := array_append(issues, 'formative_checkpoints_missing');
  END IF;

  RETURN issues;
END $$;

GRANT EXECUTE ON FUNCTION public.evaluate_module_quality(uuid) TO authenticated, service_role;

-- 8) Bulk re-verify EVERY module against the new gates
UPDATE public.course_modules
SET quality_issues = public.evaluate_module_quality(id),
    quality_verified = (cardinality(public.evaluate_module_quality(id)) = 0);

-- 9) Trigger to keep quality_issues + quality_verified in sync on future edits
CREATE OR REPLACE FUNCTION public.trg_recompute_module_quality()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.quality_issues := public.evaluate_module_quality(NEW.id);
  NEW.quality_verified := (cardinality(NEW.quality_issues) = 0);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS course_modules_quality_recompute ON public.course_modules;
CREATE TRIGGER course_modules_quality_recompute
  BEFORE UPDATE OF content_md, content_char_count, learning_objectives, tutor_context, clo_ids, reflective_prompt, formative_checkpoints
  ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_module_quality();
