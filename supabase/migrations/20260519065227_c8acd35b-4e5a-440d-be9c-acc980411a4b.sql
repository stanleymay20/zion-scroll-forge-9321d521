
CREATE TYPE public.conduct_case_status AS ENUM ('reported','under_review','hearing_scheduled','decided','closed');
CREATE TYPE public.conduct_decision AS ENUM ('pending','no_violation','warning','probation','suspension','dismissal');
CREATE TYPE public.conduct_appeal_status AS ENUM ('filed','under_review','upheld','reduced','overturned');

CREATE TABLE public.conduct_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  status public.conduct_case_status NOT NULL DEFAULT 'reported',
  decision public.conduct_decision NOT NULL DEFAULT 'pending',
  decision_rationale TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  hearing_scheduled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conduct_student ON public.conduct_cases(student_user_id, status);
ALTER TABLE public.conduct_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student view own cases" ON public.conduct_cases
FOR SELECT USING (student_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "officers create cases" ON public.conduct_cases
FOR INSERT WITH CHECK (reported_by = auth.uid() AND (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
));

CREATE POLICY "officers update cases" ON public.conduct_cases
FOR UPDATE USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
);

CREATE OR REPLACE FUNCTION public.tg_conduct_state_machine() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'closed' AND NEW.status <> 'closed' THEN
    RAISE EXCEPTION 'Closed conduct cases are immutable.';
  END IF;
  IF NEW.status = 'decided' AND NEW.decision = 'pending' THEN
    RAISE EXCEPTION 'Decided cases require a concrete decision.';
  END IF;
  IF NEW.status = 'decided' AND OLD.status <> 'decided' THEN
    NEW.decided_at := COALESCE(NEW.decided_at, now());
  END IF;
  IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_conduct_states BEFORE UPDATE ON public.conduct_cases
FOR EACH ROW EXECUTE FUNCTION public.tg_conduct_state_machine();

CREATE TABLE public.conduct_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.conduct_cases(id) ON DELETE RESTRICT,
  event_kind TEXT NOT NULL,
  note TEXT NOT NULL,
  actor_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cce_case ON public.conduct_case_events(case_id, occurred_at);
ALTER TABLE public.conduct_case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view events with case" ON public.conduct_case_events
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.conduct_cases c WHERE c.id = case_id AND (
    c.student_user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'registrar')
    OR public.has_role(auth.uid(),'superadmin')
  )
));

CREATE POLICY "officers log events" ON public.conduct_case_events
FOR INSERT WITH CHECK (actor_id = auth.uid() AND (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
));

CREATE OR REPLACE FUNCTION public.tg_event_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Conduct events are immutable.'; END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conduct events cannot be deleted.'; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER tg_cce_no_update BEFORE UPDATE ON public.conduct_case_events
FOR EACH ROW EXECUTE FUNCTION public.tg_event_immutable();
CREATE TRIGGER tg_cce_no_delete BEFORE DELETE ON public.conduct_case_events
FOR EACH ROW EXECUTE FUNCTION public.tg_event_immutable();

CREATE TABLE public.conduct_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.conduct_cases(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL,
  grounds TEXT NOT NULL,
  status public.conduct_appeal_status NOT NULL DEFAULT 'filed',
  ruling TEXT,
  ruled_by UUID,
  ruled_at TIMESTAMPTZ,
  filed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id)
);
ALTER TABLE public.conduct_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student view own appeals" ON public.conduct_appeals
FOR SELECT USING (student_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "student files appeal" ON public.conduct_appeals
FOR INSERT WITH CHECK (
  student_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conduct_cases c
    WHERE c.id = case_id
      AND c.student_user_id = auth.uid()
      AND c.status = 'decided'
      AND c.decided_at > now() - INTERVAL '14 days'
  )
);

CREATE POLICY "officers rule appeals" ON public.conduct_appeals
FOR UPDATE USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
);

CREATE OR REPLACE FUNCTION public.tg_appeal_state_machine() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('upheld','reduced','overturned') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Appeal rulings are terminal.';
  END IF;
  IF NEW.status IN ('upheld','reduced','overturned') AND NEW.ruled_at IS NULL THEN
    NEW.ruled_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_appeal_states BEFORE UPDATE ON public.conduct_appeals
FOR EACH ROW EXECUTE FUNCTION public.tg_appeal_state_machine();
