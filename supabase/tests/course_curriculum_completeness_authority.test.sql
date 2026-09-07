\set ON_ERROR_STOP on

DO $$
DECLARE
  v_def text;
  v_policy text;
  v_missing jsonb;
  v_trigger_count integer;
  v_security_definer boolean;
BEGIN
  -- The known 2026 title-templated CLO backfill is scaffold, not substantive
  -- human/course-specific outcome evidence.
  IF NOT public.is_generated_course_outcome_scaffold(
    'Algorithms',
    'Explain the foundational concepts, frameworks, and decision context of Algorithms with academic precision and Biblical worldview alignment.'
  ) THEN
    RAISE EXCEPTION 'Known generic CLO scaffold was not detected';
  END IF;

  IF public.is_generated_course_outcome_scaffold(
    'Algorithms',
    'Analyze the asymptotic complexity of comparison-based sorting algorithms and justify an implementation choice for a constrained system.'
  ) THEN
    RAISE EXCEPTION 'Substantive course-specific CLO was incorrectly classified as scaffold';
  END IF;

  v_missing := public.course_curriculum_completeness(gen_random_uuid());
  IF v_missing->>'state' <> 'not_found'
     OR COALESCE((v_missing->>'complete')::boolean, true) THEN
    RAISE EXCEPTION 'Missing-course curriculum completeness must fail closed: %', v_missing;
  END IF;

  SELECT pg_get_functiondef('public.can_author_course_curriculum(uuid,uuid)'::regprocedure)
  INTO v_def;
  IF position('faculty_teaching_assignments' in v_def) = 0
     OR position('state::text = ''active''' in v_def) = 0
     OR position('admin' in v_def) = 0
     OR position('superadmin' in v_def) = 0 THEN
    RAISE EXCEPTION 'Course author helper is not scoped to active assignments/admin authority';
  END IF;

  IF has_function_privilege('authenticated', 'public.can_author_course_curriculum(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.can_administer_course_curriculum(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Internal curriculum authority helpers must remain non-executable by authenticated';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.can_current_user_author_course_curriculum(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.can_current_user_administer_course_curriculum()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated-safe current-user curriculum authority wrappers are not executable';
  END IF;

  SELECT p.prosecdef
  INTO v_security_definer
  FROM pg_proc p
  WHERE p.oid = 'public.enforce_course_curriculum_state_authority()'::regprocedure;

  IF COALESCE(v_security_definer, true) THEN
    RAISE EXCEPTION 'Course state authority trigger must run as SECURITY INVOKER so current_user reflects the caller';
  END IF;

  SELECT pg_get_functiondef('public.enforce_course_curriculum_state_authority()'::regprocedure)
  INTO v_def;
  IF position('direct_course_review_state_change_forbidden' in v_def) = 0
     OR position('course_review_projection_is_guarded' in v_def) = 0
     OR position('public.can_current_user_author_course_curriculum' in v_def) = 0
     OR position('public.can_current_user_administer_course_curriculum' in v_def) = 0 THEN
    RAISE EXCEPTION 'Course state authority trigger is missing current-user wrapper or direct-state forgery blockers';
  END IF;

  IF position('public.can_author_course_curriculum(' in v_def) > 0
     OR position('public.can_administer_course_curriculum(' in v_def) > 0 THEN
    RAISE EXCEPTION 'SECURITY INVOKER trigger must not call restricted internal authority helpers directly';
  END IF;

  SELECT string_agg(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''), E'\n')
  INTO v_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'course_learning_outcomes'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF COALESCE(position('can_current_user_author_course_curriculum' in v_policy), 0) = 0 THEN
    RAISE EXCEPTION 'CLO writes are not course-scoped';
  END IF;

  SELECT string_agg(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''), E'\n')
  INTO v_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'courses'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF COALESCE(position('can_current_user_author_course_curriculum' in v_policy), 0) = 0
     OR COALESCE(position('can_current_user_administer_course_curriculum' in v_policy), 0) = 0 THEN
    RAISE EXCEPTION 'Course DML policies do not enforce scoped author/admin authority';
  END IF;

  IF has_table_privilege('authenticated', 'public.faculty_curriculum_reviews', 'INSERT')
     OR has_table_privilege('authenticated', 'public.faculty_curriculum_reviews', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.faculty_curriculum_reviews', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated users must not mutate faculty curriculum review rows directly';
  END IF;

  SELECT pg_get_functiondef('public.record_faculty_review(uuid,text,text)'::regprocedure)
  INTO v_def;
  IF position('can_author_course_curriculum' in v_def) = 0
     OR position('independent_course_review_required' in v_def) = 0
     OR position('faculty_review' in v_def) = 0
     OR position('v_prior_internal' in v_def) = 0 THEN
    RAISE EXCEPTION 'Faculty review RPC is missing assignment/independence/state/flag authority';
  END IF;

  SELECT pg_get_functiondef('public.approve_course_curriculum(uuid)'::regprocedure)
  INTO v_def;
  IF position('can_administer_course_curriculum' in v_def) = 0
     OR position('course_curriculum_completeness_gate_failed' in v_def) = 0
     OR position('curriculum_status = ''approved''' in v_def) = 0
     OR position('v_prior_internal' in v_def) = 0 THEN
    RAISE EXCEPTION 'Course approval RPC is not fail-closed institutional authority';
  END IF;

  SELECT pg_get_functiondef('public.course_curriculum_completeness(uuid)'::regprocedure)
  INTO v_def;
  IF position('is_generated_course_outcome_scaffold' in v_def) = 0
     OR position('count(clo.id)' in lower(v_def)) = 0
     OR position('insufficient_substantive_learning_outcomes' in v_def) = 0
     OR position('insufficient_required_readings' in v_def) = 0
     OR position('insufficient_course_assessment_evidence' in v_def) = 0
     OR position('independent_course_review_missing_or_stale' in v_def) = 0 THEN
    RAISE EXCEPTION 'Course completeness function is missing required zero-safe evidence blockers';
  END IF;

  SELECT pg_get_functiondef('public.course_teaching_readiness(uuid)'::regprocedure)
  INTO v_def;
  IF position('course_curriculum_completeness' in v_def) = 0
     OR position('course_curriculum_evidence_incomplete' in v_def) = 0
     OR position('content_review_state = ''published''' in v_def) = 0 THEN
    RAISE EXCEPTION 'Teaching readiness must require both course evidence and published module authority';
  END IF;

  SELECT count(*)
  INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND (
      (c.relname = 'courses' AND t.tgname = 'course_curriculum_state_authority')
      OR (c.relname = 'course_learning_outcomes' AND t.tgname = 'course_learning_outcomes_invalidate_course_review')
      OR (c.relname = 'course_evidence_requirements' AND t.tgname = 'course_evidence_invalidate_course_review')
    );

  IF v_trigger_count <> 3 THEN
    RAISE EXCEPTION 'Expected three course curriculum invalidation/authority triggers; found %', v_trigger_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'v_course_curriculum_completeness'
  ) THEN
    RAISE EXCEPTION 'Course curriculum completeness operational view is missing';
  END IF;
END $$;

-- Execute the public authority wrappers under the same database role used by a
-- browser Supabase session. This specifically catches privilege-chain failures
-- that function-definition introspection alone cannot detect.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000123","role":"authenticated"}',
  true
);
DO $$
BEGIN
  PERFORM public.can_current_user_administer_course_curriculum();
  PERFORM public.can_current_user_author_course_curriculum(gen_random_uuid());
END $$;
ROLLBACK;
