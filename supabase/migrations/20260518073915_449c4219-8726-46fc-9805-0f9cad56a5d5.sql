
-- Enums
DO $$ BEGIN
  CREATE TYPE public.practicum_site_status AS ENUM ('pending_review','approved','suspended','revoked','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.practicum_placement_status AS ENUM ('proposed','approved','active','on_hold','completed','withdrawn','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.practicum_log_status AS ENUM ('submitted','attested','rejected','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.practicum_incident_severity AS ENUM ('minor','moderate','serious','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.practicum_incident_status AS ENUM ('open','under_review','resolved','escalated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sites
CREATE TABLE IF NOT EXISTS public.practicum_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  site_type TEXT NOT NULL, -- clinical, ministry, education, ngo, corporate, research
  description TEXT,
  address TEXT,
  country TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  capacity INT DEFAULT 0,
  mou_signed_at DATE,
  mou_expires_at DATE,
  safety_reviewed_at TIMESTAMPTZ,
  safety_reviewer_id UUID,
  status public.practicum_site_status NOT NULL DEFAULT 'pending_review',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practicum_site_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.practicum_sites(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- approved, suspended, revoked, renewed
  rationale TEXT NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewer_role TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supervisors
CREATE TABLE IF NOT EXISTS public.practicum_supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.practicum_sites(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_title TEXT,
  credentials TEXT,
  license_number TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT false,
  license_verified_by UUID,
  license_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, suspended, inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Placements
CREATE TABLE IF NOT EXISTS public.practicum_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  site_id UUID NOT NULL REFERENCES public.practicum_sites(id),
  supervisor_id UUID REFERENCES public.practicum_supervisors(id),
  program_id UUID,
  course_id UUID,
  term_label TEXT,
  start_date DATE,
  end_date DATE,
  required_hours INT NOT NULL DEFAULT 0,
  completed_hours NUMERIC(7,2) NOT NULL DEFAULT 0,
  status public.practicum_placement_status NOT NULL DEFAULT 'proposed',
  final_outcome TEXT, -- pass, fail, withdrawn, incomplete
  outcome_computed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hour logs
CREATE TABLE IF NOT EXISTS public.practicum_hour_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES public.practicum_placements(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  log_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  activity_summary TEXT NOT NULL,
  competencies_practiced TEXT[],
  status public.practicum_log_status NOT NULL DEFAULT 'submitted',
  attested_by UUID,
  attested_at TIMESTAMPTZ,
  attestation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competency attestations
CREATE TABLE IF NOT EXISTS public.practicum_competency_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES public.practicum_placements(id) ON DELETE CASCADE,
  competency_code TEXT NOT NULL,
  competency_label TEXT NOT NULL,
  attained_level TEXT NOT NULL, -- introductory, developing, proficient, mastery
  evidence_notes TEXT NOT NULL,
  attested_by UUID NOT NULL,
  attested_by_role TEXT NOT NULL,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incidents
CREATE TABLE IF NOT EXISTS public.practicum_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID REFERENCES public.practicum_placements(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.practicum_sites(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL,
  reporter_role TEXT NOT NULL,
  category TEXT NOT NULL, -- safety, conduct, integrity, scope, other
  severity public.practicum_incident_severity NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.practicum_incident_status NOT NULL DEFAULT 'open',
  resolution_summary TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evaluations
CREATE TABLE IF NOT EXISTS public.practicum_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES public.practicum_placements(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL,
  evaluator_role TEXT NOT NULL,
  overall_score NUMERIC(4,2),
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative TEXT NOT NULL,
  recommendation TEXT NOT NULL, -- pass, fail, conditional
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prc_placements_student ON public.practicum_placements(student_id);
CREATE INDEX IF NOT EXISTS idx_prc_placements_site ON public.practicum_placements(site_id);
CREATE INDEX IF NOT EXISTS idx_prc_logs_placement ON public.practicum_hour_logs(placement_id);
CREATE INDEX IF NOT EXISTS idx_prc_incidents_placement ON public.practicum_incidents(placement_id);
CREATE INDEX IF NOT EXISTS idx_prc_supervisors_site ON public.practicum_supervisors(site_id);

-- Updated-at triggers
CREATE TRIGGER trg_prc_sites_updated BEFORE UPDATE ON public.practicum_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prc_supervisors_updated BEFORE UPDATE ON public.practicum_supervisors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prc_placements_updated BEFORE UPDATE ON public.practicum_placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prc_logs_updated BEFORE UPDATE ON public.practicum_hour_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prc_incidents_updated BEFORE UPDATE ON public.practicum_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Immutability triggers
CREATE OR REPLACE FUNCTION public.tg_prc_block_attested_log_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'attested' THEN
      RAISE EXCEPTION 'Attested practicum hour logs are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'attested' AND NEW.status <> 'attested' THEN
    RAISE EXCEPTION 'Attested practicum logs cannot be reverted';
  END IF;
  IF OLD.status = 'attested' AND (NEW.hours <> OLD.hours OR NEW.log_date <> OLD.log_date OR NEW.activity_summary <> OLD.activity_summary) THEN
    RAISE EXCEPTION 'Attested practicum log content is immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_prc_logs_immutable
  BEFORE UPDATE OR DELETE ON public.practicum_hour_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_prc_block_attested_log_change();

CREATE OR REPLACE FUNCTION public.tg_prc_block_attestation_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Competency attestations are immutable';
END $$;

CREATE TRIGGER trg_prc_attestations_immutable
  BEFORE UPDATE OR DELETE ON public.practicum_competency_attestations
  FOR EACH ROW EXECUTE FUNCTION public.tg_prc_block_attestation_change();

CREATE OR REPLACE FUNCTION public.tg_prc_block_approval_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Site approval records are immutable governance history';
END $$;

CREATE TRIGGER trg_prc_approvals_immutable
  BEFORE UPDATE OR DELETE ON public.practicum_site_approvals
  FOR EACH ROW EXECUTE FUNCTION public.tg_prc_block_approval_change();

CREATE OR REPLACE FUNCTION public.tg_prc_block_resolved_incident_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status IN ('resolved','escalated') THEN
    RAISE EXCEPTION 'Resolved practicum incidents are immutable historical records';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_prc_incidents_immutable
  BEFORE DELETE ON public.practicum_incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_prc_block_resolved_incident_delete();

-- Outcome computation (fail-closed)
CREATE OR REPLACE FUNCTION public.compute_practicum_outcome(_placement_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p RECORD;
  attested_hours NUMERIC;
  critical_open INT;
  competency_count INT;
  outcome TEXT;
  reason TEXT;
BEGIN
  SELECT * INTO p FROM public.practicum_placements WHERE id = _placement_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome','unknown','reason','not_found'); END IF;

  SELECT COALESCE(SUM(hours),0) INTO attested_hours
    FROM public.practicum_hour_logs WHERE placement_id = _placement_id AND status = 'attested';

  SELECT COUNT(*) INTO critical_open
    FROM public.practicum_incidents
    WHERE placement_id = _placement_id AND severity = 'critical' AND status IN ('open','under_review','escalated');

  SELECT COUNT(*) INTO competency_count
    FROM public.practicum_competency_attestations WHERE placement_id = _placement_id;

  IF critical_open > 0 THEN
    outcome := 'fail'; reason := 'unresolved_critical_incident';
  ELSIF attested_hours < p.required_hours THEN
    outcome := 'incomplete'; reason := 'attested_hours_below_required';
  ELSIF competency_count = 0 THEN
    outcome := 'incomplete'; reason := 'no_competency_attestations';
  ELSE
    outcome := 'pass'; reason := 'meets_governed_threshold';
  END IF;

  RETURN jsonb_build_object(
    'outcome', outcome,
    'reason', reason,
    'attested_hours', attested_hours,
    'required_hours', p.required_hours,
    'critical_open_incidents', critical_open,
    'competencies_attested', competency_count
  );
END $$;

-- RLS
ALTER TABLE public.practicum_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_site_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_hour_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_competency_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicum_evaluations ENABLE ROW LEVEL SECURITY;

-- Sites: approved sites are publicly viewable; admins manage
CREATE POLICY "Approved sites viewable by authenticated"
  ON public.practicum_sites FOR SELECT TO authenticated
  USING (status = 'approved' OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));
CREATE POLICY "Admins manage sites"
  ON public.practicum_sites FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));

-- Site approvals: admins/faculty view & insert; immutable via trigger
CREATE POLICY "Admins view approvals" ON public.practicum_site_approvals FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));
CREATE POLICY "Admins create approvals" ON public.practicum_site_approvals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));

-- Supervisors
CREATE POLICY "Supervisors visible to staff and self" ON public.practicum_supervisors FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty') OR user_id = auth.uid());
CREATE POLICY "Admins manage supervisors" ON public.practicum_supervisors FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));

-- Placements
CREATE POLICY "Students see own placements" ON public.practicum_placements FOR SELECT TO authenticated
  USING (student_id = auth.uid()
         OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
         OR EXISTS (SELECT 1 FROM public.practicum_supervisors s WHERE s.id = supervisor_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins manage placements" ON public.practicum_placements FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));

-- Hour logs
CREATE POLICY "View own/related hour logs" ON public.practicum_hour_logs FOR SELECT TO authenticated
  USING (student_id = auth.uid()
         OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
         OR EXISTS (SELECT 1 FROM public.practicum_placements p
                    JOIN public.practicum_supervisors s ON s.id = p.supervisor_id
                    WHERE p.id = placement_id AND s.user_id = auth.uid()));
CREATE POLICY "Students submit own hour logs" ON public.practicum_hour_logs FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Supervisors/admins attest hour logs" ON public.practicum_hour_logs FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
         OR EXISTS (SELECT 1 FROM public.practicum_placements p
                    JOIN public.practicum_supervisors s ON s.id = p.supervisor_id
                    WHERE p.id = placement_id AND s.user_id = auth.uid()));

-- Competency attestations
CREATE POLICY "View attestations (own/staff)" ON public.practicum_competency_attestations FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
         OR EXISTS (SELECT 1 FROM public.practicum_placements p
                    WHERE p.id = placement_id AND (p.student_id = auth.uid()
                      OR EXISTS (SELECT 1 FROM public.practicum_supervisors s WHERE s.id = p.supervisor_id AND s.user_id = auth.uid()))));
CREATE POLICY "Supervisors/admins create attestations" ON public.practicum_competency_attestations FOR INSERT TO authenticated
  WITH CHECK (attested_by = auth.uid()
              AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
                   OR EXISTS (SELECT 1 FROM public.practicum_placements p
                              JOIN public.practicum_supervisors s ON s.id = p.supervisor_id
                              WHERE p.id = placement_id AND s.user_id = auth.uid())));

-- Incidents
CREATE POLICY "View related incidents" ON public.practicum_incidents FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
         OR reporter_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.practicum_placements p
                    WHERE p.id = placement_id AND (p.student_id = auth.uid()
                      OR EXISTS (SELECT 1 FROM public.practicum_supervisors s WHERE s.id = p.supervisor_id AND s.user_id = auth.uid()))));
CREATE POLICY "Any authenticated can report incident" ON public.practicum_incidents FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins update incidents" ON public.practicum_incidents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty'));

-- Evaluations
CREATE POLICY "View related evaluations" ON public.practicum_evaluations FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
         OR EXISTS (SELECT 1 FROM public.practicum_placements p
                    WHERE p.id = placement_id AND (p.student_id = auth.uid()
                      OR EXISTS (SELECT 1 FROM public.practicum_supervisors s WHERE s.id = p.supervisor_id AND s.user_id = auth.uid()))));
CREATE POLICY "Supervisors/admins submit evaluations" ON public.practicum_evaluations FOR INSERT TO authenticated
  WITH CHECK (evaluator_id = auth.uid()
              AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'faculty')
                   OR EXISTS (SELECT 1 FROM public.practicum_placements p
                              JOIN public.practicum_supervisors s ON s.id = p.supervisor_id
                              WHERE p.id = placement_id AND s.user_id = auth.uid())));
