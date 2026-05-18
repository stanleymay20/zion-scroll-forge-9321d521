
DO $$ BEGIN
  CREATE TYPE public.faculty_assignment_state AS ENUM ('proposed','approved','active','completed','cancelled','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.faculty_credential_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.faculty_credentials(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  method TEXT NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewer_role TEXT NOT NULL,
  rationale TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faculty_competency_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id UUID NOT NULL,
  domain_code TEXT NOT NULL,
  domain_label TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'lecturer',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(faculty_user_id, domain_code)
);

CREATE TABLE IF NOT EXISTS public.faculty_teaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id UUID NOT NULL,
  course_id UUID,
  course_code TEXT,
  course_title TEXT NOT NULL,
  domain_code TEXT NOT NULL,
  term_label TEXT NOT NULL,
  workload_weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  state public.faculty_assignment_state NOT NULL DEFAULT 'proposed',
  block_reason TEXT,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faculty_assignment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.faculty_teaching_assignments(id) ON DELETE CASCADE,
  prior_state public.faculty_assignment_state,
  new_state public.faculty_assignment_state NOT NULL,
  actor_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcd_faculty ON public.faculty_competency_domains(faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_fta_faculty ON public.faculty_teaching_assignments(faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_fta_course ON public.faculty_teaching_assignments(course_id);

CREATE TRIGGER trg_fcd_updated BEFORE UPDATE ON public.faculty_competency_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fta_updated BEFORE UPDATE ON public.faculty_teaching_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tg_fc_verification_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Faculty credential verification records are immutable';
END $$;

CREATE TRIGGER trg_fcv_immutable
  BEFORE UPDATE OR DELETE ON public.faculty_credential_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_fc_verification_immutable();

CREATE OR REPLACE FUNCTION public.tg_fta_audit_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Assignment audit records are immutable';
END $$;

CREATE TRIGGER trg_fta_audit_immutable
  BEFORE UPDATE OR DELETE ON public.faculty_assignment_audit
  FOR EACH ROW EXECUTE FUNCTION public.tg_fta_audit_immutable();

CREATE OR REPLACE FUNCTION public.validate_teaching_assignment(_faculty_user_id UUID, _domain_code TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  verified_count INT;
  domain_ok BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO verified_count FROM public.faculty_credentials
    WHERE faculty_user_id = _faculty_user_id AND verification_state = 'verified';
  SELECT EXISTS (SELECT 1 FROM public.faculty_competency_domains
    WHERE faculty_user_id = _faculty_user_id AND domain_code = _domain_code AND status = 'approved') INTO domain_ok;

  IF verified_count = 0 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'no_verified_credentials');
  END IF;
  IF NOT domain_ok THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'domain_not_approved');
  END IF;
  RETURN jsonb_build_object('eligible', true, 'verified_credentials', verified_count);
END $$;

CREATE OR REPLACE FUNCTION public.tg_fta_gate_and_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v JSONB;
BEGIN
  IF NEW.state IN ('approved','active') THEN
    v := public.validate_teaching_assignment(NEW.faculty_user_id, NEW.domain_code);
    IF NOT (v->>'eligible')::boolean THEN
      NEW.state := 'blocked';
      NEW.block_reason := v->>'reason';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fta_gate
  BEFORE INSERT OR UPDATE ON public.faculty_teaching_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fta_gate_and_audit();

DROP VIEW IF EXISTS public.faculty_verification_summary;
CREATE VIEW public.faculty_verification_summary AS
SELECT
  d.domain_code,
  d.domain_label,
  COUNT(DISTINCT d.faculty_user_id) FILTER (WHERE d.status = 'approved') AS approved_faculty_count,
  COUNT(DISTINCT c.faculty_user_id) FILTER (WHERE c.verification_state = 'verified') AS verified_credential_holders
FROM public.faculty_competency_domains d
LEFT JOIN public.faculty_credentials c ON c.faculty_user_id = d.faculty_user_id
GROUP BY d.domain_code, d.domain_label;

ALTER TABLE public.faculty_credential_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_competency_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_assignment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View credential verifications" ON public.faculty_credential_verifications FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'faculty')
         OR EXISTS (SELECT 1 FROM public.faculty_credentials c WHERE c.id = credential_id AND c.faculty_user_id = auth.uid()));
CREATE POLICY "Admins create verifications" ON public.faculty_credential_verifications FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar')));

CREATE POLICY "View competency domains" ON public.faculty_competency_domains FOR SELECT TO authenticated
  USING (faculty_user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'faculty'));
CREATE POLICY "Admins manage domains" ON public.faculty_competency_domains FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar'));

CREATE POLICY "View teaching assignments" ON public.faculty_teaching_assignments FOR SELECT TO authenticated
  USING (faculty_user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'faculty'));
CREATE POLICY "Admins manage assignments" ON public.faculty_teaching_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar'));

CREATE POLICY "View assignment audit" ON public.faculty_assignment_audit FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar') OR has_role(auth.uid(),'faculty'));
CREATE POLICY "Admins write audit" ON public.faculty_assignment_audit FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'registrar')));
