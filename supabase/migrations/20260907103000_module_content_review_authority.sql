-- ScrollUniversity module-content authority boundary.
--
-- Goals:
--   * every substantive module-content change is versioned immutably;
--   * AI generation records provenance and never self-publishes;
--   * any content change returns the module to draft and clears verified state;
--   * assigned faculty may review; publication requires institutional admin authority;
--   * course teaching-readiness counts only published + quality-verified modules.

ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS content_review_state text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS content_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS content_model text,
  ADD COLUMN IF NOT EXISTS content_prompt_hash text,
  ADD COLUMN IF NOT EXISTS content_generated_by uuid,
  ADD COLUMN IF NOT EXISTS content_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_changed_by uuid,
  ADD COLUMN IF NOT EXISTS content_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS content_reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_modules'::regclass
      AND conname = 'course_modules_content_review_state_chk'
  ) THEN
    ALTER TABLE public.course_modules
      ADD CONSTRAINT course_modules_content_review_state_chk
      CHECK (content_review_state IN ('draft','faculty_reviewed','published','retired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_modules'::regclass
      AND conname = 'course_modules_content_revision_chk'
  ) THEN
    ALTER TABLE public.course_modules
      ADD CONSTRAINT course_modules_content_revision_chk
      CHECK (content_revision >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.course_modules'::regclass
      AND conname = 'course_modules_content_source_chk'
  ) THEN
    ALTER TABLE public.course_modules
      ADD CONSTRAINT course_modules_content_source_chk
      CHECK (content_source IN ('legacy','human_edit','ai_generated','imported','migration'));
  END IF;
END $$;

-- Reconcile the pre-existing general content-review table because some clean
-- historical bootstraps do not successfully apply its original migration.
CREATE TABLE IF NOT EXISTS public.content_quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL,
  reviewer_id uuid,
  review_type text NOT NULL DEFAULT 'manual',
  quality_score numeric,
  review_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text,
  issues_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_quality_reviews
  ADD COLUMN IF NOT EXISTS module_version_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_revision integer;

CREATE TABLE IF NOT EXISTS public.module_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 1),
  content_md text NOT NULL,
  content_hash text NOT NULL,
  source text NOT NULL DEFAULT 'legacy',
  model text,
  prompt_hash text,
  generated_by uuid,
  generated_at timestamptz,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, revision)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.content_quality_reviews'::regclass
      AND conname = 'content_quality_reviews_module_version_fk'
  ) THEN
    ALTER TABLE public.content_quality_reviews
      ADD CONSTRAINT content_quality_reviews_module_version_fk
      FOREIGN KEY (module_version_id)
      REFERENCES public.module_content_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS module_content_versions_module_revision_idx
  ON public.module_content_versions(module_id, revision DESC);
CREATE INDEX IF NOT EXISTS content_quality_reviews_module_version_idx
  ON public.content_quality_reviews(module_version_id, created_at DESC)
  WHERE module_version_id IS NOT NULL;

-- Capture the current body as revision 1 (or the pre-existing revision value)
-- before future changes begin advancing the immutable history.
INSERT INTO public.module_content_versions (
  module_id, revision, content_md, content_hash, source, model, prompt_hash,
  generated_by, generated_at, changed_by
)
SELECT
  m.id,
  GREATEST(COALESCE(m.content_revision, 1), 1),
  m.content_md,
  encode(digest(m.content_md, 'sha256'), 'hex'),
  COALESCE(NULLIF(m.content_source, ''), CASE WHEN COALESCE(m.ai_generated, false) THEN 'ai_generated' ELSE 'legacy' END),
  m.content_model,
  m.content_prompt_hash,
  m.content_generated_by,
  m.content_generated_at,
  m.content_changed_by
FROM public.course_modules m
WHERE NULLIF(m.content_md, '') IS NOT NULL
ON CONFLICT (module_id, revision) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_author_module_content(
  p_user_id uuid,
  p_module_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p_user_id
        AND ur.role::text IN ('admin','superadmin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_modules m
      JOIN public.faculty_teaching_assignments fta
        ON fta.course_id = m.course_id
      WHERE m.id = p_module_id
        AND fta.faculty_user_id = p_user_id
        AND fta.state::text = 'active'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_publish_module_content(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role::text IN ('admin','superadmin')
  ), false);
$$;

REVOKE ALL ON FUNCTION public.can_author_module_content(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_publish_module_content(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_author_module_content(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_publish_module_content(uuid) TO service_role;

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
    -- Direct authenticated writes must come from an institutional admin or an
    -- actively assigned faculty member. service_role automation has no auth.uid
    -- and is separately constrained by the trusted Edge boundary.
    IF v_actor IS NOT NULL
       AND NOT public.can_author_module_content(v_actor, OLD.id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'module_content_write_forbidden';
    END IF;

    NEW.content_revision := GREATEST(COALESCE(OLD.content_revision, 1), 1) + 1;
    NEW.content_review_state := 'draft';
    NEW.content_reviewed_by := NULL;
    NEW.content_reviewed_at := NULL;
    NEW.quality_verified := false;
    NEW.content_changed_by := COALESCE(NEW.content_changed_by, v_actor);

    IF NEW.content_source IS NULL OR NEW.content_source = OLD.content_source THEN
      NEW.content_source := CASE
        WHEN COALESCE(NEW.ai_generated, false) THEN 'ai_generated'
        ELSE 'human_edit'
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_module_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content_md IS DISTINCT FROM OLD.content_md
     AND NULLIF(NEW.content_md, '') IS NOT NULL THEN
    INSERT INTO public.module_content_versions (
      module_id, revision, content_md, content_hash, source, model, prompt_hash,
      generated_by, generated_at, changed_by
    ) VALUES (
      NEW.id,
      NEW.content_revision,
      NEW.content_md,
      encode(digest(NEW.content_md, 'sha256'), 'hex'),
      COALESCE(NEW.content_source, 'human_edit'),
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

DROP TRIGGER IF EXISTS zz_course_modules_content_authority ON public.course_modules;
CREATE TRIGGER zz_course_modules_content_authority
BEFORE UPDATE OF content_md
ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.enforce_module_content_change_authority();

DROP TRIGGER IF EXISTS zz_course_modules_content_snapshot ON public.course_modules;
CREATE TRIGGER zz_course_modules_content_snapshot
AFTER UPDATE OF content_md
ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_module_content_version();

CREATE OR REPLACE FUNCTION public.module_content_versions_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'module_content_versions_are_immutable';
END;
$$;

DROP TRIGGER IF EXISTS module_content_versions_no_update_delete ON public.module_content_versions;
CREATE TRIGGER module_content_versions_no_update_delete
BEFORE UPDATE OR DELETE ON public.module_content_versions
FOR EACH ROW
EXECUTE FUNCTION public.module_content_versions_immutable();

ALTER TABLE public.module_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_quality_reviews ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.module_content_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.module_content_versions TO authenticated;

DROP POLICY IF EXISTS "Academic staff read module versions" ON public.module_content_versions;
CREATE POLICY "Academic staff read module versions"
  ON public.module_content_versions
  FOR SELECT TO authenticated
  USING (public.can_author_module_content(auth.uid(), module_id));

-- Preserve direct non-module review behavior, but module publication evidence
-- must now flow through the server-authoritative review RPC below.
DROP POLICY IF EXISTS "Reviewers can create reviews" ON public.content_quality_reviews;
DROP POLICY IF EXISTS "Reviewers can create non-module reviews" ON public.content_quality_reviews;
CREATE POLICY "Reviewers can create non-module reviews"
  ON public.content_quality_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND content_type <> 'module');

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
    content_id, content_type, reviewer_id, review_type, quality_score,
    feedback, status, reviewed_at, module_version_id, reviewed_revision
  ) VALUES (
    p_module_id, 'module', v_actor, 'expert_review', p_quality_score,
    p_feedback, v_status, now(), v_version_id, v_module.content_revision
  );

  UPDATE public.course_modules
  SET content_review_state = CASE
        WHEN p_decision = 'approve' THEN 'faculty_reviewed'
        ELSE 'draft'
      END,
      content_reviewed_by = CASE WHEN p_decision = 'approve' THEN v_actor ELSE NULL END,
      content_reviewed_at = CASE WHEN p_decision = 'approve' THEN now() ELSE NULL END,
      quality_verified = false
  WHERE id = p_module_id;

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
      AND (v_module.content_changed_by IS NULL OR qr.reviewer_id IS DISTINCT FROM v_module.content_changed_by)
  ) INTO v_has_independent_approval;

  IF NOT v_has_independent_approval THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'independent_module_review_required';
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

  UPDATE public.course_modules
  SET content_review_state = 'published',
      content_reviewed_by = v_actor,
      content_reviewed_at = now(),
      quality_issues = v_issues,
      quality_verified = true
  WHERE id = p_module_id;

  RETURN jsonb_build_object(
    'module_id', p_module_id,
    'revision', v_module.content_revision,
    'review_state', 'published',
    'quality_verified', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_module_content(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_module_content(uuid) TO authenticated;

-- Tighten course teaching-readiness: only published module bodies can satisfy
-- the verified-module requirement. Existing unreviewed material therefore
-- remains catalogue/development content until review and publication occur.
CREATE OR REPLACE FUNCTION public.course_teaching_readiness(p_course_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH course_row AS (
  SELECT c.id, c.curriculum_status::text AS curriculum_status
  FROM public.courses c
  WHERE c.id = p_course_id
),
module_stats AS (
  SELECT
    count(*)::int AS modules_total,
    count(*) FILTER (
      WHERE COALESCE(m.quality_verified, false)
        AND m.content_review_state = 'published'
    )::int AS modules_verified
  FROM public.course_modules m
  WHERE m.course_id = p_course_id
),
outcome_stats AS (
  SELECT count(*)::int AS outcomes_total
  FROM public.course_learning_outcomes clo
  WHERE clo.course_id = p_course_id
),
assessment_stats AS (
  SELECT (
    (SELECT count(*) FROM public.assessments a
      JOIN public.course_modules m ON m.id = a.module_id
      WHERE m.course_id = p_course_id)
    +
    (SELECT count(*) FROM public.assignments a
      JOIN public.course_modules m ON m.id = a.module_id
      WHERE m.course_id = p_course_id)
    +
    (SELECT count(*) FROM public.quizzes q
      JOIN public.course_modules m ON m.id = q.module_id
      WHERE m.course_id = p_course_id)
  )::int AS assessment_artifacts
),
resource_stats AS (
  SELECT (
    (SELECT count(*) FROM public.course_resources r WHERE r.course_id = p_course_id)
    +
    (SELECT count(*) FROM public.course_materials cm
      JOIN public.course_modules m ON m.id = cm.module_id
      WHERE m.course_id = p_course_id)
    +
    (SELECT count(*) FROM public.lectures l
      JOIN public.course_modules m ON m.id = l.module_id
      WHERE m.course_id = p_course_id
        AND (
          NULLIF(btrim(COALESCE(l.video_url, '')), '') IS NOT NULL
          OR NULLIF(btrim(COALESCE(l.transcript, '')), '') IS NOT NULL
        ))
  )::int AS learning_resources
),
section_stats AS (
  SELECT
    count(*) FILTER (
      WHERE COALESCE(cs.active, false)
        AND COALESCE(cs.section_status, 'open') <> 'cancelled'
    )::int AS scheduled_sections,
    count(*) FILTER (
      WHERE COALESCE(cs.active, false)
        AND cs.section_status = 'open'
        AND cs.instructor_user_id IS NOT NULL
    )::int AS open_staffed_sections
  FROM public.course_sections cs
  WHERE cs.course_id = p_course_id
),
facts AS (
  SELECT
    cr.id,
    COALESCE(cr.curriculum_status, 'pending_authorship') AS curriculum_status,
    ms.modules_total,
    ms.modules_verified,
    os.outcomes_total,
    ass.assessment_artifacts,
    rs.learning_resources,
    ss.scheduled_sections,
    ss.open_staffed_sections,
    (
      cr.id IS NOT NULL
      AND COALESCE(cr.curriculum_status, 'pending_authorship') = 'approved'
      AND ms.modules_total >= 3
      AND ms.modules_verified = ms.modules_total
      AND os.outcomes_total >= 3
      AND ass.assessment_artifacts >= 2
      AND rs.learning_resources >= 1
    ) AS content_ready
  FROM course_row cr
  CROSS JOIN module_stats ms
  CROSS JOIN outcome_stats os
  CROSS JOIN assessment_stats ass
  CROSS JOIN resource_stats rs
  CROSS JOIN section_stats ss
)
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM course_row) THEN
    jsonb_build_object(
      'course_id', p_course_id,
      'state', 'not_found',
      'content_ready', false,
      'blockers', jsonb_build_array('course_not_found')
    )
  ELSE (
    SELECT jsonb_build_object(
      'course_id', p_course_id,
      'state', CASE
        WHEN modules_total = 0 THEN 'shell'
        WHEN NOT content_ready THEN 'in_development'
        WHEN open_staffed_sections > 0 THEN 'enrollable'
        WHEN scheduled_sections > 0 THEN 'scheduled_blocked'
        ELSE 'teaching_ready'
      END,
      'content_ready', content_ready,
      'curriculum_status', curriculum_status,
      'modules_total', modules_total,
      'modules_verified', modules_verified,
      'outcomes_total', outcomes_total,
      'assessment_artifacts', assessment_artifacts,
      'learning_resources', learning_resources,
      'scheduled_sections', scheduled_sections,
      'open_staffed_sections', open_staffed_sections,
      'blockers', to_jsonb(array_remove(ARRAY[
        CASE WHEN curriculum_status <> 'approved' THEN 'curriculum_not_approved' END,
        CASE WHEN modules_total < 3 THEN 'insufficient_modules' END,
        CASE WHEN modules_total > 0 AND modules_verified <> modules_total THEN 'modules_not_published_and_verified' END,
        CASE WHEN outcomes_total < 3 THEN 'insufficient_learning_outcomes' END,
        CASE WHEN assessment_artifacts < 2 THEN 'insufficient_assessment_evidence' END,
        CASE WHEN learning_resources < 1 THEN 'learning_resources_missing' END,
        CASE WHEN content_ready AND scheduled_sections = 0 THEN 'no_scheduled_section' END,
        CASE WHEN content_ready AND scheduled_sections > 0 AND open_staffed_sections = 0 THEN 'no_open_staffed_section' END
      ]::text[], NULL))
    )
    FROM facts
  )
END;
$$;

COMMENT ON TABLE public.module_content_versions IS
  'Immutable snapshots of module learning content. Every content_md change creates a new revision; publication authority is evaluated against the current revision only.';
COMMENT ON COLUMN public.course_modules.content_review_state IS
  'Academic publication state. Any content_md change forces draft; only an independently reviewed, quality-passing revision may be published.';
