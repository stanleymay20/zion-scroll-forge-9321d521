
-- Identity lock trigger on students
CREATE OR REPLACE FUNCTION public.enforce_academic_identity_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_is_privileged boolean;
  v_bypass boolean;
BEGIN
  v_bypass := COALESCE(current_setting('app.allow_identity_change', true), '') = 'on';
  IF v_bypass THEN RETURN NEW; END IF;

  v_is_privileged := v_actor IS NOT NULL AND (
    public.has_role(v_actor, 'admin'::app_role)
    OR public.has_role(v_actor, 'superadmin'::app_role)
    OR public.has_role(v_actor, 'registrar'::app_role)
  );
  IF v_is_privileged THEN RETURN NEW; END IF;

  IF NEW.degree_program_id IS DISTINCT FROM OLD.degree_program_id
     OR NEW.cohort_number   IS DISTINCT FROM OLD.cohort_number
     OR NEW.current_year    IS DISTINCT FROM OLD.current_year
     OR NEW.current_term    IS DISTINCT FROM OLD.current_term
     OR NEW.application_status IS DISTINCT FROM OLD.application_status
  THEN
    PERFORM public.log_suyas_action(
      'identity_lock_violation_attempt','student', OLD.id,
      to_jsonb(OLD), to_jsonb(NEW),
      'Direct change to locked academic identity field blocked'
    );
    RAISE EXCEPTION 'Academic identity is locked. Submit a Program Transfer Request to change your degree program, cohort, or academic year.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_academic_identity_lock ON public.students;
CREATE TRIGGER trg_enforce_academic_identity_lock
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.enforce_academic_identity_lock();

-- Lifecycle lock on profiles
CREATE OR REPLACE FUNCTION public.enforce_lifecycle_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_bypass boolean;
BEGIN
  v_bypass := COALESCE(current_setting('app.allow_lifecycle_change', true), '') = 'on';
  IF v_bypass THEN RETURN NEW; END IF;

  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    IF v_actor IS NULL OR NOT (
      public.has_role(v_actor, 'admin'::app_role)
      OR public.has_role(v_actor, 'superadmin'::app_role)
      OR public.has_role(v_actor, 'registrar'::app_role)
    ) THEN
      RAISE EXCEPTION 'Lifecycle status is governed. Use transition_student_status().'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lifecycle_lock ON public.profiles;
CREATE TRIGGER trg_enforce_lifecycle_lock
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_lifecycle_lock();

-- Update transition_student_status to bypass lifecycle lock
CREATE OR REPLACE FUNCTION public.transition_student_status(p_user_id uuid, p_new_status text, p_reason text DEFAULT NULL::text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
  v_valid_transition boolean := false;
BEGIN
  SELECT lifecycle_status INTO v_current_status FROM profiles WHERE id = p_user_id;

  v_valid_transition := CASE
    WHEN v_current_status = 'applicant' AND p_new_status IN ('admitted', 'withdrawn') THEN true
    WHEN v_current_status = 'admitted' AND p_new_status IN ('enrolled', 'withdrawn') THEN true
    WHEN v_current_status = 'enrolled' AND p_new_status IN ('active', 'withdrawn') THEN true
    WHEN v_current_status = 'active' AND p_new_status IN ('on_leave', 'withdrawn', 'graduated') THEN true
    WHEN v_current_status = 'on_leave' AND p_new_status IN ('active', 'withdrawn') THEN true
    WHEN v_current_status = 'graduated' AND p_new_status = 'alumni' THEN true
    WHEN v_current_status = 'alumni' AND p_new_status = 'alumni' THEN true
    ELSE false
  END;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
  END IF;

  PERFORM set_config('app.allow_lifecycle_change', 'on', true);
  UPDATE profiles SET
    lifecycle_status = p_new_status,
    admitted_at  = CASE WHEN p_new_status = 'admitted'  THEN now() ELSE admitted_at END,
    enrolled_at  = CASE WHEN p_new_status = 'enrolled'  THEN now() ELSE enrolled_at END,
    graduated_at = CASE WHEN p_new_status = 'graduated' THEN now() ELSE graduated_at END,
    withdrawn_at = CASE WHEN p_new_status = 'withdrawn' THEN now() ELSE withdrawn_at END,
    updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.allow_lifecycle_change', 'off', true);

  PERFORM log_suyas_action(
    'status_transition', 'student', p_user_id,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_new_status), p_reason
  );
  RETURN true;
END;
$function$;

-- Enrollments transfer columns
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS transfer_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS transferred_from_program_id uuid REFERENCES public.degree_programs(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_transfer_status_chk') THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_transfer_status_chk
      CHECK (transfer_status IN ('active','transferred','non_transferable','archived'));
  END IF;
END$$;

-- program_transfer_requests
CREATE TABLE IF NOT EXISTS public.program_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_program_id uuid REFERENCES public.degree_programs(id),
  to_program_id   uuid NOT NULL REFERENCES public.degree_programs(id),
  reason text NOT NULL,
  academic_justification text,
  supporting_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  effective_term text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_transfer_requests_status_chk CHECK (
    status IN ('submitted','advisor_review','faculty_review','registrar_review','approved','denied','withdrawn','archived')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_transfer_per_student
  ON public.program_transfer_requests(student_user_id)
  WHERE status IN ('submitted','advisor_review','faculty_review','registrar_review');
CREATE INDEX IF NOT EXISTS idx_ptr_status ON public.program_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_ptr_student ON public.program_transfer_requests(student_user_id);

ALTER TABLE public.program_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own transfer requests"
  ON public.program_transfer_requests FOR SELECT USING (auth.uid() = student_user_id);
CREATE POLICY "reviewers read transfer requests"
  ON public.program_transfer_requests FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty')
    OR public.has_role(auth.uid(),'registrar')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'superadmin')
  );

DROP TRIGGER IF EXISTS trg_ptr_updated_at ON public.program_transfer_requests;
CREATE TRIGGER trg_ptr_updated_at
BEFORE UPDATE ON public.program_transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- transfer_review_notes
CREATE TABLE IF NOT EXISTS public.transfer_review_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.program_transfer_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  reviewer_role text NOT NULL,
  stage text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trn_request ON public.transfer_review_notes(request_id);
ALTER TABLE public.transfer_review_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own request notes"
  ON public.transfer_review_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.program_transfer_requests r
    WHERE r.id = request_id AND r.student_user_id = auth.uid()
  ));
CREATE POLICY "reviewers read all notes"
  ON public.transfer_review_notes FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty')
    OR public.has_role(auth.uid(),'registrar')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'superadmin')
  );

-- transfer_decisions (immutable)
CREATE TABLE IF NOT EXISTS public.transfer_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.program_transfer_requests(id) ON DELETE CASCADE,
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decision text NOT NULL CHECK (decision IN ('approved','denied')),
  prior_program_id uuid,
  new_program_id uuid,
  prior_student_snapshot jsonb NOT NULL,
  credit_remap jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text,
  decided_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transfer_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own decision"
  ON public.transfer_decisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.program_transfer_requests r
    WHERE r.id = request_id AND r.student_user_id = auth.uid()
  ));
CREATE POLICY "registrar admin read decisions"
  ON public.transfer_decisions FOR SELECT
  USING (
    public.has_role(auth.uid(),'registrar')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'superadmin')
  );

-- RPCs
CREATE OR REPLACE FUNCTION public.submit_transfer_request(
  p_to_program_id uuid, p_reason text,
  p_academic_justification text DEFAULT NULL,
  p_supporting_docs jsonb DEFAULT '[]'::jsonb,
  p_effective_term text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid(); v_from uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF p_to_program_id IS NULL THEN RAISE EXCEPTION 'to_program_id required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A meaningful reason (10+ chars) is required';
  END IF;

  SELECT degree_program_id INTO v_from FROM public.students WHERE user_id = v_user;
  IF v_from IS NULL THEN
    RAISE EXCEPTION 'You must be an admitted student to submit a transfer request';
  END IF;
  IF v_from = p_to_program_id THEN
    RAISE EXCEPTION 'You are already in this program';
  END IF;

  INSERT INTO public.program_transfer_requests(
    student_user_id, from_program_id, to_program_id, reason,
    academic_justification, supporting_docs, effective_term, status
  ) VALUES (
    v_user, v_from, p_to_program_id, p_reason,
    p_academic_justification, COALESCE(p_supporting_docs,'[]'::jsonb), p_effective_term, 'submitted'
  ) RETURNING id INTO v_id;

  PERFORM public.log_suyas_action(
    'transfer_submitted','program_transfer_request', v_id, NULL,
    jsonb_build_object('from', v_from, 'to', p_to_program_id, 'reason', p_reason),
    'Student submitted program transfer request'
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_transfer_request(p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid(); v_status text; v_owner uuid;
BEGIN
  SELECT status, student_user_id INTO v_status, v_owner
  FROM public.program_transfer_requests WHERE id = p_request_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_owner <> v_user THEN RAISE EXCEPTION 'only the requester may withdraw'; END IF;
  IF v_status IN ('approved','denied','withdrawn','archived') THEN
    RAISE EXCEPTION 'request already finalized (%)', v_status;
  END IF;

  UPDATE public.program_transfer_requests
    SET status = 'withdrawn', decided_at = now()
  WHERE id = p_request_id;

  PERFORM public.log_suyas_action(
    'transfer_withdrawn','program_transfer_request', p_request_id,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'withdrawn'),
    'Student withdrew transfer request'
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_transfer_request(
  p_request_id uuid, p_next_status text, p_note text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid(); v_status text; v_role text; v_allowed boolean := false;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_next_status NOT IN ('advisor_review','faculty_review','registrar_review','archived') THEN
    RAISE EXCEPTION 'invalid next status %', p_next_status;
  END IF;

  SELECT status INTO v_status FROM public.program_transfer_requests WHERE id = p_request_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_status IN ('approved','denied','withdrawn','archived') THEN
    RAISE EXCEPTION 'request already finalized (%)', v_status;
  END IF;

  v_allowed := CASE
    WHEN v_status = 'submitted'      AND p_next_status = 'advisor_review'
      AND (public.has_role(v_actor,'faculty') OR public.has_role(v_actor,'registrar') OR public.has_role(v_actor,'admin') OR public.has_role(v_actor,'superadmin')) THEN true
    WHEN v_status = 'advisor_review' AND p_next_status = 'faculty_review'
      AND (public.has_role(v_actor,'faculty') OR public.has_role(v_actor,'registrar') OR public.has_role(v_actor,'admin') OR public.has_role(v_actor,'superadmin')) THEN true
    WHEN v_status = 'faculty_review' AND p_next_status = 'registrar_review'
      AND (public.has_role(v_actor,'faculty') OR public.has_role(v_actor,'registrar') OR public.has_role(v_actor,'admin') OR public.has_role(v_actor,'superadmin')) THEN true
    WHEN p_next_status = 'archived'
      AND (public.has_role(v_actor,'registrar') OR public.has_role(v_actor,'admin') OR public.has_role(v_actor,'superadmin')) THEN true
    ELSE false
  END;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not permitted to advance from % to %', v_status, p_next_status
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_role := CASE
    WHEN public.has_role(v_actor,'admin') THEN 'admin'
    WHEN public.has_role(v_actor,'superadmin') THEN 'superadmin'
    WHEN public.has_role(v_actor,'registrar') THEN 'registrar'
    WHEN public.has_role(v_actor,'faculty') THEN 'faculty'
    ELSE 'reviewer'
  END;

  UPDATE public.program_transfer_requests SET status = p_next_status WHERE id = p_request_id;

  IF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO public.transfer_review_notes(request_id, reviewer_id, reviewer_role, stage, note)
    VALUES (p_request_id, v_actor, v_role, p_next_status, p_note);
  END IF;

  PERFORM public.log_suyas_action(
    'transfer_advanced','program_transfer_request', p_request_id,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', p_next_status, 'reviewer', v_actor),
    p_note
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_transfer_request(
  p_request_id uuid, p_decision text,
  p_credit_remap jsonb DEFAULT '[]'::jsonb,
  p_rationale text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid(); v_req record; v_old_student jsonb;
  v_remap jsonb; v_item jsonb; v_eid uuid; v_action text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.has_role(v_actor,'registrar') OR public.has_role(v_actor,'admin') OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'Only registrar or admin may decide transfer requests'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_decision NOT IN ('approved','denied') THEN
    RAISE EXCEPTION 'decision must be approved or denied';
  END IF;

  SELECT * INTO v_req FROM public.program_transfer_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status IN ('approved','denied','withdrawn','archived') THEN
    RAISE EXCEPTION 'request already finalized (%)', v_req.status;
  END IF;

  SELECT to_jsonb(s) INTO v_old_student FROM public.students s WHERE s.user_id = v_req.student_user_id;

  IF p_decision = 'denied' THEN
    UPDATE public.program_transfer_requests SET status = 'denied', decided_at = now() WHERE id = p_request_id;
    INSERT INTO public.transfer_decisions(
      request_id, decided_by, decision, prior_program_id, new_program_id,
      prior_student_snapshot, credit_remap, rationale
    ) VALUES (
      p_request_id, v_actor, 'denied', v_req.from_program_id, v_req.to_program_id,
      COALESCE(v_old_student,'{}'::jsonb), '[]'::jsonb, p_rationale
    );
    PERFORM public.log_suyas_action(
      'transfer_denied','program_transfer_request', p_request_id,
      jsonb_build_object('status', v_req.status),
      jsonb_build_object('status','denied','rationale', p_rationale),
      p_rationale
    );
    RETURN jsonb_build_object('decision','denied');
  END IF;

  PERFORM set_config('app.allow_identity_change', 'on', true);
  UPDATE public.students
    SET degree_program_id = v_req.to_program_id,
        current_year = 1,
        current_term = COALESCE(v_req.effective_term, current_term)
  WHERE user_id = v_req.student_user_id;
  PERFORM set_config('app.allow_identity_change', 'off', true);

  v_remap := COALESCE(p_credit_remap, '[]'::jsonb);
  IF jsonb_array_length(v_remap) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_remap) LOOP
      v_eid := (v_item->>'enrollment_id')::uuid;
      v_action := COALESCE(v_item->>'action','archived');
      IF v_action NOT IN ('transferred','non_transferable','archived','active') THEN
        v_action := 'archived';
      END IF;
      UPDATE public.enrollments
        SET transfer_status = v_action,
            transferred_from_program_id = v_req.from_program_id
      WHERE id = v_eid AND user_id = v_req.student_user_id;
    END LOOP;
  ELSE
    UPDATE public.enrollments
      SET transfer_status = 'archived',
          transferred_from_program_id = v_req.from_program_id
    WHERE user_id = v_req.student_user_id AND transfer_status = 'active';
  END IF;

  UPDATE public.program_transfer_requests SET status = 'approved', decided_at = now() WHERE id = p_request_id;
  INSERT INTO public.transfer_decisions(
    request_id, decided_by, decision, prior_program_id, new_program_id,
    prior_student_snapshot, credit_remap, rationale
  ) VALUES (
    p_request_id, v_actor, 'approved', v_req.from_program_id, v_req.to_program_id,
    COALESCE(v_old_student,'{}'::jsonb), v_remap, p_rationale
  );
  PERFORM public.log_suyas_action(
    'transfer_approved','program_transfer_request', p_request_id,
    jsonb_build_object('from_program', v_req.from_program_id),
    jsonb_build_object('to_program', v_req.to_program_id, 'remap', v_remap),
    p_rationale
  );

  RETURN jsonb_build_object(
    'decision','approved',
    'from_program', v_req.from_program_id,
    'to_program', v_req.to_program_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_transfer_request(uuid,text,text,jsonb,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.withdraw_transfer_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_transfer_request(uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_transfer_request(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_transfer_request(uuid,text,text,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_transfer_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_transfer_request(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_transfer_request(uuid,text,jsonb,text) TO authenticated;
