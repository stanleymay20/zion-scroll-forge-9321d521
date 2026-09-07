\set ON_ERROR_STOP on

DO $$
DECLARE
  missing jsonb;
  trigger_count integer;
  view_column_count integer;
BEGIN
  missing := public.course_teaching_readiness(gen_random_uuid());
  IF missing->>'state' <> 'not_found' OR COALESCE((missing->>'content_ready')::boolean, true) THEN
    RAISE EXCEPTION 'Missing-course readiness must fail closed: %', missing;
  END IF;

  SELECT count(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'section_enrollments'
    AND t.tgname = 'section_enrollment_requires_teaching_ready_course'
    AND NOT t.tgisinternal;

  IF trigger_count <> 1 THEN
    RAISE EXCEPTION 'Expected enrollment readiness trigger; found %', trigger_count;
  END IF;

  SELECT count(*) INTO view_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'v_course_teaching_readiness'
    AND column_name IN (
      'readiness_state', 'content_ready', 'modules_total', 'modules_verified',
      'outcomes_total', 'assessment_artifacts', 'learning_resources',
      'scheduled_sections', 'open_staffed_sections', 'blockers'
    );

  IF view_column_count <> 10 THEN
    RAISE EXCEPTION 'Course readiness view contract incomplete: %/10 columns present', view_column_count;
  END IF;

  IF position('curriculum_not_approved' in pg_get_functiondef('public.course_teaching_readiness(uuid)'::regprocedure)) = 0
     OR position('insufficient_assessment_evidence' in pg_get_functiondef('public.course_teaching_readiness(uuid)'::regprocedure)) = 0
     OR position('learning_resources_missing' in pg_get_functiondef('public.course_teaching_readiness(uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'Readiness function is missing required evidence blockers';
  END IF;
END $$;
