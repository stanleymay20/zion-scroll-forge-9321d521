CREATE OR REPLACE FUNCTION public.can_access_course(_user_id uuid, _course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_visibility text;
  v_lifecycle text;
  v_enrolled boolean := false;
  v_has_block_hold boolean := false;
  v_is_admin boolean := false;
  v_is_faculty boolean := false;
  v_prereqs jsonb;
  v_missing text[] := '{}';
  v_prereq_id text;
  v_prereq_done boolean;
BEGIN
  SELECT visibility, prerequisite_courses INTO v_visibility, v_prereqs
  FROM public.courses WHERE id = _course_id;

  IF v_visibility IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'course_not_found', 'missing', v_missing);
  END IF;

  IF _user_id IS NULL THEN
    IF v_visibility = 'public_preview' THEN
      RETURN jsonb_build_object('allowed', true, 'access_level', 'preview', 'reason', 'public_preview', 'missing', v_missing);
    END IF;
    RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'authentication_required', 'missing', ARRAY['login']);
  END IF;

  v_is_admin := public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'superadmin');
  v_is_faculty := public.has_role(_user_id, 'faculty');

  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'access_level', 'admin', 'reason', 'admin_override', 'missing', v_missing);
  END IF;
  IF v_visibility = 'admin_only' THEN
    RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'admin_only', 'missing', ARRAY['admin_role']);
  END IF;
  IF v_is_faculty THEN
    RETURN jsonb_build_object('allowed', true, 'access_level', 'faculty', 'reason', 'faculty_role', 'missing', v_missing);
  END IF;
  IF v_visibility = 'role_only' THEN
    RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'role_required', 'missing', ARRAY['faculty_or_admin']);
  END IF;

  SELECT lifecycle_status INTO v_lifecycle FROM public.profiles WHERE id = _user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.student_holds
    WHERE user_id = _user_id
      AND COALESCE(blocks_registration, false) = true
      AND resolved_at IS NULL
  ) INTO v_has_block_hold;

  IF v_has_block_hold THEN
    RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'student_hold', 'missing', ARRAY['resolve_hold']);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id AND course_id = _course_id
  ) INTO v_enrolled;

  IF v_visibility = 'enrolled_only' AND NOT v_enrolled THEN
    IF v_lifecycle IN ('active','enrolled','admitted') THEN
      RETURN jsonb_build_object('allowed', true, 'access_level', 'preview', 'reason', 'not_enrolled_preview', 'missing', ARRAY['enrollment']);
    END IF;
    RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'not_enrolled', 'missing', ARRAY['enrollment']);
  END IF;

  IF v_prereqs IS NOT NULL AND jsonb_array_length(v_prereqs) > 0 THEN
    FOR v_prereq_id IN SELECT jsonb_array_elements_text(v_prereqs) LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = _user_id
          AND course_id::text = v_prereq_id
          AND COALESCE(progress, 0) >= 100
      ) INTO v_prereq_done;
      IF NOT v_prereq_done THEN
        v_missing := array_append(v_missing, 'prereq:' || v_prereq_id);
      END IF;
    END LOOP;
  END IF;

  IF array_length(v_missing, 1) > 0 AND NOT v_enrolled THEN
    RETURN jsonb_build_object('allowed', true, 'access_level', 'preview', 'reason', 'prerequisites_unmet', 'missing', v_missing);
  END IF;

  IF v_enrolled THEN
    RETURN jsonb_build_object(
      'allowed', true,
      -- Enrolled students with any active learner lifecycle get full enrolled access.
      -- Only truly inactive lifecycles (withdrawn, on_leave, applicant) drop to audit.
      'access_level', CASE
        WHEN v_lifecycle IN ('active','enrolled','admitted','graduated','alumni') THEN 'enrolled'
        ELSE 'audit'
      END,
      'reason', 'enrolled',
      'missing', v_missing
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'access_level', 'preview', 'reason', 'public_preview_default', 'missing', v_missing);
END;
$function$;