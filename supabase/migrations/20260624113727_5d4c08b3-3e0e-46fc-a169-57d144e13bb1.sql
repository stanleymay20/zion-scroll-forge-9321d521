
CREATE OR REPLACE FUNCTION public.trg_recompute_module_quality()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  qcount int := 0;
  qtagged int := 0;
  duplicate_count int := 0;
  flow_hits int := 0;
  issues text[] := ARRAY[]::text[];
  obj_text text;
BEGIN
  IF COALESCE(NEW.content_char_count, length(COALESCE(NEW.content_md,'')), 0) < 8000 THEN
    issues := array_append(issues, 'content_too_thin');
  END IF;

  IF NEW.content_md ILIKE '%ignition%' OR NEW.content_md ILIKE '%hook%' OR NEW.content_md ILIKE '%opening question%' THEN flow_hits := flow_hits + 1; END IF;
  IF NEW.content_md ILIKE '%demonstration%' OR NEW.content_md ILIKE '%worked example%' THEN flow_hits := flow_hits + 1; END IF;
  IF NEW.content_md ILIKE '%activation%' OR NEW.content_md ILIKE '%your turn%' OR NEW.content_md ILIKE '%try this%' THEN flow_hits := flow_hits + 1; END IF;
  IF NEW.content_md ILIKE '%reflect%' THEN flow_hits := flow_hits + 1; END IF;
  IF NEW.content_md ILIKE '%commission%' OR NEW.content_md ILIKE '%next step%' OR NEW.content_md ILIKE '%go and do%' THEN flow_hits := flow_hits + 1; END IF;
  IF NEW.content_md ILIKE '%scripture%' OR NEW.content_md ILIKE '%biblical%' THEN flow_hits := flow_hits + 1; END IF;
  IF flow_hits < 4 THEN issues := array_append(issues, 'flow_markers_missing'); END IF;

  obj_text := COALESCE(NEW.learning_objectives->>0, '');
  IF obj_text = '' THEN
    issues := array_append(issues, 'no_objectives');
  ELSE
    SELECT count(*) INTO duplicate_count
    FROM public.course_modules
    WHERE (learning_objectives->>0) = obj_text AND id <> NEW.id;
    IF duplicate_count > 5 THEN issues := array_append(issues, 'objective_templated'); END IF;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE learning_objective_id IS NOT NULL AND bloom_level IS NOT NULL)
    INTO qcount, qtagged
  FROM public.quiz_questions WHERE module_id = NEW.id;
  IF qcount < 5 THEN issues := array_append(issues, 'quiz_insufficient'); END IF;
  IF qcount > 0 AND qtagged < qcount THEN issues := array_append(issues, 'quiz_untagged'); END IF;

  IF NEW.tutor_context IS NULL OR length(NEW.tutor_context) < 200 THEN
    issues := array_append(issues, 'tutor_context_missing');
  END IF;

  IF cardinality(COALESCE(NEW.clo_ids,'{}')) = 0 THEN
    issues := array_append(issues, 'no_clo_mapping');
  END IF;

  IF NEW.reflective_prompt IS NULL OR length(NEW.reflective_prompt) < 80 THEN
    issues := array_append(issues, 'reflective_prompt_missing');
  END IF;

  IF jsonb_array_length(COALESCE(NEW.formative_checkpoints,'[]'::jsonb)) < 2 THEN
    issues := array_append(issues, 'formative_checkpoints_missing');
  END IF;

  NEW.quality_issues := issues;
  NEW.quality_verified := (cardinality(issues) = 0);
  RETURN NEW;
END $$;

-- Also re-add an AFTER INSERT OF quiz_questions trigger so quality reflects quiz changes
CREATE OR REPLACE FUNCTION public.trg_quiz_questions_touch_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  target_id := COALESCE(NEW.module_id, OLD.module_id);
  IF target_id IS NOT NULL THEN
    -- Touch the module so the BEFORE-UPDATE quality trigger fires.
    UPDATE public.course_modules SET content_char_count = content_char_count WHERE id = target_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quiz_questions_touch_module ON public.quiz_questions;
CREATE TRIGGER quiz_questions_touch_module
  AFTER INSERT OR DELETE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.trg_quiz_questions_touch_module();
