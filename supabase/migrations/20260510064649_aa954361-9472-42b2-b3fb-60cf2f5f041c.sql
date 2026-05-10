
-- Phase 1: extend levels (no DB-level enum, just allow more strings)
-- Phase 2: seed three new templates
INSERT INTO public.degree_templates (code, level, name, description, min_courses, min_credits, max_credits, duration_years, slot_specs) VALUES
('ASSOC-V1','Associate','Associate Template v1','60 credits, foundational + applied curriculum.',18,60,75,2,
  '[{"slot_type":"foundations","slot_title":"Foundations I","credits":3,"year":1,"term":"1"},
    {"slot_type":"foundations","slot_title":"Foundations II","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Core I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Core II","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Core III","credits":3,"year":2,"term":"1"},
    {"slot_type":"core","slot_title":"Core IV","credits":3,"year":2,"term":"2"},
    {"slot_type":"ethics","slot_title":"Professional Ethics","credits":3,"year":2,"term":"1"},
    {"slot_type":"elective","slot_title":"Elective I","credits":3,"year":2,"term":"1"},
    {"slot_type":"elective","slot_title":"Elective II","credits":3,"year":2,"term":"2"},
    {"slot_type":"capstone","slot_title":"Associate Capstone","credits":3,"year":2,"term":"2"}]'::jsonb),
('PGCERT-V1','Postgraduate Certificate','Postgrad Certificate Template v1','12–18 credits advanced focused study.',4,12,18,1,
  '[{"slot_type":"core","slot_title":"Advanced Core I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Advanced Core II","credits":3,"year":1,"term":"1"},
    {"slot_type":"ethics","slot_title":"Advanced Ethics","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Applied Project","credits":3,"year":1,"term":"2"}]'::jsonb),
('PGDIP-V1','Postgraduate Diploma','Postgrad Diploma Template v1','24–36 credits advanced study with project.',8,24,36,1,
  '[{"slot_type":"core","slot_title":"Advanced Core I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Advanced Core II","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Advanced Core III","credits":3,"year":1,"term":"2"},
    {"slot_type":"research_methods","slot_title":"Applied Research Methods","credits":3,"year":1,"term":"2"},
    {"slot_type":"ethics","slot_title":"Advanced Ethics","credits":3,"year":1,"term":"2"},
    {"slot_type":"elective","slot_title":"Specialization Elective","credits":3,"year":1,"term":"3"},
    {"slot_type":"capstone","slot_title":"PGDip Capstone Project","credits":6,"year":1,"term":"3"}]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Phase 9: lifecycle status
ALTER TABLE public.degree_programs
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS rebuilt_from_id uuid REFERENCES public.degree_programs(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.degree_programs
    ADD CONSTRAINT degree_programs_lifecycle_status_check
    CHECK (lifecycle_status IN ('active','experimental','archived','internal_honorific','rebuilt_replacement'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.degree_programs SET lifecycle_status = 'internal_honorific'
  WHERE lower(level) = 'exousia';

-- Phase 6: canonical faculties
CREATE TABLE IF NOT EXISTS public.canonical_faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canonical_faculties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cf readable" ON public.canonical_faculties FOR SELECT TO authenticated USING (true);
CREATE POLICY "cf admin" ON public.canonical_faculties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.canonical_faculties (code, name) VALUES
  ('FAC-THEO','Theology & Religious Studies'),
  ('FAC-CSAI','Computer Science & AI'),
  ('FAC-ENG','Engineering'),
  ('FAC-HEALTH','Health Sciences'),
  ('FAC-EDU','Education'),
  ('FAC-BUS','Business & Economics'),
  ('FAC-GOV','Governance & Public Policy'),
  ('FAC-LAW','Law'),
  ('FAC-NATSCI','Natural Sciences'),
  ('FAC-ARTS','Arts & Humanities'),
  ('FAC-SOCSCI','Social Sciences')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.program_canonical_faculty (
  program_id uuid PRIMARY KEY REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  canonical_faculty_id uuid NOT NULL REFERENCES public.canonical_faculties(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid
);
ALTER TABLE public.program_canonical_faculty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcf readable" ON public.program_canonical_faculty FOR SELECT TO authenticated USING (true);
CREATE POLICY "pcf admin" ON public.program_canonical_faculty FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Phase 3 & 7: outcomes / attributes / competencies (faculty must author)
CREATE TABLE IF NOT EXISTS public.program_learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  code text NOT NULL,
  statement text NOT NULL,
  bloom_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, code)
);
ALTER TABLE public.program_learning_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plo readable" ON public.program_learning_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "plo write" ON public.program_learning_outcomes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE IF NOT EXISTS public.course_learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL,
  statement text NOT NULL,
  bloom_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, code)
);
ALTER TABLE public.course_learning_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clo readable" ON public.course_learning_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clo write" ON public.course_learning_outcomes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE IF NOT EXISTS public.graduate_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.graduate_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ga readable" ON public.graduate_attributes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ga admin" ON public.graduate_attributes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.professional_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_faculty_id uuid REFERENCES public.canonical_faculties(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  external_framework text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.professional_competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc readable" ON public.professional_competencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "pc admin" ON public.professional_competencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.plo_attribute_mapping (
  plo_id uuid REFERENCES public.program_learning_outcomes(id) ON DELETE CASCADE,
  attribute_id uuid REFERENCES public.graduate_attributes(id) ON DELETE CASCADE,
  PRIMARY KEY (plo_id, attribute_id)
);
ALTER TABLE public.plo_attribute_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pam readable" ON public.plo_attribute_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "pam admin" ON public.plo_attribute_mapping FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

CREATE TABLE IF NOT EXISTS public.clo_plo_mapping (
  clo_id uuid REFERENCES public.course_learning_outcomes(id) ON DELETE CASCADE,
  plo_id uuid REFERENCES public.program_learning_outcomes(id) ON DELETE CASCADE,
  PRIMARY KEY (clo_id, plo_id)
);
ALTER TABLE public.clo_plo_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpm readable" ON public.clo_plo_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "cpm admin" ON public.clo_plo_mapping FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- Phase 7: accreditation framework targets
CREATE TABLE IF NOT EXISTS public.program_accreditation_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  framework text NOT NULL CHECK (framework IN ('ECTS','BOLOGNA','AQF','UK_FHEQ','CHEA','FAITH_BASED','OTHER')),
  target_level text,
  notes text,
  status text NOT NULL DEFAULT 'targeted' CHECK (status IN ('targeted','in_review','aligned','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, framework)
);
ALTER TABLE public.program_accreditation_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pat readable" ON public.program_accreditation_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "pat admin" ON public.program_accreditation_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed institution-wide graduate attributes (faculty/admin can extend)
INSERT INTO public.graduate_attributes (code, name, description) VALUES
  ('GA-CRIT','Critical Thinking','Analyzes complex problems with rigorous reasoning.'),
  ('GA-COMM','Communication','Communicates clearly across written, oral, and digital media.'),
  ('GA-ETHICS','Ethical Practice','Applies professional and academic ethics in decision making.'),
  ('GA-RESEARCH','Research Capability','Conducts and evaluates research using accepted methodologies.'),
  ('GA-SERVICE','Service & Stewardship','Acts in service to community with stewardship of resources.'),
  ('GA-SPIRIT','Scroll-Aligned Discernment','Integrates spiritual discernment with professional practice.')
ON CONFLICT (code) DO NOTHING;
