-- ============================================================================
-- Canonical student lifecycle authority
-- ============================================================================
-- New-student path:
-- applicant -> admitted -> orientation -> matriculation -> enrolled
-- -> learning profile -> governed section registration -> active
-- -> graduation authority -> graduated -> alumni
--
-- UI routing is never an authorization source. This migration closes historical
-- browser-write bypasses and makes lifecycle transitions evidence-aware.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.students') IS NULL
     OR to_regclass('public.orientation_progress') IS NULL
     OR to_regclass('public.matriculation_records') IS NULL
     OR to_regclass('public.student_learning_profiles') IS NULL
     OR to_regclass('public.section_enrollments') IS NULL
     OR to_regclass('public.course_sections') IS NULL
     OR to_regclass('public.enrollments') IS NULL THEN
    RAISE EXCEPTION 'canonical lifecycle authority requires the full admissions/onboarding/academic spine';
  END IF;
END $$;

-- Legacy course-level enrollments are compatibility/read evidence only.
-- New academic registration must use enroll_student_in_section().
REVOKE INSERT, UPDATE, DELETE ON TABLE public.enrollments FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can enroll in courses" ON public.enrollments;
DROP POLICY IF EXISTS "Users can create own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;

DO $$
BEGIN
  IF to_regprocedure('public.request_section_enrollment(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.request_section_enrollment(uuid) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Matriculation evidence may no longer be manufactured by a browser INSERT.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.matriculation_records FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users insert own matriculation" ON public.matriculation_records;

-- Harden the canonical lifecycle transition function.
CREATE OR REPLACE FUNCTION public.transition_student_status(
  p_user_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_auth_role text := COALESCE(auth.role(), '');
  v_current_status text;
  v_valid_transition boolean := false;
  v_privileged boolean := false;
  v_application_accepted boolean := false;
  v_orientation_complete boolean := false;
  v_matriculated boolean := false;
  v_learning_profile boolean := false;
  v_registered boolean := false;
BEGIN
  SELECT lifecycle_status INTO v_current_status
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'student lifecycle profile not found';
  END IF;

  v_valid_transition := CASE
    WHEN v_current_status = 'applicant' AND p_new_status IN ('admitted','withdrawn') THEN true
    WHEN v_current_status = 'admitted' AND p_new_status IN ('enrolled','withdrawn') THEN true
    WHEN v_current_status = 'enrolled' AND p_new_status IN ('active','withdrawn') THEN true
    WHEN v_current_status = 'active' AND p_new_status IN ('on_leave','withdrawn','graduated') THEN true
    WHEN v_current_status = 'on_leave' AND p_new_status IN ('active','withdrawn') THEN true
    WHEN v_current_status = 'graduated' AND p_new_status = 'alumni' THEN true
    WHEN v_current_status = 'alumni' AND p_new_status = 'alumni' THEN true
    ELSE false
  END;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
  END IF;

  v_privileged := v_auth_role = 'service_role'
    OR (
      v_actor IS NOT NULL AND (
        public.has_role(v_actor, 'admin'::public.app_role)
        OR public.has_role(v_actor, 'superadmin'::public.app_role)
        OR public.has_role(v_actor, 'registrar'::public.app_role)
      )
    );

  IF NOT v_privileged THEN
    IF v_actor IS NULL OR v_actor <> p_user_id THEN
      RAISE EXCEPTION 'lifecycle_transition_forbidden' USING ERRCODE = '42501';
    END IF;

    -- Students cannot make their own admissions, withdrawals, leave, graduation,
    -- reactivation or other authority decisions.
    IF NOT (
      (v_current_status = 'admitted' AND p_new_status = 'enrolled')
      OR (v_current_status = 'enrolled' AND p_new_status = 'active')
      OR (v_current_status = 'graduated' AND p_new_status = 'alumni')
    ) THEN
      RAISE EXCEPTION 'self lifecycle transition is not permitted from % to %', v_current_status, p_new_status
        USING ERRCODE = '42501';
    END IF;

    IF v_current_status IN ('admitted','enrolled') THEN
      SELECT EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.user_id = p_user_id AND s.application_status = 'accepted'
      ) INTO v_application_accepted;

      SELECT COUNT(DISTINCT op.step) >= 9
      INTO v_orientation_complete
      FROM public.orientation_progress op
      WHERE op.user_id = p_user_id;

      SELECT EXISTS (
        SELECT 1 FROM public.matriculation_records mr WHERE mr.user_id = p_user_id
      ) INTO v_matriculated;

      IF NOT v_application_accepted THEN RAISE EXCEPTION 'accepted_admission_required'; END IF;
      IF NOT v_orientation_complete THEN RAISE EXCEPTION 'orientation_completion_required'; END IF;
      IF NOT v_matriculated THEN RAISE EXCEPTION 'matriculation_required'; END IF;
    END IF;

    IF v_current_status = 'enrolled' AND p_new_status = 'active' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.student_learning_profiles lp WHERE lp.user_id = p_user_id
      ) INTO v_learning_profile;

      SELECT EXISTS (
        SELECT 1
        FROM public.section_enrollments se
        WHERE se.student_user_id = p_user_id AND se.status = 'enrolled'
      ) INTO v_registered;

      IF NOT v_learning_profile THEN RAISE EXCEPTION 'learning_profile_required'; END IF;
      IF NOT v_registered THEN RAISE EXCEPTION 'governed_section_registration_required'; END IF;
    END IF;
  END IF;

  PERFORM set_config('app.allow_lifecycle_change', 'on', true);
  UPDATE public.profiles SET
    lifecycle_status = p_new_status,
    admitted_at  = CASE WHEN p_new_status = 'admitted'  THEN COALESCE(admitted_at, now()) ELSE admitted_at END,
    enrolled_at  = CASE WHEN p_new_status = 'enrolled'  THEN COALESCE(enrolled_at, now()) ELSE enrolled_at END,
    graduated_at = CASE WHEN p_new_status = 'graduated' THEN COALESCE(graduated_at, now()) ELSE graduated_at END,
    withdrawn_at = CASE WHEN p_new_status = 'withdrawn' THEN COALESCE(withdrawn_at, now()) ELSE withdrawn_at END,
    updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.allow_lifecycle_change', 'off', true);

  PERFORM public.log_suyas_action(
    'status_transition', 'student', p_user_id,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_new_status), p_reason
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_student_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_student_status(uuid,text,text) TO authenticated, service_role;
COMMENT ON FUNCTION public.transition_student_status(uuid,text,text) IS
  'CANONICAL_LIFECYCLE_AUTHORITY_20260908: valid graph + caller authority + onboarding/registration evidence for student self-transitions.';

-- Dedicated atomic matriculation RPC. It does not issue a degree/course credential.
CREATE OR REPLACE FUNCTION public.complete_student_matriculation(
  p_signature_text text,
  p_cohort_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_status text;
  v_accepted boolean;
  v_orientation_complete boolean;
  v_existing boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_signature_text IS NULL OR length(trim(p_signature_text)) < 3 THEN RAISE EXCEPTION 'valid_signature_required'; END IF;

  SELECT lifecycle_status INTO v_status FROM public.profiles WHERE id = v_user;
  SELECT EXISTS (
    SELECT 1 FROM public.students s WHERE s.user_id = v_user AND s.application_status = 'accepted'
  ) INTO v_accepted;
  SELECT COUNT(DISTINCT op.step) >= 9 INTO v_orientation_complete
  FROM public.orientation_progress op WHERE op.user_id = v_user;
  SELECT EXISTS (SELECT 1 FROM public.matriculation_records mr WHERE mr.user_id = v_user) INTO v_existing;

  IF v_status IN ('enrolled','active') AND v_existing THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true, 'lifecycle_status', v_status);
  END IF;
  IF v_status <> 'admitted' THEN RAISE EXCEPTION 'admitted_status_required'; END IF;
  IF NOT v_accepted THEN RAISE EXCEPTION 'accepted_admission_required'; END IF;
  IF NOT v_orientation_complete THEN RAISE EXCEPTION 'orientation_completion_required'; END IF;

  IF NOT v_existing THEN
    INSERT INTO public.matriculation_records(user_id, oath_signed_at, signature_text, cohort_label)
    VALUES (v_user, now(), trim(p_signature_text), p_cohort_label);
  END IF;

  PERFORM public.transition_student_status(v_user, 'enrolled', 'Matriculation oath completed through canonical authority');
  RETURN jsonb_build_object('success', true, 'lifecycle_status', 'enrolled');
END;
$$;

REVOKE ALL ON FUNCTION public.complete_student_matriculation(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_student_matriculation(text,text) TO authenticated, service_role;
COMMENT ON FUNCTION public.complete_student_matriculation(text,text) IS
  'Canonical atomic orientation->matriculation->enrolled boundary. Formal academic credential issuance is separate.';

-- Course access accepts governed section enrollment as the canonical new evidence,
-- while historical course-level rows remain read-compatible.
CREATE OR REPLACE FUNCTION public.can_access_course(_user_id uuid, _course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  v_is_admin := public.has_role(_user_id, 'admin'::public.app_role) OR public.has_role(_user_id, 'superadmin'::public.app_role);
  v_is_faculty := public.has_role(_user_id, 'faculty'::public.app_role);
  IF v_is_admin THEN RETURN jsonb_build_object('allowed', true, 'access_level', 'admin', 'reason', 'admin_override', 'missing', v_missing); END IF;
  IF v_visibility = 'admin_only' THEN RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'admin_only', 'missing', ARRAY['admin_role']); END IF;
  IF v_is_faculty THEN RETURN jsonb_build_object('allowed', true, 'access_level', 'faculty', 'reason', 'faculty_role', 'missing', v_missing); END IF;
  IF v_visibility = 'role_only' THEN RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'role_required', 'missing', ARRAY['faculty_or_admin']); END IF;

  SELECT lifecycle_status INTO v_lifecycle FROM public.profiles WHERE id = _user_id;
  SELECT EXISTS (
    SELECT 1 FROM public.student_holds
    WHERE user_id = _user_id AND COALESCE(blocks_registration, false) = true AND resolved_at IS NULL
  ) INTO v_has_block_hold;
  IF v_has_block_hold THEN RETURN jsonb_build_object('allowed', false, 'access_level', 'none', 'reason', 'student_hold', 'missing', ARRAY['resolve_hold']); END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.section_enrollments se
      JOIN public.course_sections cs ON cs.id = se.section_id
      WHERE se.student_user_id = _user_id AND se.status = 'enrolled' AND cs.course_id = _course_id
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e WHERE e.user_id = _user_id AND e.course_id = _course_id
    )
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
        WHERE user_id = _user_id AND course_id::text = v_prereq_id AND COALESCE(progress, 0) >= 100
      ) OR EXISTS (
        SELECT 1 FROM public.grade_records gr
        WHERE gr.student_id = _user_id AND gr.course_id::text = v_prereq_id
          AND COALESCE(gr.is_final,false) = true AND COALESCE(gr.grade_points,0) >= 1.0
      ) INTO v_prereq_done;
      IF NOT v_prereq_done THEN v_missing := array_append(v_missing, 'prereq:' || v_prereq_id); END IF;
    END LOOP;
  END IF;

  IF array_length(v_missing, 1) > 0 AND NOT v_enrolled THEN
    RETURN jsonb_build_object('allowed', true, 'access_level', 'preview', 'reason', 'prerequisites_unmet', 'missing', v_missing);
  END IF;

  IF v_enrolled THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'access_level', CASE WHEN v_lifecycle IN ('active','enrolled','admitted','graduated','alumni') THEN 'enrolled' ELSE 'audit' END,
      'reason', 'enrolled', 'missing', v_missing
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'access_level', 'preview', 'reason', 'public_preview_default', 'missing', v_missing);
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_course(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid,uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.can_access_course(uuid,uuid) IS
  'Canonical course-access authority: governed section enrollment for new registrations + legacy enrollment read compatibility.';
