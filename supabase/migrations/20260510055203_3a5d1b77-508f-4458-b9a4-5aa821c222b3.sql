CREATE OR REPLACE FUNCTION public.registrar_assign_program(
  p_user_id uuid,
  p_program_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing uuid;
  v_program_active boolean;
  v_status text;
  v_hold_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT (public.has_role(v_actor,'registrar')
       OR public.has_role(v_actor,'admin')
       OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'Registrar or admin role required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_user_id IS NULL OR p_program_id IS NULL THEN
    RAISE EXCEPTION 'user_id and program_id are required';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A written reason of at least 10 characters is required for Registrar program assignment';
  END IF;

  SELECT degree_program_id, application_status
    INTO v_existing, v_status
  FROM public.students
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'No student record found for this user';
  END IF;
  IF v_status <> 'accepted' THEN
    RAISE EXCEPTION 'Student application status is "%". Registrar program assignment is reserved for accepted students.', v_status;
  END IF;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Student already has a degree program. Use the formal program transfer workflow instead.';
  END IF;

  SELECT is_active INTO v_program_active FROM public.degree_programs WHERE id = p_program_id;
  IF v_program_active IS NULL THEN
    RAISE EXCEPTION 'Target degree program does not exist';
  END IF;
  IF NOT v_program_active THEN
    RAISE EXCEPTION 'Target degree program is not active';
  END IF;

  UPDATE public.students
     SET degree_program_id = p_program_id,
         updated_at = now()
   WHERE user_id = p_user_id;

  UPDATE public.student_holds
     SET resolved_at = now(),
         resolved_by = v_actor,
         resolution_notes = p_reason,
         is_active = false,
         removed_by = v_actor,
         removed_at = now()
   WHERE user_id = p_user_id
     AND hold_type = 'program_assignment_required'
     AND resolved_at IS NULL
   RETURNING id INTO v_hold_id;

  PERFORM public.log_suyas_action(
    'registrar_program_assignment',
    'student',
    p_user_id,
    jsonb_build_object('degree_program_id', NULL, 'previous_status', 'program_assignment_required'),
    jsonb_build_object('degree_program_id', p_program_id, 'hold_resolved', v_hold_id IS NOT NULL),
    p_reason
  );

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'degree_program_id', p_program_id,
    'hold_resolved', v_hold_id IS NOT NULL,
    'reason', p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_assign_program(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_assign_program(uuid, uuid, text) TO authenticated;