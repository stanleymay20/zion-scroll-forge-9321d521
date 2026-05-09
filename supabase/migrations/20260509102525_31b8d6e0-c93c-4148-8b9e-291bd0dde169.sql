CREATE OR REPLACE FUNCTION public.issue_certificate(
  p_user_id uuid,
  p_cert_type text,
  p_program_name text,
  p_entity_id uuid DEFAULT NULL::uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_seq int;
  v_cert_number text;
  v_seal_hash text;
  v_student_name text;
  v_student_code text;
  v_type_prefix text;
  v_existing text;
  v_lifecycle text;
  v_enrolled boolean;
  v_has_block_hold boolean;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'superadmin')
              OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin');

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.student_holds
      WHERE user_id = p_user_id
        AND COALESCE(blocks_registration, false) = true
        AND resolved_at IS NULL
    ) INTO v_has_block_hold;

    IF v_has_block_hold THEN
      RAISE EXCEPTION 'Cannot issue %: unresolved student hold blocks credentialing', p_cert_type
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT lifecycle_status INTO v_lifecycle FROM public.profiles WHERE id = p_user_id;

    IF p_cert_type = 'course' THEN
      IF p_entity_id IS NULL THEN
        RAISE EXCEPTION 'Course certificate requires entity_id';
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE user_id = p_user_id AND course_id = p_entity_id
      ) INTO v_enrolled;

      IF NOT v_enrolled THEN
        RAISE EXCEPTION 'Cannot issue course certificate: student is not enrolled in this course'
          USING ERRCODE = 'check_violation';
      END IF;
    ELSIF p_cert_type IN ('program','degree') THEN
      IF v_lifecycle IS NULL OR v_lifecycle NOT IN ('enrolled','active','graduated','alumni') THEN
        RAISE EXCEPTION 'Cannot issue %: student must be admitted and enrolled (current status: %)', p_cert_type, COALESCE(v_lifecycle,'none')
          USING ERRCODE = 'check_violation';
      END IF;
    ELSIF p_cert_type = 'matriculation' THEN
      IF v_lifecycle IS NULL OR v_lifecycle NOT IN ('admitted','enrolled','active','graduated','alumni') THEN
        RAISE EXCEPTION 'Cannot issue matriculation: student must be admitted (current status: %)', COALESCE(v_lifecycle,'none')
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  IF p_cert_type IN ('course','program','degree','matriculation') THEN
    SELECT cert_number INTO v_existing
    FROM public.certificate_verifications
    WHERE user_id = p_user_id
      AND cert_type = p_cert_type
      AND COALESCE(entity_id::text,'') = COALESCE(p_entity_id::text,'')
      AND revoked = false
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('cert_number', v_existing, 'reused', true);
    END IF;
  END IF;

  v_type_prefix := CASE p_cert_type
    WHEN 'course' THEN 'CRT'
    WHEN 'program' THEN 'PRG'
    WHEN 'degree' THEN 'DEG'
    WHEN 'transcript' THEN 'TRN'
    WHEN 'matriculation' THEN 'MAT'
    WHEN 'seal' THEN 'SEAL'
    ELSE 'GEN'
  END;

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.certificate_verifications
  WHERE cert_type = p_cert_type
    AND EXTRACT(YEAR FROM issued_at) = v_year;

  v_cert_number := 'SU-' || v_year || '-' || v_type_prefix || '-' || lpad(v_seq::text, 5, '0');

  SELECT COALESCE(p.full_name, p.email, 'Student'), s.student_id_code
    INTO v_student_name, v_student_code
  FROM public.profiles p
  LEFT JOIN public.students s ON s.user_id = p.id
  WHERE p.id = p_user_id;

  v_seal_hash := encode(
    extensions.digest(
      v_cert_number || '|' || p_user_id::text || '|' || p_program_name || '|' || now()::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.certificate_verifications (
    cert_number, user_id, cert_type, entity_id,
    program_name, student_name, student_id_code,
    seal_hash, metadata
  ) VALUES (
    v_cert_number, p_user_id, p_cert_type, p_entity_id,
    p_program_name, COALESCE(v_student_name,'Student'), v_student_code,
    v_seal_hash, p_metadata
  );

  RETURN jsonb_build_object(
    'cert_number', v_cert_number,
    'seal_hash', v_seal_hash,
    'reused', false
  );
END;
$function$;

CREATE POLICY "Users update own matriculation"
ON public.matriculation_records
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);