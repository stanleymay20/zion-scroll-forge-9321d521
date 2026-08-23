-- Verified course completion projection.
-- A course is complete only when every authored module has server-derived mastery >= 70.

CREATE OR REPLACE FUNCTION public.get_verified_course_completion(
  p_user_id uuid,
  p_course_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_staff boolean := false;
  v_total int := 0;
  v_verified int := 0;
  v_progress int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_staff := public.has_role(v_caller, 'admin')
    OR public.has_role(v_caller, 'superadmin')
    OR public.has_role(v_caller, 'faculty');

  IF v_caller <> p_user_id AND NOT v_is_staff THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT v_is_staff AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = p_user_id AND e.course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Not enrolled';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.course_modules m
  WHERE m.course_id = p_course_id;

  SELECT count(*) INTO v_verified
  FROM public.course_modules m
  WHERE m.course_id = p_course_id
    AND EXISTS (
      SELECT 1
      FROM public.student_module_progress p
      WHERE p.user_id = p_user_id
        AND p.module_id = m.id
        AND p.status = 'completed'
        AND COALESCE(p.mastery_level, 0) >= 70
    );

  v_progress := CASE WHEN v_total = 0 THEN 0
    ELSE round((v_verified::numeric / v_total::numeric) * 100)::int END;

  RETURN jsonb_build_object(
    'course_id', p_course_id,
    'user_id', p_user_id,
    'total_modules', v_total,
    'verified_modules', v_verified,
    'progress', v_progress,
    'complete', (v_total > 0 AND v_verified = v_total),
    'authority', 'verified_module_mastery',
    'policy_version', 'course-completion.v1'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_verified_course_completion(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verified_course_completion(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_verified_course_completion(uuid, uuid) IS
  'Read-only verified course completion projection derived from trusted student_module_progress mastery; never from client completion claims.';
