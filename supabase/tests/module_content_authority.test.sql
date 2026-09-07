\set ON_ERROR_STOP on

-- ScrollUniversity module-content authority regression suite.
-- Contract-focused so it remains reliable across historical schema drift while
-- still proving that no direct authenticated shortcut can replace the trusted
-- review/publish path.

DO $$
DECLARE
  v_count integer;
  v_relrowsecurity boolean;
  v_fk_delete "char";
  v_def text;
  v_policy text;
BEGIN
  IF to_regclass('public.module_content_versions') IS NULL THEN
    RAISE EXCEPTION 'module_content_versions table missing';
  END IF;

  SELECT c.relrowsecurity
  INTO v_relrowsecurity
  FROM pg_class c
  WHERE c.oid = 'public.module_content_versions'::regclass;

  IF NOT COALESCE(v_relrowsecurity, false) THEN
    RAISE EXCEPTION 'module_content_versions must have RLS enabled';
  END IF;

  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'course_modules'
    AND column_name IN (
      'content_review_state', 'content_revision', 'content_source',
      'content_model', 'content_prompt_hash', 'content_generated_by',
      'content_generated_at', 'content_changed_by', 'content_reviewed_by',
      'content_reviewed_at'
    );

  IF v_count <> 10 THEN
    RAISE EXCEPTION 'course_modules content-authority column contract incomplete: %/10', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.course_modules'::regclass
    AND NOT t.tgisinternal
    AND t.tgname IN (
      'aa_course_modules_new_content_authority',
      'zz_course_modules_new_content_snapshot',
      'ab_course_modules_authority_field_guard',
      'zz_course_modules_content_authority',
      'zz_course_modules_content_snapshot'
    );

  IF v_count <> 5 THEN
    RAISE EXCEPTION 'Expected five module content-authority triggers; found %', v_count;
  END IF;

  SELECT c.confdeltype INTO v_fk_delete
  FROM pg_constraint c
  WHERE c.conrelid = 'public.module_content_versions'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'public.course_modules'::regclass
  LIMIT 1;

  IF v_fk_delete IS DISTINCT FROM 'r'::"char" THEN
    RAISE EXCEPTION 'Module version history must use ON DELETE RESTRICT; confdeltype=%', v_fk_delete;
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.can_current_user_author_module_content(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated academic staff need caller-bound module-version RLS helper';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.can_author_module_content(uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated callers must not execute spoofable user-id authority helper';
  END IF;

  SELECT pg_get_functiondef('public.can_current_user_author_module_content(uuid)'::regprocedure)
  INTO v_def;
  IF position('auth.uid()' in v_def) = 0 THEN
    RAISE EXCEPTION 'Caller-bound content helper must bind authority to auth.uid()';
  END IF;

  SELECT pg_get_expr(p.polqual, p.polrelid)
  INTO v_policy
  FROM pg_policy p
  WHERE p.polrelid = 'public.module_content_versions'::regclass
    AND p.polname = 'Academic staff read module versions';

  IF v_policy IS NULL
     OR position('can_current_user_author_module_content' in v_policy) = 0 THEN
    RAISE EXCEPTION 'Module-version RLS must use caller-bound authority helper';
  END IF;

  SELECT pg_get_functiondef('public.guard_module_content_authority_fields()'::regprocedure)
  INTO v_def;
  IF position('module_content_authority_state_write_forbidden' in v_def) = 0
     OR position('scrolluniversity.content_authority_rpc' in v_def) = 0 THEN
    RAISE EXCEPTION 'Direct publication/provenance state guard is incomplete';
  END IF;

  SELECT pg_get_functiondef('public.review_module_content(uuid,text,text,numeric)'::regprocedure)
  INTO v_def;
  IF position('invalid_quality_score' in v_def) = 0
     OR position('module_version_id' in v_def) = 0
     OR position('scrolluniversity.content_authority_rpc' in v_def) = 0 THEN
    RAISE EXCEPTION 'Module review RPC lacks current-version, score, or trusted-state enforcement';
  END IF;

  SELECT pg_get_functiondef('public.publish_module_content(uuid)'::regprocedure)
  INTO v_def;
  IF position('faculty_review_required' in v_def) = 0
     OR position('independent_module_review_required' in v_def) = 0
     OR position('evaluate_module_quality' in v_def) = 0
     OR position('scrolluniversity.content_authority_rpc' in v_def) = 0 THEN
    RAISE EXCEPTION 'Module publication RPC lacks required independent/quality authority gates';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.review_module_content(uuid,text,text,numeric)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated',
    'public.publish_module_content(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated users must reach review/publish only through guarded RPCs';
  END IF;

  SELECT pg_get_functiondef('public.course_teaching_readiness(uuid)'::regprocedure)
  INTO v_def;
  IF position('content_review_state = ''published''' in v_def) = 0
     OR position('modules_not_published_and_verified' in v_def) = 0 THEN
    RAISE EXCEPTION 'Course readiness must trust only published + quality-verified modules';
  END IF;
END $$;

-- The immutable audit table must reject ordinary UPDATE/DELETE grants.
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.module_content_versions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.module_content_versions', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.module_content_versions', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated role must not mutate immutable module versions';
  END IF;
END $$;
