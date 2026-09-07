-- ScrollUniversity module-content authority hardening.
--
-- This migration closes four gaps in the initial content-authority layer:
--   1) newly inserted modules must receive an immutable revision-1 snapshot;
--   2) authenticated readers need a caller-bound RLS helper, not a spoofable id helper;
--   3) publication/review state cannot be changed by direct table UPDATEs;
--   4) immutable content history must not disappear through module cascade deletion.

CREATE OR REPLACE FUNCTION public.can_current_user_author_module_content(p_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.can_author_module_content(auth.uid(), p_module_id);
$$;

REVOKE ALL ON FUNCTION public.can_current_user_author_module_content(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_current_user_author_module_content(uuid)
  TO authenticated;

DROP POLICY IF EXISTS "Academic staff read module versions" ON public.module_content_versions;
CREATE POLICY "Academic staff read module versions"
  ON public.module_content_versions
  FOR SELECT TO authenticated
  USING (public.can_current_user_author_module_content(module_id));

-- An audit version must not be erased just because a module row is deleted.
-- Retiring a module is the supported lifecycle once version evidence exists.
DO $$
DECLARE
  v_fk text;
BEGIN
  SELECT c.conname INTO v_fk
  FROM pg_constraint c
  WHERE c.conrelid = 'public.module_content_versions'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'public.course_modules'::regclass
  ORDER BY c.oid
  LIMIT 1;

  IF v_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.module_content_versions DROP CONSTRAINT %I', v_fk);
  END IF;

  ALTER TABLE public.module_content_versions
    ADD CONSTRAINT module_content_versions_module_id_fkey
    FOREIGN KEY (module_id)
    REFERENCES public.course_modules(id)
    ON DELETE RESTRICT;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_new_module_content_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  NEW.content_revision := 1;
  NEW.content_review_state := 'draft';
  NEW.quality_verified := false;
  NEW.content_reviewed_by := NULL;
  NEW.content_reviewed_at := NULL;

  IF v_actor IS NOT NULL THEN
    -- Direct authenticated creation is a human-authored revision. A client
    -- cannot self-assert AI provenance or another person's authorship.
    NEW.content_changed_by := v_actor;
    NEW.content_source := 'human_edit';
    NEW.ai_generated := false;
    NEW.content_model := NULL;
    NEW.content_prompt_hash := NULL;
    NEW.content_generated_by := NULL;
    NEW.content_generated_at := NULL;
  ELSE
    NEW.content_source := COALESCE(
      NULLIF(NEW.content_source, ''),
      CASE WHEN COALESCE(NEW.ai_generated, false) THEN 'ai_generated' ELSE 'legacy' END
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_new_module_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(NEW.content_md, '') IS NOT NULL THEN
    INSERT INTO public.module_content_versions (
      module_id,
      revision,
      content_md,
      content_hash,
      source,
      model,
      prompt_hash,
      generated_by,
      generated_at,
      changed_by
    ) VALUES (
      NEW.id,
      1,
      NEW.content_md,
      encode(digest(NEW.content_md, 'sha256'), 'hex'),
      COALESCE(NULLIF(NEW.content_source, ''), 'legacy'),
      NEW.content_model,
      NEW.content_prompt_hash,
      NEW.content_generated_by,
      NEW.content_generated_at,
      NEW.content_changed_by
    )
    ON CONFLICT (module_id, revision) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aa_course_modules_new_content_authority ON public.course_modules;
CREATE TRIGGER aa_course_modules_new_content_authority
BEFORE INSERT ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.normalize_new_module_content_authority();

DROP TRIGGER IF EXISTS zz_course_modules_new_content_snapshot ON public.course_modules;
CREATE TRIGGER zz_course_modules_new_content_snapshot
AFTER INSERT ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_new_module_content_version();

-- Tighten update provenance. Authenticated human edits cannot preserve or
-- forge AI provenance from a previous revision. Trusted service-role AI tools
-- may supply provenance, but every content change still returns to draft.
CREATE OR REPLACE FUNCTION public.enforce_module_content_change_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NEW.content_md IS DISTINCT FROM OLD.content_md THEN
    IF v_actor IS NOT NULL
       AND NOT public.can_author_module_content(v_actor, OLD.id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'module_content_write_forbidden';
    END IF;

    NEW.content_revision := GREATEST(COALESCE(OLD.content_revision, 1), 1) + 1;
    NEW.content_review_state := 'draft';
    NEW.content_reviewed_by := NULL;
    NEW.content_reviewed_at := NULL;
    NEW.quality_verified := false;

    IF v_actor IS NOT NULL THEN
      NEW.content_changed_by := v_actor;
      NEW.content_source := 'human_edit';
      NEW.ai_generated := false;
      NEW.content_model := NULL;
      NEW.content_prompt_hash := NULL;
      NEW.content_generated_by := NULL;
      NEW.content_generated_at := NULL;
    ELSE
      NEW.content_source := COALESCE(
        NULLIF(NEW.content_source, ''),
        CASE WHEN COALESCE(NEW.ai_generated, false) THEN 'ai_generated' ELSE 'legacy' END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Protected publication/provenance fields may only be changed by the
-- server-authoritative review/publish functions, or as part of a content body
-- change whose values are normalized by the content-change trigger above.
CREATE OR REPLACE FUNCTION public.guard_module_content_authority_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted boolean := COALESCE(
    current_setting('scrolluniversity.content_authority_rpc', true),
    'off'
  ) = 'on';
BEGIN
  IF v_trusted THEN
    RETURN NEW;
  END IF;

  IF NEW.content_md IS DISTINCT FROM OLD.content_md THEN
    -- Prevent a caller from smuggling publication state alongside an edit.
    -- The later content-change trigger will calculate the new revision and
    -- force the correct draft state.
    NEW.content_revision := OLD.content_revision;
    NEW.content_review_state := OLD.content_review_state;
    NEW.quality_verified := OLD.quality_verified;
    NEW.quality_issues := OLD.quality_issues;
    NEW.content_reviewed_by := OLD.content_reviewed_by;
    NEW.content_reviewed_at := OLD.content_reviewed_at;
    RETURN NEW;
  END IF;

  IF NEW.content_revision IS DISTINCT FROM OLD.content_revision
     OR NEW.content_review_state IS DISTINCT FROM OLD.content_review_state
     OR NEW.quality_verified IS DISTINCT FROM OLD.quality_verified
     OR NEW.quality_issues IS DISTINCT FROM OLD.quality_issues
     OR NEW.content_reviewed_by IS DISTINCT FROM OLD.content_reviewed_by
     OR NEW.content_reviewed_at IS DISTINCT FROM OLD.content_reviewed_at
     OR NEW.content_source IS DISTINCT FROM OLD.content_source
     OR NEW.content_model IS DISTINCT FROM OLD.content_model
     OR NEW.content_prompt_hash IS DISTINCT FROM OLD.content_prompt_hash
     OR NEW.content_generated_by IS DISTINCT FROM OLD.content_generated_by
     OR NEW.content_generated_at IS DISTINCT FROM OLD.content_generated_at
     OR NEW.content_changed_by IS DISTINCT FROM OLD.content_changed_by
     OR NEW.ai_generated IS DISTINCT FROM OLD.ai_generated THEN
    -- Database-owner maintenance is still possible during controlled migrations.
    IF current_user NOT IN ('postgres', 'supabase_admin') THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'module_content_authority_state_write_forbidden';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ab_course_modules_authority_field_guard ON public.course_modules;
CREATE TRIGGER ab_course_modules_authority_field_guard
BEFORE UPDATE OF
  content_md,
  content_revision,
  content_review_state,
  quality_verified,
  quality_issues,
  content_reviewed_by,
  content_reviewed_at,
  content_source,
  content_model,
  content_prompt_hash,
  content_generated_by,
  content_generated_at,
  content_changed_by,
  ai_generated
ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.guard_module_content_authority_fields();

CREATE OR REPLACE FUNCTION public.review_module_content(
  p_module_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL,
  p_quality_score numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_module record;
  v_version_id uuid;
  v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  IF p_decision NOT IN ('approve','reject','revision_needed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_review_decision';
  END IF;

  IF p_quality_score IS NOT NULL AND (p_quality_score < 0 OR p_quality_score > 10) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_quality_score';
  END IF;

  IF NOT public.can_author_module_content(v_actor, p_module_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'module_review_forbidden';
  END IF;

  SELECT id, content_revision, content_changed_by
  INTO v_module
  FROM public.course_modules
  WHERE id = p_module_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'module_not_found';
  END IF;

  SELECT id INTO v_version_id
  FROM public.module_content_versions
  WHERE module_id = p_module_id
    AND revision = v_module.content_revision;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'current_module_version_missing';
  END IF;

  v_status := CASE p_decision
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    ELSE 'revision_needed'
  END;

  INSERT INTO public.content_quality_reviews (
    content_id,
    content_type,
    reviewer_id,
    review_type,
    quality_score,
    feedback,
    status,
    reviewed_at,
    module_version_id,
    reviewed_revision
  ) VALUES (
    p_module_id,
    'module',
    v_actor,
    'expert_review',
    p_quality_score,
    p_feedback,
    v_status,
    now(),
    v_version_id,
    v_module.content_revision
  );

  PERFORM set_config('scrolluniversity.content_authority_rpc', 'on', true);
  UPDATE public.course_modules
  SET content_review_state = CASE
        WHEN p_decision = 'approve' THEN 'faculty_reviewed'
        ELSE 'draft'
      END,
      content_reviewed_by = CASE WHEN p_decision = 'approve' THEN v_actor ELSE NULL END,
      content_reviewed_at = CASE WHEN p_decision = 'approve' THEN now() ELSE NULL END,
      quality_verified = false
  WHERE id = p_module_id;
  PERFORM set_config('scrolluniversity.content_authority_rpc', 'off', true);

  RETURN jsonb_build_object(
    'module_id', p_module_id,
    'revision', v_module.content_revision,
    'decision', p_decision,
    'review_state', CASE WHEN p_decision = 'approve' THEN 'faculty_reviewed' ELSE 'draft' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_module_content(p_module_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_module record;
  v_version_id uuid;
  v_has_independent_approval boolean := false;
  v_issues text[] := ARRAY[]::text[];
BEGIN
  IF v_actor IS NULL OR NOT public.can_publish_module_content(v_actor) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'module_publish_forbidden';
  END IF;

  SELECT id, content_revision, content_changed_by, content_review_state
  INTO v_module
  FROM public.course_modules
  WHERE id = p_module_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'module_not_found';
  END IF;

  IF v_module.content_review_state <> 'faculty_reviewed' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'faculty_review_required';
  END IF;

  SELECT id INTO v_version_id
  FROM public.module_content_versions
  WHERE module_id = p_module_id
    AND revision = v_module.content_revision;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'current_module_version_missing';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.content_quality_reviews qr
    WHERE qr.module_version_id = v_version_id
      AND qr.content_type = 'module'
      AND qr.status = 'approved'
      AND (v_module.content_changed_by IS NULL
           OR qr.reviewer_id IS DISTINCT FROM v_module.content_changed_by)
  ) INTO v_has_independent_approval;

  IF NOT v_has_independent_approval THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'independent_module_review_required';
  END IF;

  IF to_regprocedure('public.evaluate_module_quality(uuid)') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'module_quality_evaluator_missing';
  END IF;

  v_issues := public.evaluate_module_quality(p_module_id);
  IF COALESCE(cardinality(v_issues), 0) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'module_quality_gate_failed',
      DETAIL = to_jsonb(v_issues)::text;
  END IF;

  PERFORM set_config('scrolluniversity.content_authority_rpc', 'on', true);
  UPDATE public.course_modules
  SET content_review_state = 'published',
      content_reviewed_by = v_actor,
      content_reviewed_at = now(),
      quality_issues = v_issues,
      quality_verified = true
  WHERE id = p_module_id;
  PERFORM set_config('scrolluniversity.content_authority_rpc', 'off', true);

  RETURN jsonb_build_object(
    'module_id', p_module_id,
    'revision', v_module.content_revision,
    'review_state', 'published',
    'quality_verified', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_module_content(uuid, text, text, numeric)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_module_content(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_module_content(uuid, text, text, numeric)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_module_content(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.can_current_user_author_module_content(uuid) IS
  'Caller-bound RLS helper. It never accepts a caller-supplied user id.';
COMMENT ON FUNCTION public.guard_module_content_authority_fields() IS
  'Blocks direct publication/provenance-state writes; trusted review/publish RPCs use a transaction-local authority marker.';
