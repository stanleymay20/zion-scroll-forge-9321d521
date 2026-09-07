-- ScrollUniversity course teaching-readiness truth boundary.
-- A catalogue row or scheduled section is not enough to make a course teachable.
-- Readiness is derived from native curriculum evidence and enforced before new
-- section enrollment records can be created.

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
    count(*) FILTER (WHERE COALESCE(m.quality_verified, false))::int AS modules_verified
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
    count(*) FILTER (WHERE COALESCE(cs.active, false) AND cs.section_status <> 'cancelled')::int AS scheduled_sections,
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
        CASE WHEN modules_total > 0 AND modules_verified <> modules_total THEN 'unverified_modules' END,
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

GRANT EXECUTE ON FUNCTION public.course_teaching_readiness(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.v_course_teaching_readiness
WITH (security_invoker = true)
AS
SELECT
  c.id AS course_id,
  c.title,
  c.curriculum_status,
  readiness->>'state' AS readiness_state,
  COALESCE((readiness->>'content_ready')::boolean, false) AS content_ready,
  COALESCE((readiness->>'modules_total')::int, 0) AS modules_total,
  COALESCE((readiness->>'modules_verified')::int, 0) AS modules_verified,
  COALESCE((readiness->>'outcomes_total')::int, 0) AS outcomes_total,
  COALESCE((readiness->>'assessment_artifacts')::int, 0) AS assessment_artifacts,
  COALESCE((readiness->>'learning_resources')::int, 0) AS learning_resources,
  COALESCE((readiness->>'scheduled_sections')::int, 0) AS scheduled_sections,
  COALESCE((readiness->>'open_staffed_sections')::int, 0) AS open_staffed_sections,
  COALESCE(readiness->'blockers', '[]'::jsonb) AS blockers
FROM public.courses c
CROSS JOIN LATERAL public.course_teaching_readiness(c.id) readiness;

GRANT SELECT ON public.v_course_teaching_readiness TO anon, authenticated;

-- Preserve the original operational metrics while adding evidence-based catalogue
-- readiness counts to the existing admin dashboard contract.
CREATE OR REPLACE VIEW public.v_learning_readiness
WITH (security_invoker = true)
AS
SELECT
  (SELECT count(*) FROM public.courses) AS courses_total,
  (SELECT count(*) FROM public.courses WHERE faculty_id IS NOT NULL) AS courses_with_faculty,
  (SELECT count(*) FROM public.course_modules) AS modules_total,
  (SELECT count(*) FROM public.course_modules WHERE quality_verified = true) AS modules_verified,
  (SELECT count(*) FROM public.ai_tutors) AS tutors_total,
  (SELECT count(*) FROM public.ai_tutors WHERE faculty_id IS NOT NULL) AS tutors_with_faculty,
  (SELECT count(DISTINCT course_id) FROM public.live_sessions WHERE scheduled_start > now()) AS courses_with_upcoming_sessions,
  (SELECT count(*) FROM public.live_sessions WHERE scheduled_start > now()) AS upcoming_sessions,
  (SELECT count(*) FROM public.assessment_question_pools) AS quiz_pools,
  (SELECT count(*) FROM public.assignments) AS assignments_total,
  (SELECT count(*) FROM public.quizzes) AS quizzes_total,
  (SELECT count(*) FROM public.v_course_teaching_readiness WHERE readiness_state = 'shell') AS courses_shell,
  (SELECT count(*) FROM public.v_course_teaching_readiness WHERE readiness_state = 'in_development') AS courses_in_development,
  (SELECT count(*) FROM public.v_course_teaching_readiness WHERE readiness_state = 'teaching_ready') AS courses_teaching_ready,
  (SELECT count(*) FROM public.v_course_teaching_readiness WHERE readiness_state = 'scheduled_blocked') AS courses_scheduled_blocked,
  (SELECT count(*) FROM public.v_course_teaching_readiness WHERE readiness_state = 'enrollable') AS courses_enrollable,
  (SELECT count(*) FROM public.v_course_teaching_readiness WHERE content_ready) AS courses_content_ready;

GRANT SELECT ON public.v_learning_readiness TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.enforce_section_course_teaching_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_readiness jsonb;
BEGIN
  IF NEW.status NOT IN ('requested', 'enrolled', 'waitlisted') THEN
    RETURN NEW;
  END IF;

  SELECT cs.course_id
  INTO v_course_id
  FROM public.course_sections cs
  WHERE cs.id = NEW.section_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course_not_linked',
      DETAIL = 'The section must reference a canonical course before enrollment can open.';
  END IF;

  v_readiness := public.course_teaching_readiness(v_course_id);

  IF COALESCE((v_readiness->>'content_ready')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course_not_teaching_ready',
      DETAIL = COALESCE(v_readiness->'blockers', '[]'::jsonb)::text;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_section_course_teaching_readiness() FROM PUBLIC;

DROP TRIGGER IF EXISTS section_enrollment_requires_teaching_ready_course ON public.section_enrollments;
CREATE TRIGGER section_enrollment_requires_teaching_ready_course
BEFORE INSERT OR UPDATE OF section_id, status
ON public.section_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_section_course_teaching_readiness();

COMMENT ON VIEW public.v_course_teaching_readiness IS
  'Evidence-based course readiness: shell, in_development, teaching_ready, scheduled_blocked, or enrollable. A course is content-ready only when approved and supported by verified modules, outcomes, assessments, and learning resources.';
