-- ScrollUniversity course-curriculum completeness + authority boundary.
--
-- This layer closes the gap between a catalogue/course shell and a genuinely
-- reviewable course. It reuses the native courses, course_learning_outcomes,
-- course_evidence_requirements, faculty_curriculum_reviews and teaching
-- assignment model; it does not create a parallel curriculum system.
--
-- Truth rules:
--   * title-templated CLOs seeded by the 2026 pedagogy backfill are scaffolds,
--     not evidence of substantive course-specific outcomes;
--   * faculty authorship is limited to an active teaching assignment (or an
--     institutional admin/superadmin);
--   * a fresh, independent curriculum review is required after every relevant
--     course/CLO/evidence edit;
--   * only institutional admin/superadmin may move a course to approved;
--   * teaching-readiness additionally requires this course-level evidence.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS faculty_author_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS course_curriculum_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS course_curriculum_changed_by uuid;

-- --------------------------------------------------------------------------
-- Known scaffold detector
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_generated_course_outcome_scaffold(
  p_course_title text,
  p_statement text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT btrim(COALESCE(p_statement, '')) IN (
    'Explain the foundational concepts, frameworks, and decision context of ' || COALESCE(p_course_title, '') || ' with academic precision and Biblical worldview alignment.',
    'Apply ' || COALESCE(p_course_title, '') || ' principles to authentic real-world scenarios with discernment, ethics, and Scripture-informed reasoning.',
    'Evaluate competing approaches, risks, and trade-offs within ' || COALESCE(p_course_title, '') || ' using both rational analysis and prophetic reflection.',
    'Design and ship a Kingdom-aligned artifact, project, or governance pattern demonstrating mastery of ' || COALESCE(p_course_title, '') || '.'
  );
$$;

REVOKE ALL ON FUNCTION public.is_generated_course_outcome_scaffold(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_generated_course_outcome_scaffold(text, text) TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Course-scoped author / institutional approval authority
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_author_course_curriculum(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL
    AND p_course_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.role::text IN ('admin', 'superadmin')
      )
      OR EXISTS (
        SELECT 1
        FROM public.faculty_teaching_assignments fta
        WHERE fta.course_id = p_course_id
          AND fta.faculty_user_id = p_user_id
          AND fta.state::text = 'active'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_administer_course_curriculum(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p_user_id
        AND ur.role::text IN ('admin', 'superadmin')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_current_user_author_course_curriculum(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_author_course_curriculum(auth.uid(), p_course_id);
$$;

CREATE OR REPLACE FUNCTION public.can_current_user_administer_course_curriculum()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_administer_course_curriculum(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.can_author_course_curriculum(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_administer_course_curriculum(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_author_course_curriculum(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_administer_course_curriculum(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.can_current_user_author_course_curriculum(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_current_user_administer_course_curriculum() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_current_user_author_course_curriculum(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_current_user_administer_course_curriculum() TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- Replace legacy global-faculty DML policies with course-scoped authority.
-- Existing SELECT policies are intentionally preserved.
-- --------------------------------------------------------------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses', p.policyname);
  END LOOP;
END $$;

CREATE POLICY course_curriculum_admin_insert
  ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (public.can_current_user_administer_course_curriculum());

CREATE POLICY course_curriculum_scoped_update
  ON public.courses
  FOR UPDATE TO authenticated
  USING (public.can_current_user_author_course_curriculum(id))
  WITH CHECK (public.can_current_user_author_course_curriculum(id));

CREATE POLICY course_curriculum_admin_delete
  ON public.courses
  FOR DELETE TO authenticated
  USING (public.can_current_user_administer_course_curriculum());

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_learning_outcomes'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_learning_outcomes', p.policyname);
  END LOOP;
END $$;

CREATE POLICY clo_course_scoped_insert
  ON public.course_learning_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_current_user_author_course_curriculum(course_id));

CREATE POLICY clo_course_scoped_update
  ON public.course_learning_outcomes
  FOR UPDATE TO authenticated
  USING (public.can_current_user_author_course_curriculum(course_id))
  WITH CHECK (public.can_current_user_author_course_curriculum(course_id));

CREATE POLICY clo_course_scoped_delete
  ON public.course_learning_outcomes
  FOR DELETE TO authenticated
  USING (public.can_current_user_author_course_curriculum(course_id));

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_evidence_requirements'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_evidence_requirements', p.policyname);
  END LOOP;
END $$;

CREATE POLICY course_evidence_scoped_insert
  ON public.course_evidence_requirements
  FOR INSERT TO authenticated
  WITH CHECK (public.can_current_user_author_course_curriculum(course_id));

CREATE POLICY course_evidence_scoped_update
  ON public.course_evidence_requirements
  FOR UPDATE TO authenticated
  USING (public.can_current_user_author_course_curriculum(course_id))
  WITH CHECK (public.can_current_user_author_course_curriculum(course_id));

CREATE POLICY course_evidence_scoped_delete
  ON public.course_evidence_requirements
  FOR DELETE TO authenticated
  USING (public.can_current_user_author_course_curriculum(course_id));

-- Faculty curriculum review rows are now written only through the guarded RPC.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'faculty_curriculum_reviews'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.faculty_curriculum_reviews', p.policyname);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.faculty_curriculum_reviews FROM anon, authenticated;

-- --------------------------------------------------------------------------
-- Invalidate stale course-level review whenever substantive curriculum changes.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_course_curriculum_changed(
  p_course_id uuid,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_course_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM set_config('app.course_curriculum_internal', 'on', true);

  UPDATE public.courses
  SET curriculum_status = 'authored',
      faculty_author_id = COALESCE(faculty_author_id, p_actor),
      reviewed_by = NULL,
      last_reviewed_at = NULL,
      course_curriculum_changed_at = now(),
      course_curriculum_changed_by = p_actor
  WHERE id = p_course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_course_curriculum_changed(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_course_curriculum_changed(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_course_curriculum_state_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_internal boolean := COALESCE(current_setting('app.course_curriculum_internal', true), '') = 'on';
  v_privileged_session boolean := current_user IN ('postgres', 'service_role', 'supabase_admin');
  v_metadata_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_internal AND NOT v_privileged_session THEN
      IF NOT public.can_administer_course_curriculum(v_actor) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_creation_requires_institution_admin';
      END IF;

      IF COALESCE(NEW.curriculum_status::text, 'pending_authorship') NOT IN ('pending_authorship', 'authored') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'direct_course_review_state_change_forbidden';
      END IF;

      NEW.faculty_author_id := COALESCE(NEW.faculty_author_id, v_actor);
      NEW.reviewed_by := NULL;
      NEW.last_reviewed_at := NULL;
      NEW.course_curriculum_changed_at := now();
      NEW.course_curriculum_changed_by := v_actor;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT v_internal AND NOT v_privileged_session THEN
    IF NOT public.can_author_course_curriculum(v_actor, OLD.id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_curriculum_authority_required';
    END IF;

    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at
       OR NEW.course_curriculum_changed_at IS DISTINCT FROM OLD.course_curriculum_changed_at
       OR NEW.course_curriculum_changed_by IS DISTINCT FROM OLD.course_curriculum_changed_by THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_review_projection_is_guarded';
    END IF;

    IF NEW.curriculum_status IS DISTINCT FROM OLD.curriculum_status
       AND NEW.curriculum_status::text IN ('faculty_review', 'accreditation_review', 'approved') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'direct_course_review_state_change_forbidden';
    END IF;

    IF NEW.faculty_author_id IS DISTINCT FROM OLD.faculty_author_id
       AND NOT public.can_administer_course_curriculum(v_actor) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_author_assignment_requires_institution_admin';
    END IF;
  END IF;

  v_metadata_changed :=
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.syllabus IS DISTINCT FROM OLD.syllabus
    OR NEW.faculty_author_id IS DISTINCT FROM OLD.faculty_author_id;

  IF v_metadata_changed AND NOT v_internal THEN
    NEW.curriculum_status := 'authored';
    NEW.faculty_author_id := COALESCE(NEW.faculty_author_id, OLD.faculty_author_id, v_actor);
    NEW.reviewed_by := NULL;
    NEW.last_reviewed_at := NULL;
    NEW.course_curriculum_changed_at := now();
    NEW.course_curriculum_changed_by := v_actor;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_course_curriculum_state_authority() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS course_curriculum_state_authority ON public.courses;
CREATE TRIGGER course_curriculum_state_authority
BEFORE INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_course_curriculum_state_authority();

CREATE OR REPLACE FUNCTION public.trg_mark_course_curriculum_dependency_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.mark_course_curriculum_changed(OLD.course_id, v_actor);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.course_id IS DISTINCT FROM OLD.course_id THEN
      PERFORM public.mark_course_curriculum_changed(OLD.course_id, v_actor);
    END IF;
    PERFORM public.mark_course_curriculum_changed(NEW.course_id, v_actor);
    RETURN NEW;
  ELSE
    PERFORM public.mark_course_curriculum_changed(NEW.course_id, v_actor);
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_mark_course_curriculum_dependency_changed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS course_learning_outcomes_invalidate_course_review ON public.course_learning_outcomes;
CREATE TRIGGER course_learning_outcomes_invalidate_course_review
AFTER INSERT OR UPDATE OR DELETE ON public.course_learning_outcomes
FOR EACH ROW
EXECUTE FUNCTION public.trg_mark_course_curriculum_dependency_changed();

DROP TRIGGER IF EXISTS course_evidence_invalidate_course_review ON public.course_evidence_requirements;
CREATE TRIGGER course_evidence_invalidate_course_review
AFTER INSERT OR UPDATE OR DELETE ON public.course_evidence_requirements
FOR EACH ROW
EXECUTE FUNCTION public.trg_mark_course_curriculum_dependency_changed();

-- --------------------------------------------------------------------------
-- Guard the existing native faculty review RPC and keep its review projection
-- synchronized with the course. Approval must be independent of the author.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_faculty_review(
  p_course_id uuid,
  p_state text,
  p_comments text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_course public.courses%ROWTYPE;
  v_reviewed_at timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated';
  END IF;

  IF NOT public.can_author_course_curriculum(v_user, p_course_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_review_assignment_required';
  END IF;

  IF p_state NOT IN ('pending', 'approved', 'changes_requested', 'rejected') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_course_review_state';
  END IF;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'course_not_found';
  END IF;

  IF p_state = 'approved' AND v_course.faculty_author_id IS NOT NULL
     AND v_course.faculty_author_id = v_user THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'independent_course_review_required';
  END IF;

  v_reviewed_at := CASE WHEN p_state <> 'pending' THEN now() ELSE NULL END;

  INSERT INTO public.faculty_curriculum_reviews (
    course_id, reviewer_id, state, comments, reviewed_at, updated_at
  ) VALUES (
    p_course_id, v_user, p_state, p_comments, v_reviewed_at, now()
  )
  ON CONFLICT (course_id, reviewer_id)
  DO UPDATE SET state = EXCLUDED.state,
                comments = EXCLUDED.comments,
                reviewed_at = EXCLUDED.reviewed_at,
                updated_at = now()
  RETURNING id INTO v_id;

  PERFORM set_config('app.course_curriculum_internal', 'on', true);

  IF p_state = 'approved' THEN
    UPDATE public.courses
    SET curriculum_status = 'faculty_review',
        reviewed_by = v_user,
        last_reviewed_at = v_reviewed_at
    WHERE id = p_course_id;
  ELSIF p_state IN ('changes_requested', 'rejected') THEN
    UPDATE public.courses
    SET curriculum_status = 'authored',
        reviewed_by = NULL,
        last_reviewed_at = NULL
    WHERE id = p_course_id;
  END IF;

  IF to_regprocedure('public.log_quality_action(text,text,uuid,uuid,jsonb,text)') IS NOT NULL THEN
    PERFORM public.log_quality_action(
      'faculty_curriculum_review',
      'course', p_course_id,
      NULL,
      jsonb_build_object('state', p_state, 'reviewer', v_user),
      p_comments
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_id,
    'course_id', p_course_id,
    'state', p_state,
    'reviewed_at', v_reviewed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_faculty_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_faculty_review(uuid, text, text) TO authenticated;

-- --------------------------------------------------------------------------
-- Course-level completeness truth. A fresh independent review is represented
-- on the guarded courses review projection; generic backfill CLOs do not count
-- toward substantive outcome evidence.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.course_curriculum_completeness(p_course_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH c AS (
  SELECT
    id,
    title,
    faculty_author_id,
    reviewed_by,
    last_reviewed_at,
    course_curriculum_changed_at
  FROM public.courses
  WHERE id = p_course_id
),
outcomes AS (
  SELECT
    count(*)::int AS outcomes_total,
    count(*) FILTER (
      WHERE public.is_generated_course_outcome_scaffold(c.title, clo.statement)
    )::int AS scaffold_outcomes,
    count(*) FILTER (
      WHERE NOT public.is_generated_course_outcome_scaffold(c.title, clo.statement)
    )::int AS substantive_outcomes
  FROM c
  LEFT JOIN public.course_learning_outcomes clo ON clo.course_id = c.id
  GROUP BY c.title
),
evidence AS (
  SELECT
    count(cer.id)::int AS evidence_rows,
    COALESCE(max(
      CASE WHEN jsonb_typeof(cer.required_readings) = 'array'
           THEN jsonb_array_length(cer.required_readings) ELSE 0 END
    ), 0)::int AS required_readings,
    COALESCE(max(
      CASE WHEN jsonb_typeof(cer.assessment_evidence) = 'array'
           THEN jsonb_array_length(cer.assessment_evidence) ELSE 0 END
    ), 0)::int AS course_assessment_evidence
  FROM c
  LEFT JOIN public.course_evidence_requirements cer ON cer.course_id = c.id
),
facts AS (
  SELECT
    c.id,
    c.faculty_author_id,
    c.reviewed_by,
    c.last_reviewed_at,
    c.course_curriculum_changed_at,
    COALESCE(o.outcomes_total, 0) AS outcomes_total,
    COALESCE(o.scaffold_outcomes, 0) AS scaffold_outcomes,
    COALESCE(o.substantive_outcomes, 0) AS substantive_outcomes,
    COALESCE(e.evidence_rows, 0) AS evidence_rows,
    COALESCE(e.required_readings, 0) AS required_readings,
    COALESCE(e.course_assessment_evidence, 0) AS course_assessment_evidence,
    (
      c.faculty_author_id IS NOT NULL
      AND c.reviewed_by IS NOT NULL
      AND c.reviewed_by IS DISTINCT FROM c.faculty_author_id
      AND c.last_reviewed_at IS NOT NULL
      AND c.last_reviewed_at >= c.course_curriculum_changed_at
    ) AS independent_review_current
  FROM c
  CROSS JOIN outcomes o
  CROSS JOIN evidence e
)
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM c) THEN
    jsonb_build_object(
      'course_id', p_course_id,
      'state', 'not_found',
      'complete', false,
      'blockers', jsonb_build_array('course_not_found')
    )
  ELSE (
    SELECT jsonb_build_object(
      'course_id', p_course_id,
      'state', CASE WHEN (
        faculty_author_id IS NOT NULL
        AND substantive_outcomes >= 3
        AND evidence_rows >= 1
        AND required_readings >= 3
        AND course_assessment_evidence >= 2
        AND independent_review_current
      ) THEN 'complete' ELSE 'incomplete' END,
      'complete', (
        faculty_author_id IS NOT NULL
        AND substantive_outcomes >= 3
        AND evidence_rows >= 1
        AND required_readings >= 3
        AND course_assessment_evidence >= 2
        AND independent_review_current
      ),
      'outcomes_total', outcomes_total,
      'scaffold_outcomes', scaffold_outcomes,
      'substantive_outcomes', substantive_outcomes,
      'required_readings', required_readings,
      'course_assessment_evidence', course_assessment_evidence,
      'independent_review_current', independent_review_current,
      'blockers', to_jsonb(array_remove(ARRAY[
        CASE WHEN faculty_author_id IS NULL THEN 'course_author_missing' END,
        CASE WHEN outcomes_total >= 3 AND substantive_outcomes = 0 THEN 'course_outcomes_scaffold_only' END,
        CASE WHEN substantive_outcomes < 3 THEN 'insufficient_substantive_learning_outcomes' END,
        CASE WHEN evidence_rows < 1 THEN 'course_evidence_missing' END,
        CASE WHEN required_readings < 3 THEN 'insufficient_required_readings' END,
        CASE WHEN course_assessment_evidence < 2 THEN 'insufficient_course_assessment_evidence' END,
        CASE WHEN NOT independent_review_current THEN 'independent_course_review_missing_or_stale' END
      ]::text[], NULL))
    )
    FROM facts
  )
END;
$$;

GRANT EXECUTE ON FUNCTION public.course_curriculum_completeness(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.v_course_curriculum_completeness
WITH (security_invoker = true)
AS
SELECT
  c.id AS course_id,
  c.title,
  c.curriculum_status,
  completeness->>'state' AS completeness_state,
  COALESCE((completeness->>'complete')::boolean, false) AS complete,
  COALESCE((completeness->>'outcomes_total')::int, 0) AS outcomes_total,
  COALESCE((completeness->>'scaffold_outcomes')::int, 0) AS scaffold_outcomes,
  COALESCE((completeness->>'substantive_outcomes')::int, 0) AS substantive_outcomes,
  COALESCE((completeness->>'required_readings')::int, 0) AS required_readings,
  COALESCE((completeness->>'course_assessment_evidence')::int, 0) AS course_assessment_evidence,
  COALESCE((completeness->>'independent_review_current')::boolean, false) AS independent_review_current,
  COALESCE(completeness->'blockers', '[]'::jsonb) AS blockers
FROM public.courses c
CROSS JOIN LATERAL public.course_curriculum_completeness(c.id) completeness;

GRANT SELECT ON public.v_course_curriculum_completeness TO authenticated;

-- Final institutional approval is an explicit guarded action, never a direct
-- row-state toggle.
CREATE OR REPLACE FUNCTION public.approve_course_curriculum(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_completeness jsonb;
  v_reviewer uuid;
  v_reviewed_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated';
  END IF;

  IF NOT public.can_administer_course_curriculum(v_actor) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_approval_requires_institution_admin';
  END IF;

  v_completeness := public.course_curriculum_completeness(p_course_id);

  IF COALESCE((v_completeness->>'complete')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course_curriculum_completeness_gate_failed',
      DETAIL = COALESCE(v_completeness->'blockers', '[]'::jsonb)::text;
  END IF;

  SELECT reviewed_by, last_reviewed_at
  INTO v_reviewer, v_reviewed_at
  FROM public.courses
  WHERE id = p_course_id;

  IF v_reviewer IS NULL OR v_reviewed_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'independent_course_review_required';
  END IF;

  PERFORM set_config('app.course_curriculum_internal', 'on', true);

  UPDATE public.courses
  SET curriculum_status = 'approved',
      reviewed_by = v_reviewer,
      last_reviewed_at = v_reviewed_at
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'course_not_found';
  END IF;

  RETURN jsonb_build_object(
    'course_id', p_course_id,
    'curriculum_status', 'approved',
    'reviewed_by', v_reviewer,
    'last_reviewed_at', v_reviewed_at,
    'completeness', v_completeness
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_course_curriculum(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_course_curriculum(uuid) TO authenticated;

-- --------------------------------------------------------------------------
-- Teaching readiness now also requires authoritative course-level curriculum
-- evidence. Published module content remains mandatory; this only adds gates.
-- --------------------------------------------------------------------------
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
curriculum_evidence AS (
  SELECT public.course_curriculum_completeness(p_course_id) AS result
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
    COALESCE((ce.result->>'complete')::boolean, false) AS course_curriculum_complete,
    COALESCE(ce.result->'blockers', '[]'::jsonb) AS course_curriculum_blockers,
    (
      cr.id IS NOT NULL
      AND COALESCE(cr.curriculum_status, 'pending_authorship') = 'approved'
      AND COALESCE((ce.result->>'complete')::boolean, false)
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
  CROSS JOIN curriculum_evidence ce
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
      'course_curriculum_complete', course_curriculum_complete,
      'course_curriculum_blockers', course_curriculum_blockers,
      'modules_total', modules_total,
      'modules_verified', modules_verified,
      'outcomes_total', outcomes_total,
      'assessment_artifacts', assessment_artifacts,
      'learning_resources', learning_resources,
      'scheduled_sections', scheduled_sections,
      'open_staffed_sections', open_staffed_sections,
      'blockers', to_jsonb(array_remove(ARRAY[
        CASE WHEN curriculum_status <> 'approved' THEN 'curriculum_not_approved' END,
        CASE WHEN NOT course_curriculum_complete THEN 'course_curriculum_evidence_incomplete' END,
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

COMMENT ON FUNCTION public.course_curriculum_completeness(uuid) IS
  'Fail-closed course completeness: known generated CLO scaffolds do not count as substantive outcomes; course evidence and a fresh independent review are required.';
COMMENT ON FUNCTION public.approve_course_curriculum(uuid) IS
  'Institution-admin-only final curriculum approval after course-level completeness and independent-review evidence pass.';
COMMENT ON VIEW public.v_course_curriculum_completeness IS
  'Operational curriculum completeness evidence for the canonical course catalogue. This view measures readiness; it does not assert accreditation or external credit authority.';
