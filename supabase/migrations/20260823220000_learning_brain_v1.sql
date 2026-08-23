-- ============================================================================
-- Learning Brain v1 — canonical, explainable student learning state
-- ============================================================================
-- Read model only. It does NOT award grades, unlock modules, or mutate mastery.
-- Academic recommendations are derived from verified/derived academic state.
-- Tutor memory is returned separately as pedagogical context because it is not
-- currently an authority-bound academic evidence source.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_student_learning_state(
  _student uuid,
  _course uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_authorized boolean := false;
  v_course jsonb := '{}'::jsonb;
  v_modules jsonb := '[]'::jsonb;
  v_outcomes jsonb := '[]'::jsonb;
  v_skills jsonb := '[]'::jsonb;
  v_tutor jsonb := NULL;
  v_interventions jsonb := '[]'::jsonb;
  v_open_interventions int := 0;
  v_unknown_modules int := 0;
  v_low_module numeric := NULL;
  v_low_outcome numeric := NULL;
  v_low_skill numeric := NULL;
  v_low_confidence numeric := NULL;
  v_course_skill_count int := 0;
  v_skill_evidence_count int := 0;
  v_action text := 'advance';
  v_reason text := 'Current verified evidence meets the v1 progression thresholds.';
  v_target_type text := NULL;
  v_target_id uuid := NULL;
  v_target_label text := NULL;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  v_authorized := (
    v_actor = _student
    OR public.has_role(v_actor,'faculty')
    OR public.has_role(v_actor,'admin')
    OR public.has_role(v_actor,'superadmin')
    OR EXISTS (
      SELECT 1 FROM public.advising_assignments a
       WHERE a.student_user_id = _student
         AND a.advisor_user_id = v_actor
         AND a.active
    )
  );

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
           'id', c.id,
           'title', c.title,
           'enrolled', EXISTS(
             SELECT 1 FROM public.enrollments e
              WHERE e.user_id=_student AND e.course_id=c.id
           ),
           'progress_pct', COALESCE((
             SELECT e.progress FROM public.enrollments e
              WHERE e.user_id=_student AND e.course_id=c.id LIMIT 1
           ),0)
         )
    INTO v_course
    FROM public.courses c
   WHERE c.id=_course;

  IF v_course IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;

  -- Module state. Missing progress is UNKNOWN, never interpreted as zero mastery.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'module_id', cm.id,
           'title', cm.title,
           'order_index', cm.order_index,
           'state', CASE WHEN smp.module_id IS NULL THEN 'unknown' ELSE 'observed' END,
           'mastery', smp.mastery_level,
           'status', smp.status,
           'last_accessed', smp.last_accessed,
           'completed_at', smp.completed_at
         ) ORDER BY cm.order_index), '[]'::jsonb),
         count(*) FILTER (WHERE smp.module_id IS NULL),
         min(smp.mastery_level) FILTER (WHERE smp.module_id IS NOT NULL)
    INTO v_modules, v_unknown_modules, v_low_module
    FROM public.course_modules cm
    LEFT JOIN public.student_module_progress smp
      ON smp.module_id=cm.id AND smp.user_id=_student
   WHERE cm.course_id=_course;

  -- CLO/outcome state is a server-derived projection from trusted assessment results.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'learning_objective_id', som.learning_objective_id,
           'code', clo.code,
           'statement', clo.statement,
           'score_pct', som.score_pct,
           'attempts', som.attempts,
           'first_attempt_at', som.first_attempt_at,
           'last_attempt_at', som.last_attempt_at,
           'achieved_at', som.achieved_at
         ) ORDER BY clo.code), '[]'::jsonb),
         min(som.score_pct)
    INTO v_outcomes, v_low_outcome
    FROM public.student_outcome_mastery som
    LEFT JOIN public.course_learning_outcomes clo ON clo.id=som.learning_objective_id
   WHERE som.user_id=_student AND som.course_id=_course;

  -- Course-relevant skill graph overlay. Demonstrated/inferred remain separate rows.
  WITH course_skill_ids AS (
    SELECT cs.skill_id FROM public.course_skills cs WHERE cs.course_id=_course
    UNION
    SELECT ms.skill_id
      FROM public.module_skills ms
      JOIN public.course_modules cm ON cm.id=ms.module_id
     WHERE cm.course_id=_course
  ), profile AS (
    SELECT p.*
      FROM public.vw_student_skill_profile p
     WHERE p.user_id=_student
       AND p.skill_id IN (SELECT skill_id FROM course_skill_ids)
  )
  SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'skill_id', p.skill_id,
      'skill_name', p.skill_name,
      'category', p.category,
      'skill_version', p.skill_version,
      'evidence_kind', p.evidence_kind,
      'weighted_mastery', p.weighted_mastery,
      'current_confidence', p.avg_current_confidence,
      'original_confidence', p.avg_original_confidence,
      'evidence_count', p.evidence_count,
      'last_evidence_at', p.last_evidence_at
    ) ORDER BY p.skill_name, p.evidence_kind) FROM profile p), '[]'::jsonb),
    (SELECT count(*) FROM course_skill_ids),
    (SELECT count(*) FROM profile),
    (SELECT min(weighted_mastery) FROM profile WHERE evidence_kind='demonstrated'),
    (SELECT min(avg_current_confidence) FROM profile WHERE evidence_kind='demonstrated')
  INTO v_skills, v_course_skill_count, v_skill_evidence_count, v_low_skill, v_low_confidence;

  -- Pedagogy context is deliberately NOT treated as verified academic evidence.
  SELECT jsonb_build_object(
           'misconceptions', tsm.misconceptions,
           'strengths', tsm.strengths,
           'weak_areas', tsm.weak_areas,
           'last_topics', tsm.last_topics,
           'preferred_pace', tsm.preferred_pace,
           'current_mode', tsm.current_mode,
           'consecutive_low_scores', tsm.consecutive_low_scores,
           'intervention_flag', tsm.intervention_flag,
           'last_interaction_at', tsm.last_interaction_at,
           'authority', 'pedagogical_context_only'
         )
    INTO v_tutor
    FROM public.tutor_student_memory tsm
   WHERE tsm.user_id=_student AND tsm.course_id=_course
   LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', sia.id,
           'trigger_reason', sia.trigger_reason,
           'recommended_action', sia.recommended_action,
           'status', sia.status,
           'created_at', sia.created_at,
           'acknowledged_at', sia.acknowledged_at,
           'resolved_at', sia.resolved_at
         ) ORDER BY sia.created_at DESC), '[]'::jsonb),
         count(*) FILTER (WHERE sia.status IN ('open','acknowledged'))
    INTO v_interventions, v_open_interventions
    FROM public.student_intervention_alerts sia
   WHERE sia.user_id=_student AND sia.course_id=_course;

  -- Explainable deterministic recommendation policy v1.
  -- This is advisory only; academic policy remains the execution authority.
  IF v_open_interventions > 0 THEN
    v_action := 'human_intervention';
    v_reason := format('%s trusted intervention alert(s) are open or acknowledged.', v_open_interventions);
    v_target_type := 'course';
    v_target_id := _course;
  ELSIF v_course_skill_count > 0 AND v_skill_evidence_count = 0 THEN
    v_action := 'diagnostic';
    v_reason := 'The course has mapped skills but no learner skill evidence yet; unknown is not treated as zero.';
    v_target_type := 'course';
    v_target_id := _course;
  ELSIF v_low_skill IS NOT NULL AND v_low_skill < 50 THEN
    SELECT p.skill_id, p.skill_name INTO v_target_id, v_target_label
      FROM public.vw_student_skill_profile p
     WHERE p.user_id=_student AND p.evidence_kind='demonstrated'
       AND p.skill_id IN (
         SELECT cs.skill_id FROM public.course_skills cs WHERE cs.course_id=_course
         UNION
         SELECT ms.skill_id FROM public.module_skills ms
          JOIN public.course_modules cm ON cm.id=ms.module_id WHERE cm.course_id=_course
       )
     ORDER BY p.weighted_mastery ASC NULLS LAST LIMIT 1;
    v_action := 'targeted_remediation';
    v_reason := format('Lowest demonstrated course skill mastery is %s%%.', round(v_low_skill,1));
    v_target_type := 'skill';
  ELSIF v_low_outcome IS NOT NULL AND v_low_outcome < 70 THEN
    SELECT som.learning_objective_id, COALESCE(clo.code,clo.statement)
      INTO v_target_id, v_target_label
      FROM public.student_outcome_mastery som
      LEFT JOIN public.course_learning_outcomes clo ON clo.id=som.learning_objective_id
     WHERE som.user_id=_student AND som.course_id=_course
     ORDER BY som.score_pct ASC LIMIT 1;
    v_action := 'outcome_remediation';
    v_reason := format('Lowest verified course learning outcome is %s%%.', round(v_low_outcome,1));
    v_target_type := 'learning_outcome';
  ELSIF v_low_module IS NOT NULL AND v_low_module < 70 THEN
    SELECT cm.id, cm.title INTO v_target_id, v_target_label
      FROM public.course_modules cm
      JOIN public.student_module_progress smp ON smp.module_id=cm.id
     WHERE cm.course_id=_course AND smp.user_id=_student
     ORDER BY smp.mastery_level ASC LIMIT 1;
    v_action := 'module_remediation';
    v_reason := format('Lowest observed module mastery is %s%%.', round(v_low_module,1));
    v_target_type := 'module';
  ELSIF v_low_confidence IS NOT NULL AND v_low_confidence < 0.50 THEN
    SELECT p.skill_id, p.skill_name INTO v_target_id, v_target_label
      FROM public.vw_student_skill_profile p
     WHERE p.user_id=_student AND p.evidence_kind='demonstrated'
       AND p.skill_id IN (
         SELECT cs.skill_id FROM public.course_skills cs WHERE cs.course_id=_course
         UNION
         SELECT ms.skill_id FROM public.module_skills ms
          JOIN public.course_modules cm ON cm.id=ms.module_id WHERE cm.course_id=_course
       )
     ORDER BY p.avg_current_confidence ASC NULLS LAST LIMIT 1;
    v_action := 'revalidate';
    v_reason := format('Demonstrated mastery exists, but evidence confidence has decayed to %s.', round(v_low_confidence,2));
    v_target_type := 'skill';
  ELSIF v_unknown_modules > 0 THEN
    SELECT cm.id, cm.title INTO v_target_id, v_target_label
      FROM public.course_modules cm
      LEFT JOIN public.student_module_progress smp
        ON smp.module_id=cm.id AND smp.user_id=_student
     WHERE cm.course_id=_course AND smp.module_id IS NULL
     ORDER BY cm.order_index LIMIT 1;
    v_action := 'diagnostic_or_learn';
    v_reason := format('%s module(s) have no observed mastery evidence yet.', v_unknown_modules);
    v_target_type := 'module';
  END IF;

  RETURN jsonb_build_object(
    'schema_version', 'learning_state.v1',
    'as_of', now(),
    'student_id', _student,
    'course', v_course,
    'academic_state', jsonb_build_object(
      'modules', v_modules,
      'outcomes', v_outcomes,
      'skills', v_skills
    ),
    'pedagogy_context', COALESCE(v_tutor, jsonb_build_object('authority','pedagogical_context_only')),
    'interventions', v_interventions,
    'next_best_action', jsonb_build_object(
      'action', v_action,
      'reason', v_reason,
      'target_type', v_target_type,
      'target_id', v_target_id,
      'target_label', v_target_label,
      'advisory_only', true,
      'policy_version', 'nba.v1'
    ),
    'trust', jsonb_build_object(
      'academic_state_source', 'verified_or_server_derived',
      'tutor_memory_source', 'pedagogical_context_only',
      'unknown_is_zero', false
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_learning_state(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_learning_state(uuid,uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_student_learning_state(uuid,uuid) IS
  'Learning Brain v1 canonical read model. Aggregates module/CLO/skill/intervention state, separates untrusted pedagogical memory, and emits an explainable advisory next-best-action without mutating academic records.';
