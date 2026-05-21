
-- Scholarships catalog
CREATE TABLE public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sponsor TEXT,
  award_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  eligibility TEXT,
  total_slots INTEGER NOT NULL DEFAULT 1,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','archived')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Applications
CREATE TABLE public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL,
  essay TEXT,
  requested_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','awarded','rejected','withdrawn')),
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scholarship_id, applicant_user_id)
);
CREATE INDEX idx_sapp_applicant ON public.scholarship_applications(applicant_user_id);
CREATE INDEX idx_sapp_status ON public.scholarship_applications(status);

-- Reviews (immutable audit)
CREATE TABLE public.scholarship_application_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.scholarship_applications(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sar_app ON public.scholarship_application_reviews(application_id);

-- Awards
CREATE TABLE public.scholarship_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.scholarship_applications(id) ON DELETE RESTRICT,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE RESTRICT,
  awardee_user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  term TEXT,
  notes TEXT,
  awarded_by UUID NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saw_awardee ON public.scholarship_awards(awardee_user_id);

-- Updated_at trigger
CREATE TRIGGER trg_scholarships_updated
BEFORE UPDATE ON public.scholarships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sapp_updated
BEFORE UPDATE ON public.scholarship_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation: closed scholarships reject new submissions; window enforcement
CREATE OR REPLACE FUNCTION public.tg_sapp_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.scholarships%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.scholarships WHERE id = NEW.scholarship_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scholarship not found'; END IF;

  IF TG_OP = 'INSERT' OR (OLD.status = 'draft' AND NEW.status = 'submitted') THEN
    IF s.status <> 'open' THEN
      RAISE EXCEPTION 'Scholarship is not open for applications';
    END IF;
    IF s.opens_at IS NOT NULL AND now() < s.opens_at THEN
      RAISE EXCEPTION 'Application window has not opened yet';
    END IF;
    IF s.closes_at IS NOT NULL AND now() > s.closes_at THEN
      RAISE EXCEPTION 'Application window has closed';
    END IF;
  END IF;

  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.submitted_at := now();
  END IF;
  IF NEW.status IN ('awarded','rejected') AND OLD.status <> NEW.status THEN
    NEW.decided_at := now();
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_sapp_validate
BEFORE INSERT OR UPDATE ON public.scholarship_applications
FOR EACH ROW EXECUTE FUNCTION public.tg_sapp_validate();

-- Validation: awards must reference an awarded application
CREATE OR REPLACE FUNCTION public.tg_saw_validate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app public.scholarship_applications%ROWTYPE;
BEGIN
  SELECT * INTO app FROM public.scholarship_applications WHERE id = NEW.application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF app.status <> 'awarded' THEN
    RAISE EXCEPTION 'Application must be in awarded state';
  END IF;
  NEW.scholarship_id := app.scholarship_id;
  NEW.awardee_user_id := app.applicant_user_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_saw_validate
BEFORE INSERT ON public.scholarship_awards
FOR EACH ROW EXECUTE FUNCTION public.tg_saw_validate();

-- Awards immutable
CREATE OR REPLACE FUNCTION public.tg_saw_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Awards are immutable'; END $$;

CREATE TRIGGER trg_saw_no_update BEFORE UPDATE ON public.scholarship_awards
FOR EACH ROW EXECUTE FUNCTION public.tg_saw_immutable();
CREATE TRIGGER trg_saw_no_delete BEFORE DELETE ON public.scholarship_awards
FOR EACH ROW EXECUTE FUNCTION public.tg_saw_immutable();

-- Reviews append-only
CREATE TRIGGER trg_sar_no_update BEFORE UPDATE ON public.scholarship_application_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_saw_immutable();
CREATE TRIGGER trg_sar_no_delete BEFORE DELETE ON public.scholarship_application_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_saw_immutable();

-- Auto-log review on status change
CREATE OR REPLACE FUNCTION public.tg_sapp_log_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    INSERT INTO public.scholarship_application_reviews(application_id, reviewer_user_id, from_status, to_status, rationale)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.applicant_user_id), OLD.status, NEW.status,
      COALESCE(current_setting('app.review_rationale', true), 'Status transition'));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sapp_log_review
AFTER UPDATE ON public.scholarship_applications
FOR EACH ROW EXECUTE FUNCTION public.tg_sapp_log_review();

-- Enable RLS
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_application_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_awards ENABLE ROW LEVEL SECURITY;

-- Scholarships: public read for open/closed, admin write
CREATE POLICY "Anyone can view non-draft scholarships"
ON public.scholarships FOR SELECT
USING (status IN ('open','closed','archived') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins manage scholarships"
ON public.scholarships FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- Applications: applicant own; admin all
CREATE POLICY "Applicants view own applications"
ON public.scholarship_applications FOR SELECT
USING (applicant_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'));

CREATE POLICY "Applicants insert own applications"
ON public.scholarship_applications FOR INSERT
WITH CHECK (applicant_user_id = auth.uid());

CREATE POLICY "Applicants update own draft applications"
ON public.scholarship_applications FOR UPDATE
USING (applicant_user_id = auth.uid() AND status IN ('draft','submitted'))
WITH CHECK (applicant_user_id = auth.uid());

CREATE POLICY "Admins manage all applications"
ON public.scholarship_applications FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'));

-- Reviews: visible to applicant and admin; insert by admin/registrar
CREATE POLICY "View own application reviews"
ON public.scholarship_application_reviews FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.scholarship_applications a WHERE a.id = application_id AND a.applicant_user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar')
);

CREATE POLICY "Admins insert reviews"
ON public.scholarship_application_reviews FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar') OR reviewer_user_id = auth.uid());

-- Awards: visible to awardee and admin
CREATE POLICY "Awardees view own awards"
ON public.scholarship_awards FOR SELECT
USING (awardee_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'));

CREATE POLICY "Admins create awards"
ON public.scholarship_awards FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'registrar'));
