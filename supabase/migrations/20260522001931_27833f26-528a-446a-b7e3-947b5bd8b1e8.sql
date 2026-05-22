-- Employers
CREATE TABLE public.employers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  description text,
  contact_email text,
  contact_name text,
  owner_user_id uuid,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('internship','part_time','full_time','fellowship','volunteer','contract')),
  location text,
  remote boolean NOT NULL DEFAULT false,
  compensation text,
  apply_by timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','archived')),
  posted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_postings_status ON public.job_postings(status);
CREATE INDEX idx_job_postings_employer ON public.job_postings(employer_id);

CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  cover_letter text,
  resume_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','shortlisted','offered','accepted','rejected','withdrawn')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(posting_id, applicant_id)
);
CREATE INDEX idx_job_apps_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_job_apps_posting ON public.job_applications(posting_id);

CREATE TABLE public.job_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_app_events_app ON public.job_application_events(application_id);

CREATE TRIGGER trg_employers_updated BEFORE UPDATE ON public.employers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_job_postings_updated BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_job_apps_updated BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.tg_japp_validate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT status, apply_by INTO p FROM public.job_postings WHERE id = NEW.posting_id;
  IF p.status <> 'open' THEN RAISE EXCEPTION 'Posting is not open for applications'; END IF;
  IF p.apply_by IS NOT NULL AND p.apply_by < now() THEN RAISE EXCEPTION 'Application deadline has passed'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_japp_validate_insert BEFORE INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_japp_validate_insert();

CREATE OR REPLACE FUNCTION public.tg_japp_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('accepted','rejected','withdrawn') THEN
      RAISE EXCEPTION 'Application is in terminal state %', OLD.status;
    END IF;
    IF NEW.status IN ('accepted','rejected','withdrawn') THEN
      NEW.decided_at := now();
    END IF;
    INSERT INTO public.job_application_events(application_id, from_status, to_status, actor_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_japp_status_change BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_japp_status_change();

CREATE OR REPLACE FUNCTION public.tg_jae_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'job_application_events are immutable'; END $$;
CREATE TRIGGER trg_jae_no_update BEFORE UPDATE ON public.job_application_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_jae_immutable();
CREATE TRIGGER trg_jae_no_delete BEFORE DELETE ON public.job_application_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_jae_immutable();

ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active verified employers" ON public.employers FOR SELECT USING (status='active' AND verified=true);
CREATE POLICY "Owner can view own employer" ON public.employers FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Staff can view all employers" ON public.employers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "Staff can manage employers" ON public.employers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Owner can update own employer" ON public.employers FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Anyone can view open postings" ON public.job_postings FOR SELECT USING (status='open');
CREATE POLICY "Staff can view all postings" ON public.job_postings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "Employer owner can view own postings" ON public.job_postings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employers e WHERE e.id = employer_id AND e.owner_user_id = auth.uid()));
CREATE POLICY "Staff can manage postings" ON public.job_postings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Employer owner can manage own postings" ON public.job_postings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employers e WHERE e.id = employer_id AND e.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employers e WHERE e.id = employer_id AND e.owner_user_id = auth.uid()));

CREATE POLICY "Applicant can view own applications" ON public.job_applications FOR SELECT TO authenticated USING (applicant_id = auth.uid());
CREATE POLICY "Staff can view all applications" ON public.job_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Employer owner can view applications to own postings" ON public.job_applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_postings p JOIN public.employers e ON e.id = p.employer_id WHERE p.id = posting_id AND e.owner_user_id = auth.uid()));
CREATE POLICY "Applicant can submit application" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Applicant can update own" ON public.job_applications FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid()) WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Staff can manage applications" ON public.job_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Applicant can view own events" ON public.job_application_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_applications a WHERE a.id = application_id AND a.applicant_id = auth.uid()));
CREATE POLICY "Staff can view all events" ON public.job_application_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'career_advisor') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Employer owner can view events for own postings" ON public.job_application_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_applications a JOIN public.job_postings p ON p.id = a.posting_id JOIN public.employers e ON e.id = p.employer_id WHERE a.id = application_id AND e.owner_user_id = auth.uid()));
CREATE POLICY "System can insert events" ON public.job_application_events FOR INSERT TO authenticated WITH CHECK (true);