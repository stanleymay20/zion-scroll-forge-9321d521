-- ENUMS
CREATE TYPE public.degree_plan_status AS ENUM ('draft','submitted','approved','rejected','archived');
CREATE TYPE public.degree_plan_review_action AS ENUM ('submitted','approved','rejected','returned');

-- ADVISING ASSIGNMENTS
CREATE TABLE public.advising_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  advisor_user_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  notes TEXT
);
CREATE UNIQUE INDEX idx_advising_active_unique ON public.advising_assignments(student_user_id) WHERE active;
CREATE INDEX idx_advising_advisor ON public.advising_assignments(advisor_user_id) WHERE active;

ALTER TABLE public.advising_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student views own advising" ON public.advising_assignments
  FOR SELECT USING (auth.uid() = student_user_id);
CREATE POLICY "Advisor views own assignments" ON public.advising_assignments
  FOR SELECT USING (auth.uid() = advisor_user_id);
CREATE POLICY "Admin manages advising" ON public.advising_assignments
  FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- DEGREE PLANS
CREATE TABLE public.degree_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  target_term TEXT,
  status public.degree_plan_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID
);
CREATE INDEX idx_degree_plans_student ON public.degree_plans(student_user_id);

ALTER TABLE public.degree_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student views own plans" ON public.degree_plans
  FOR SELECT USING (auth.uid() = student_user_id);
CREATE POLICY "Student inserts own plan" ON public.degree_plans
  FOR INSERT WITH CHECK (auth.uid() = student_user_id AND status = 'draft');
CREATE POLICY "Student updates own draft plan" ON public.degree_plans
  FOR UPDATE USING (auth.uid() = student_user_id AND status IN ('draft','submitted'))
  WITH CHECK (auth.uid() = student_user_id);
CREATE POLICY "Advisor views advisee plans" ON public.degree_plans
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.advising_assignments aa
    WHERE aa.student_user_id = degree_plans.student_user_id
      AND aa.advisor_user_id = auth.uid() AND aa.active
  ));
CREATE POLICY "Advisor updates advisee plan" ON public.degree_plans
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.advising_assignments aa
    WHERE aa.student_user_id = degree_plans.student_user_id
      AND aa.advisor_user_id = auth.uid() AND aa.active
  ));
CREATE POLICY "Admin manages plans" ON public.degree_plans
  FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- DEGREE PLAN ITEMS
CREATE TABLE public.degree_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.degree_plans(id) ON DELETE CASCADE,
  term_label TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_title TEXT,
  credit_hours NUMERIC(4,2) NOT NULL DEFAULT 3,
  sequence INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dpi_plan ON public.degree_plan_items(plan_id);

ALTER TABLE public.degree_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan-owner views items" ON public.degree_plan_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.degree_plans p WHERE p.id = plan_id AND p.student_user_id = auth.uid()
  ));
CREATE POLICY "Plan-owner edits draft items" ON public.degree_plan_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.degree_plans p WHERE p.id = plan_id AND p.student_user_id = auth.uid() AND p.status = 'draft'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.degree_plans p WHERE p.id = plan_id AND p.student_user_id = auth.uid() AND p.status = 'draft'
  ));
CREATE POLICY "Advisor views advisee items" ON public.degree_plan_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.degree_plans p
    JOIN public.advising_assignments aa ON aa.student_user_id = p.student_user_id AND aa.active
    WHERE p.id = plan_id AND aa.advisor_user_id = auth.uid()
  ));
CREATE POLICY "Admin manages items" ON public.degree_plan_items
  FOR ALL USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- Block edits to items of approved plans
CREATE OR REPLACE FUNCTION public.tg_dpi_lock_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.degree_plan_status;
BEGIN
  SELECT status INTO st FROM public.degree_plans WHERE id = COALESCE(NEW.plan_id, OLD.plan_id);
  IF st = 'approved' AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar')) THEN
    RAISE EXCEPTION 'Approved plans are locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER tg_dpi_lock_approved
  BEFORE INSERT OR UPDATE OR DELETE ON public.degree_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_dpi_lock_approved();

-- DEGREE PLAN REVIEWS (immutable)
CREATE TABLE public.degree_plan_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.degree_plans(id) ON DELETE CASCADE,
  action public.degree_plan_review_action NOT NULL,
  rationale TEXT NOT NULL,
  actor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dpr_plan ON public.degree_plan_reviews(plan_id);

ALTER TABLE public.degree_plan_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan-owner views reviews" ON public.degree_plan_reviews
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.degree_plans p WHERE p.id = plan_id AND p.student_user_id = auth.uid()
  ));
CREATE POLICY "Advisor views advisee reviews" ON public.degree_plan_reviews
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.degree_plans p
    JOIN public.advising_assignments aa ON aa.student_user_id = p.student_user_id AND aa.active
    WHERE p.id = plan_id AND aa.advisor_user_id = auth.uid()
  ));
CREATE POLICY "Authorized inserts review" ON public.degree_plan_reviews
  FOR INSERT WITH CHECK (
    actor_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.degree_plans p WHERE p.id = plan_id AND p.student_user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.degree_plans p
        JOIN public.advising_assignments aa ON aa.student_user_id = p.student_user_id AND aa.active
        WHERE p.id = plan_id AND aa.advisor_user_id = auth.uid()
      )
      OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar')
    )
  );
CREATE POLICY "Admin views all reviews" ON public.degree_plan_reviews
  FOR SELECT USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

CREATE OR REPLACE FUNCTION public.tg_dpr_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Plan reviews are immutable'; END $$;
CREATE TRIGGER tg_dpr_no_update BEFORE UPDATE ON public.degree_plan_reviews FOR EACH ROW EXECUTE FUNCTION public.tg_dpr_immutable();
CREATE TRIGGER tg_dpr_no_delete BEFORE DELETE ON public.degree_plan_reviews FOR EACH ROW EXECUTE FUNCTION public.tg_dpr_immutable();

-- updated_at trigger
CREATE TRIGGER tg_degree_plans_updated_at
  BEFORE UPDATE ON public.degree_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();