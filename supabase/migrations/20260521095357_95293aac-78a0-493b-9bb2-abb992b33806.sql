
-- Sites catalog
CREATE TABLE public.placement_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT,
  country TEXT,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Placements
CREATE TABLE public.placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  site_id UUID NOT NULL REFERENCES public.placement_sites(id) ON DELETE RESTRICT,
  supervisor_user_id UUID,
  supervisor_external_email TEXT,
  role_title TEXT NOT NULL,
  term TEXT,
  hours_target INTEGER NOT NULL DEFAULT 120,
  hours_logged NUMERIC(8,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','in_progress','completed','canceled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_placements_student ON public.placements(student_user_id);
CREATE INDEX idx_placements_supervisor ON public.placements(supervisor_user_id);
CREATE INDEX idx_placements_status ON public.placements(status);

-- Hours logs
CREATE TABLE public.placement_hours_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  narrative TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_phl_placement ON public.placement_hours_logs(placement_id);

-- Evaluations
CREATE TABLE public.placement_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL UNIQUE REFERENCES public.placements(id) ON DELETE RESTRICT,
  evaluator_user_id UUID NOT NULL,
  professionalism INTEGER NOT NULL CHECK (professionalism BETWEEN 1 AND 5),
  competence INTEGER NOT NULL CHECK (competence BETWEEN 1 AND 5),
  initiative INTEGER NOT NULL CHECK (initiative BETWEEN 1 AND 5),
  spiritual_alignment INTEGER NOT NULL CHECK (spiritual_alignment BETWEEN 1 AND 5),
  narrative TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('pass','fail')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events audit
CREATE TABLE public.placement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pe_placement ON public.placement_events(placement_id);

-- Updated_at triggers
CREATE TRIGGER trg_psites_updated BEFORE UPDATE ON public.placement_sites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_placements_updated BEFORE UPDATE ON public.placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_phl_updated BEFORE UPDATE ON public.placement_hours_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reuse immutable trigger function (already exists from PR22 as tg_saw_immutable)
-- Evaluations and events are immutable
CREATE OR REPLACE FUNCTION public.tg_placement_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Record is immutable'; END $$;

CREATE TRIGGER trg_pev_no_update BEFORE UPDATE ON public.placement_evaluations
FOR EACH ROW EXECUTE FUNCTION public.tg_placement_immutable();
CREATE TRIGGER trg_pev_no_delete BEFORE DELETE ON public.placement_evaluations
FOR EACH ROW EXECUTE FUNCTION public.tg_placement_immutable();
CREATE TRIGGER trg_pevent_no_update BEFORE UPDATE ON public.placement_events
FOR EACH ROW EXECUTE FUNCTION public.tg_placement_immutable();
CREATE TRIGGER trg_pevent_no_delete BEFORE DELETE ON public.placement_events
FOR EACH ROW EXECUTE FUNCTION public.tg_placement_immutable();

-- Validate placement state transitions
CREATE OR REPLACE FUNCTION public.tg_placement_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('proposed') THEN
      RAISE EXCEPTION 'New placements must start as proposed';
    END IF;
  ELSE
    -- enforce monotonic transitions
    IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
      RAISE EXCEPTION 'Completed placements are final';
    END IF;
    IF OLD.status = 'canceled' AND NEW.status <> 'canceled' THEN
      RAISE EXCEPTION 'Canceled placements cannot be reactivated';
    END IF;
    IF NEW.status = 'completed' AND NEW.hours_logged < NEW.hours_target THEN
      -- allow only if registrar/admin overrides via service role; otherwise prevent
      IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')) THEN
        RAISE EXCEPTION 'Cannot complete: hours_logged (%) < hours_target (%)', NEW.hours_logged, NEW.hours_target;
      END IF;
    END IF;
    IF NEW.status = 'approved' AND OLD.status = 'proposed' THEN
      NEW.approved_at := now();
      NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
    END IF;
    IF NEW.status = 'completed' THEN
      NEW.completed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_placement_validate
BEFORE INSERT OR UPDATE ON public.placements
FOR EACH ROW EXECUTE FUNCTION public.tg_placement_validate();

-- Auto event log on placement status change
CREATE OR REPLACE FUNCTION public.tg_placement_log_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.placement_events(placement_id, actor_user_id, event_type, from_status, to_status, detail)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.student_user_id), 'created', NULL, NEW.status, 'Placement proposed');
  ELSIF NEW.status <> OLD.status THEN
    INSERT INTO public.placement_events(placement_id, actor_user_id, event_type, from_status, to_status, detail)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.student_user_id), 'status_change', OLD.status, NEW.status, NULL);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_placement_log_event
AFTER INSERT OR UPDATE ON public.placements
FOR EACH ROW EXECUTE FUNCTION public.tg_placement_log_event();

-- When an hours log is approved, increment placement.hours_logged
CREATE OR REPLACE FUNCTION public.tg_phl_apply_hours()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    UPDATE public.placements SET hours_logged = hours_logged + NEW.hours WHERE id = NEW.placement_id;
    NEW.reviewed_at := now();
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    UPDATE public.placements SET hours_logged = GREATEST(0, hours_logged - OLD.hours) WHERE id = NEW.placement_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_phl_apply_hours
BEFORE UPDATE ON public.placement_hours_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_phl_apply_hours();

-- Enable RLS
ALTER TABLE public.placement_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_hours_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_events ENABLE ROW LEVEL SECURITY;

-- Sites: anyone authenticated can read active; admin/registrar manage
CREATE POLICY "View active sites"
ON public.placement_sites FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'));

CREATE POLICY "Admins manage sites"
ON public.placement_sites FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'));

-- Placements: student own; supervisor assigned; admin/registrar all
CREATE POLICY "Student views own placements"
ON public.placements FOR SELECT
USING (
  student_user_id = auth.uid()
  OR supervisor_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar') OR public.has_role(auth.uid(), 'faculty')
);

CREATE POLICY "Student creates own placements"
ON public.placements FOR INSERT
WITH CHECK (student_user_id = auth.uid());

CREATE POLICY "Student edits own draft placements"
ON public.placements FOR UPDATE
USING (student_user_id = auth.uid() AND status = 'proposed')
WITH CHECK (student_user_id = auth.uid());

CREATE POLICY "Admin/registrar/supervisor update placements"
ON public.placements FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
  OR supervisor_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
  OR supervisor_user_id = auth.uid()
);

-- Hours logs
CREATE POLICY "Hours logs visible to student/supervisor/admin"
ON public.placement_hours_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id
    AND (p.student_user_id = auth.uid() OR p.supervisor_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
);

CREATE POLICY "Student inserts own hours logs"
ON public.placement_hours_logs FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id
    AND p.student_user_id = auth.uid() AND p.status IN ('approved','in_progress'))
);

CREATE POLICY "Student edits own pending logs"
ON public.placement_hours_logs FOR UPDATE
USING (
  status = 'pending' AND EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id AND p.student_user_id = auth.uid())
)
WITH CHECK (true);

CREATE POLICY "Supervisor/admin reviews logs"
ON public.placement_hours_logs FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
  OR EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id AND p.supervisor_user_id = auth.uid())
)
WITH CHECK (true);

-- Evaluations: visible to student/supervisor/admin; insertable by supervisor/admin
CREATE POLICY "Eval visible to involved parties"
ON public.placement_evaluations FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id
    AND (p.student_user_id = auth.uid() OR p.supervisor_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
);

CREATE POLICY "Supervisor/admin inserts evaluation"
ON public.placement_evaluations FOR INSERT
WITH CHECK (
  evaluator_user_id = auth.uid() AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
    OR EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id AND p.supervisor_user_id = auth.uid())
  )
);

-- Events: visible to involved; insert by anyone with placement access (trigger does it)
CREATE POLICY "Events visible to involved"
ON public.placement_events FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.placements p WHERE p.id = placement_id
    AND (p.student_user_id = auth.uid() OR p.supervisor_user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
);

CREATE POLICY "Events insertable by trigger/system"
ON public.placement_events FOR INSERT
WITH CHECK (actor_user_id = auth.uid() OR auth.uid() IS NOT NULL);
