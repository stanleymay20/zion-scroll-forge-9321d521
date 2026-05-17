
-- 1. Extend student_holds with lifecycle
ALTER TABLE public.student_holds
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'open'
    CHECK (lifecycle_state IN ('open','under_review','provisional','resolved','overturned','escalated')),
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'moderate'
    CHECK (severity IN ('minor','moderate','major','severe')),
  ADD COLUMN IF NOT EXISTS triggered_by_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_signal jsonb,
  ADD COLUMN IF NOT EXISTS review_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sanction_type text,
  ADD COLUMN IF NOT EXISTS temporary_restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reinstatement_conditions text,
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz;

-- 2. Block DELETE on student_holds (immutable governance record)
CREATE OR REPLACE FUNCTION public.tg_block_hold_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Integrity holds are immutable governance records and cannot be deleted (hold_id=%).', OLD.id;
END;
$$;
DROP TRIGGER IF EXISTS trg_block_hold_delete ON public.student_holds;
CREATE TRIGGER trg_block_hold_delete
  BEFORE DELETE ON public.student_holds
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_hold_delete();

-- 3. integrity_appeals
CREATE TABLE IF NOT EXISTS public.integrity_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id uuid NOT NULL REFERENCES public.student_holds(id),
  student_user_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'submitted'
    CHECK (state IN ('submitted','acknowledged','in_review','awaiting_evidence','decided','closed')),
  statement text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  decision_due_at timestamptz,
  outcome text CHECK (outcome IN ('upheld','overturned','reduced','dismissed')),
  outcome_rationale_public text,
  outcome_rationale_internal text,
  decided_by uuid,
  decided_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_integrity_appeals_student ON public.integrity_appeals(student_user_id);
CREATE INDEX IF NOT EXISTS idx_integrity_appeals_hold ON public.integrity_appeals(hold_id);
ALTER TABLE public.integrity_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own appeals"
  ON public.integrity_appeals FOR SELECT
  USING (auth.uid() = student_user_id);
CREATE POLICY "Staff view all appeals"
  ON public.integrity_appeals FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Staff manage appeals"
  ON public.integrity_appeals FOR UPDATE
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
-- Inserts happen via SECURITY DEFINER function only
REVOKE INSERT, DELETE ON public.integrity_appeals FROM authenticated;

-- 4. integrity_case_reviews (reviewer assignment)
CREATE TABLE IF NOT EXISTS public.integrity_case_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id uuid NOT NULL REFERENCES public.student_holds(id),
  appeal_id uuid REFERENCES public.integrity_appeals(id),
  reviewer_user_id uuid NOT NULL,
  reviewer_role text NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  decision text CHECK (decision IN ('uphold','overturn','reduce','dismiss','escalate')),
  decision_at timestamptz,
  confidential_notes text,
  public_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integrity_case_reviews ENABLE ROW LEVEL SECURITY;
-- Students DO NOT get SELECT on this table (contains confidential_notes)
CREATE POLICY "Staff view all case reviews"
  ON public.integrity_case_reviews FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Staff manage case reviews"
  ON public.integrity_case_reviews FOR ALL
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );

-- 5. integrity_case_evidence
CREATE TABLE IF NOT EXISTS public.integrity_case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id uuid NOT NULL REFERENCES public.student_holds(id),
  appeal_id uuid REFERENCES public.integrity_appeals(id),
  submitted_by uuid NOT NULL,
  source_type text NOT NULL, -- student | faculty | system | ai_signal
  title text NOT NULL,
  description text,
  evidence_url text,
  is_confidential boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integrity_case_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own non-confidential evidence"
  ON public.integrity_case_evidence FOR SELECT
  USING (
    NOT is_confidential
    AND EXISTS (SELECT 1 FROM public.student_holds h WHERE h.id = hold_id AND h.user_id = auth.uid())
  );
CREATE POLICY "Staff view all evidence"
  ON public.integrity_case_evidence FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
CREATE POLICY "Students submit own evidence"
  ON public.integrity_case_evidence FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by
    AND is_confidential = false
    AND EXISTS (SELECT 1 FROM public.student_holds h WHERE h.id = hold_id AND h.user_id = auth.uid())
  );
CREATE POLICY "Staff submit evidence"
  ON public.integrity_case_evidence FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by
    AND (
      public.has_role(auth.uid(),'faculty') OR
      public.has_role(auth.uid(),'registrar') OR
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'superadmin')
    )
  );

-- 6. integrity_notifications (append-only)
CREATE TABLE IF NOT EXISTS public.integrity_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id uuid NOT NULL REFERENCES public.student_holds(id),
  appeal_id uuid REFERENCES public.integrity_appeals(id),
  student_user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid
);
ALTER TABLE public.integrity_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own notifications"
  ON public.integrity_notifications FOR SELECT
  USING (auth.uid() = student_user_id);
CREATE POLICY "Staff view all notifications"
  ON public.integrity_notifications FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
-- No UPDATE/DELETE policies → append-only

-- 7. integrity_decision_history (immutable)
CREATE TABLE IF NOT EXISTS public.integrity_decision_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id uuid NOT NULL REFERENCES public.student_holds(id),
  appeal_id uuid REFERENCES public.integrity_appeals(id),
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL,
  from_state text,
  to_state text NOT NULL,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integrity_decision_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own decision history"
  ON public.integrity_decision_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.student_holds h WHERE h.id = hold_id AND h.user_id = auth.uid()));
CREATE POLICY "Staff view all decision history"
  ON public.integrity_decision_history FOR SELECT
  USING (
    public.has_role(auth.uid(),'faculty') OR
    public.has_role(auth.uid(),'registrar') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'superadmin')
  );
-- No UPDATE/DELETE policies → append-only

-- 8. submit_integrity_appeal
CREATE OR REPLACE FUNCTION public.submit_integrity_appeal(
  _hold_id uuid,
  _statement text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_hold record;
  v_appeal_id uuid;
  v_existing int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _statement IS NULL OR length(trim(_statement)) < 30 THEN
    RAISE EXCEPTION 'Appeal statement must be at least 30 characters.';
  END IF;

  SELECT * INTO v_hold FROM public.student_holds WHERE id = _hold_id;
  IF v_hold IS NULL THEN RAISE EXCEPTION 'hold not found'; END IF;
  IF v_hold.user_id <> v_user THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_hold.lifecycle_state IN ('resolved','overturned') THEN
    RAISE EXCEPTION 'Hold is already resolved; appeal not permitted.';
  END IF;

  SELECT COUNT(*) INTO v_existing FROM public.integrity_appeals
    WHERE hold_id = _hold_id AND state NOT IN ('decided','closed');
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'An active appeal already exists for this hold.';
  END IF;

  INSERT INTO public.integrity_appeals
    (hold_id, student_user_id, state, statement, decision_due_at)
  VALUES
    (_hold_id, v_user, 'submitted', _statement, now() + interval '14 days')
  RETURNING id INTO v_appeal_id;

  UPDATE public.student_holds
    SET lifecycle_state = 'under_review',
        review_due_at = COALESCE(review_due_at, now() + interval '7 days'),
        updated_at = now()
    WHERE id = _hold_id;

  INSERT INTO public.integrity_decision_history
    (hold_id, appeal_id, actor_user_id, actor_role, from_state, to_state, rationale)
  VALUES
    (_hold_id, v_appeal_id, v_user, 'student', v_hold.lifecycle_state, 'under_review', 'Appeal submitted by student');

  INSERT INTO public.integrity_notifications
    (hold_id, appeal_id, student_user_id, subject, body, sent_by)
  VALUES
    (_hold_id, v_appeal_id, v_user,
     'Appeal received',
     'Your appeal has been received and is now under review. A decision is expected within 14 days.',
     v_user);

  RETURN jsonb_build_object('appeal_id', v_appeal_id, 'state', 'submitted');
END;
$$;
REVOKE ALL ON FUNCTION public.submit_integrity_appeal(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_integrity_appeal(uuid,text) TO authenticated;

-- 9. decide_integrity_appeal (staff)
CREATE OR REPLACE FUNCTION public.decide_integrity_appeal(
  _appeal_id uuid,
  _outcome text,
  _public_rationale text,
  _internal_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_appeal record;
  v_hold record;
  v_to_state text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  IF public.has_role(v_user,'superadmin') THEN v_role := 'superadmin';
  ELSIF public.has_role(v_user,'admin') THEN v_role := 'admin';
  ELSIF public.has_role(v_user,'registrar') THEN v_role := 'registrar';
  ELSIF public.has_role(v_user,'faculty') THEN v_role := 'faculty';
  ELSE RAISE EXCEPTION 'forbidden: human reviewer role required';
  END IF;

  IF _outcome NOT IN ('upheld','overturned','reduced','dismissed') THEN
    RAISE EXCEPTION 'invalid outcome';
  END IF;
  IF _public_rationale IS NULL OR length(trim(_public_rationale)) < 20 THEN
    RAISE EXCEPTION 'Public rationale required (≥20 chars) for student transparency.';
  END IF;

  SELECT * INTO v_appeal FROM public.integrity_appeals WHERE id = _appeal_id;
  IF v_appeal IS NULL THEN RAISE EXCEPTION 'appeal not found'; END IF;
  IF v_appeal.state IN ('decided','closed') THEN
    RAISE EXCEPTION 'Appeal already decided.';
  END IF;

  SELECT * INTO v_hold FROM public.student_holds WHERE id = v_appeal.hold_id;

  UPDATE public.integrity_appeals
    SET state = 'decided',
        outcome = _outcome,
        outcome_rationale_public = _public_rationale,
        outcome_rationale_internal = _internal_notes,
        decided_by = v_user,
        decided_at = now(),
        updated_at = now()
    WHERE id = _appeal_id;

  v_to_state := CASE _outcome
    WHEN 'overturned' THEN 'overturned'
    WHEN 'dismissed' THEN 'resolved'
    ELSE 'resolved'
  END;

  UPDATE public.student_holds
    SET lifecycle_state = v_to_state,
        is_active = CASE WHEN v_to_state IN ('resolved','overturned') THEN false ELSE is_active END,
        resolved_at = now(),
        resolved_by = v_user,
        resolution_notes = _public_rationale,
        updated_at = now()
    WHERE id = v_hold.id;

  INSERT INTO public.integrity_decision_history
    (hold_id, appeal_id, actor_user_id, actor_role, from_state, to_state, rationale)
  VALUES
    (v_hold.id, _appeal_id, v_user, v_role, v_hold.lifecycle_state, v_to_state, _public_rationale);

  INSERT INTO public.integrity_notifications
    (hold_id, appeal_id, student_user_id, subject, body, sent_by)
  VALUES
    (v_hold.id, _appeal_id, v_hold.user_id,
     'Appeal decision: ' || _outcome,
     _public_rationale, v_user);

  RETURN jsonb_build_object('outcome', _outcome, 'hold_state', v_to_state);
END;
$$;
REVOKE ALL ON FUNCTION public.decide_integrity_appeal(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_integrity_appeal(uuid,text,text,text) TO authenticated;

-- 10. Trigger: AI-triggered holds cannot become 'resolved' or 'overturned' without a human actor recorded in decision history
CREATE OR REPLACE FUNCTION public.tg_require_human_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_human_count int;
BEGIN
  IF NEW.lifecycle_state IN ('resolved','overturned')
     AND OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state THEN
    SELECT COUNT(*) INTO v_human_count
    FROM public.integrity_decision_history
    WHERE hold_id = NEW.id
      AND actor_role IN ('faculty','registrar','admin','superadmin');
    IF v_human_count = 0 THEN
      RAISE EXCEPTION 'Holds cannot be marked resolved/overturned without a human reviewer decision.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_require_human_decision ON public.student_holds;
CREATE TRIGGER trg_require_human_decision
  BEFORE UPDATE ON public.student_holds
  FOR EACH ROW EXECUTE FUNCTION public.tg_require_human_decision();
