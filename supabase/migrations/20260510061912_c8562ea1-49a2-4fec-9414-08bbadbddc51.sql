
CREATE TABLE IF NOT EXISTS public.program_assignment_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_program_id UUID NOT NULL REFERENCES public.degree_programs(id) ON DELETE RESTRICT,
  student_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','superseded')),
  reviewed_by UUID,
  reviewer_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pac_user ON public.program_assignment_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_pac_status ON public.program_assignment_confirmations(status);

ALTER TABLE public.program_assignment_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own confirmations" ON public.program_assignment_confirmations;
CREATE POLICY "Students view own confirmations"
ON public.program_assignment_confirmations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

DROP POLICY IF EXISTS "Students insert own confirmations" ON public.program_assignment_confirmations;
CREATE POLICY "Students insert own confirmations"
ON public.program_assignment_confirmations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Registrar updates confirmations" ON public.program_assignment_confirmations;
CREATE POLICY "Registrar updates confirmations"
ON public.program_assignment_confirmations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE OR REPLACE FUNCTION public.update_pac_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_pac_updated_at ON public.program_assignment_confirmations;
CREATE TRIGGER trg_pac_updated_at BEFORE UPDATE ON public.program_assignment_confirmations
FOR EACH ROW EXECUTE FUNCTION public.update_pac_updated_at();

CREATE OR REPLACE FUNCTION public.student_confirm_program_intent(p_program_id UUID, p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_student RECORD; v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A written reason of at least 10 characters is required';
  END IF;
  SELECT application_status, degree_program_id INTO v_student
  FROM public.students WHERE user_id = v_uid ORDER BY created_at DESC LIMIT 1;
  IF v_student IS NULL OR v_student.application_status <> 'accepted' THEN
    RAISE EXCEPTION 'Only accepted students may confirm a program';
  END IF;
  IF v_student.degree_program_id IS NOT NULL THEN
    RAISE EXCEPTION 'A degree program is already assigned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.degree_programs WHERE id = p_program_id AND is_active = true) THEN
    RAISE EXCEPTION 'Selected program is not active';
  END IF;
  UPDATE public.program_assignment_confirmations SET status='superseded', updated_at=now()
  WHERE user_id = v_uid AND status = 'pending';
  INSERT INTO public.program_assignment_confirmations (user_id, requested_program_id, student_reason)
  VALUES (v_uid, p_program_id, trim(p_reason)) RETURNING id INTO v_id;
  INSERT INTO public.suyas_audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'student_program_confirmation', 'program_assignment_confirmation', v_id,
          jsonb_build_object('requested_program_id', p_program_id, 'reason', trim(p_reason)));
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.student_confirm_program_intent(UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.registrar_assign_program(UUID, UUID, TEXT);
CREATE FUNCTION public.registrar_assign_program(p_user_id UUID, p_program_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_actor,'admin') OR public.has_role(v_actor,'registrar')) THEN
    RAISE EXCEPTION 'Only Admin or Registrar may assign programs';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A written justification of at least 10 characters is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.degree_programs WHERE id = p_program_id AND is_active = true) THEN
    RAISE EXCEPTION 'Program is not active';
  END IF;
  UPDATE public.students SET degree_program_id = p_program_id, updated_at = now()
  WHERE user_id = p_user_id;
  UPDATE public.student_holds SET status='resolved', resolved_at=now(), resolved_by=v_actor,
    resolution_reason=trim(p_reason)
  WHERE user_id = p_user_id AND hold_type = 'program_assignment_required' AND status = 'active';
  UPDATE public.program_assignment_confirmations
  SET status='approved', reviewed_by=v_actor, reviewer_reason=trim(p_reason), reviewed_at=now()
  WHERE user_id = p_user_id AND status = 'pending';
  INSERT INTO public.suyas_audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_actor, 'registrar_program_assignment', 'student', p_user_id,
          jsonb_build_object('program_id', p_program_id, 'reason', trim(p_reason)));
END; $$;
GRANT EXECUTE ON FUNCTION public.registrar_assign_program(UUID, UUID, TEXT) TO authenticated;
