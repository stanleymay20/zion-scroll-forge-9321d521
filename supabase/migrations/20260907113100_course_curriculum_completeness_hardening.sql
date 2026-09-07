-- Hardening follow-up for course curriculum completeness authority.
--
-- The authority trigger must execute as the caller so current_user reflects an
-- authenticated/browser session instead of the function owner. Guarded RPCs
-- also restore their transaction-local internal flag before returning. Finally,
-- a LEFT JOIN with no CLO row must count as zero outcomes, never one.

CREATE OR REPLACE FUNCTION public.enforce_course_curriculum_state_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

CREATE OR REPLACE FUNCTION public.mark_course_curriculum_changed(
  p_course_id uuid,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior_internal text := COALESCE(current_setting('app.course_curriculum_internal', true), 'off');
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

  PERFORM set_config('app.course_curriculum_internal', v_prior_internal, true);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_course_curriculum_changed(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_course_curriculum_changed(uuid, uuid) TO service_role;

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
  v_prior_internal text := COALESCE(current_setting('app.course_curriculum_internal', true), 'off');
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

  IF p_state = 'approved' AND (
    v_course.faculty_author_id IS NULL
    OR v_course.faculty_author_id = v_user
  ) THEN
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

  PERFORM set_config('app.course_curriculum_internal', v_prior_internal, true);

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
    count(clo.id)::int AS outcomes_total,
    count(clo.id) FILTER (
      WHERE clo.id IS NOT NULL
        AND public.is_generated_course_outcome_scaffold(c.title, clo.statement)
    )::int AS scaffold_outcomes,
    count(clo.id) FILTER (
      WHERE clo.id IS NOT NULL
        AND NOT public.is_generated_course_outcome_scaffold(c.title, clo.statement)
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
  v_prior_internal text := COALESCE(current_setting('app.course_curriculum_internal', true), 'off');
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

  PERFORM set_config('app.course_curriculum_internal', v_prior_internal, true);

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

COMMENT ON FUNCTION public.enforce_course_curriculum_state_authority() IS
  'Invoker-rights trigger: browser callers cannot forge course review/approval state; trusted server sessions remain explicit.';
