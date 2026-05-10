
-- 1. Templates table
CREATE TABLE IF NOT EXISTS public.degree_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  level text NOT NULL,
  name text NOT NULL,
  description text,
  min_courses int NOT NULL,
  min_credits int NOT NULL,
  max_credits int,
  duration_years int NOT NULL,
  slot_specs jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.degree_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates readable" ON public.degree_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates admin write" ON public.degree_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. Scroll Distinctions (overlay credential layer)
CREATE TABLE IF NOT EXISTS public.scroll_distinctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  theme text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scroll_distinctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distinctions readable" ON public.scroll_distinctions FOR SELECT TO authenticated USING (true);
CREATE POLICY "distinctions admin write" ON public.scroll_distinctions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.program_scroll_distinctions (
  program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  distinction_id uuid NOT NULL REFERENCES public.scroll_distinctions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, distinction_id)
);
ALTER TABLE public.program_scroll_distinctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psd readable" ON public.program_scroll_distinctions FOR SELECT TO authenticated USING (true);
CREATE POLICY "psd admin write" ON public.program_scroll_distinctions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3. Seed templates (slot_specs mirror blueprint generator)
INSERT INTO public.degree_templates (code, level, name, description, min_courses, min_credits, max_credits, duration_years, slot_specs) VALUES
('CERT-V1','Certificate','Certificate Template v1','Short credential, focused competency.',4,9,18,1,
  '[{"slot_type":"foundations","slot_title":"Foundations of the Discipline","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Core Competency I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Core Competency II","credits":3,"year":1,"term":"2"},
    {"slot_type":"ethics","slot_title":"Professional Ethics","credits":3,"year":1,"term":"2"}]'::jsonb),
('DIP-V1','Diploma','Diploma Template v1','Multi-term diploma with capstone.',6,18,36,1,
  '[{"slot_type":"foundations","slot_title":"Foundations of the Discipline","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Core Competency I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Core Competency II","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Core Competency III","credits":3,"year":1,"term":"2"},
    {"slot_type":"ethics","slot_title":"Applied Ethics","credits":3,"year":1,"term":"2"},
    {"slot_type":"capstone","slot_title":"Diploma Capstone Project","credits":3,"year":1,"term":"3"}]'::jsonb),
('BSC-V1','Undergraduate','Bachelor Template v1','4-year, 120+ credits, capstone + practicum.',30,120,NULL,4,
  '[{"slot_type":"foundations","slot_title":"Foundations I","credits":3,"year":1,"term":"1"},
    {"slot_type":"foundations","slot_title":"Foundations II","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Core I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Core II","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Core III","credits":3,"year":2,"term":"1"},
    {"slot_type":"core","slot_title":"Core IV","credits":3,"year":2,"term":"2"},
    {"slot_type":"core","slot_title":"Core V","credits":3,"year":3,"term":"1"},
    {"slot_type":"core","slot_title":"Core VI","credits":3,"year":3,"term":"2"},
    {"slot_type":"ethics","slot_title":"Professional & Academic Ethics","credits":3,"year":2,"term":"1"},
    {"slot_type":"research_methods","slot_title":"Research Methods","credits":3,"year":3,"term":"1"},
    {"slot_type":"elective","slot_title":"Elective I","credits":3,"year":3,"term":"2"},
    {"slot_type":"elective","slot_title":"Elective II","credits":3,"year":4,"term":"1"},
    {"slot_type":"practicum","slot_title":"Practicum / Internship","credits":6,"year":4,"term":"1"},
    {"slot_type":"capstone","slot_title":"Senior Capstone / Thesis","credits":6,"year":4,"term":"2"}]'::jsonb),
('MSC-V1','Graduate','Master Template v1','30–60 credits, research methods, ethics, thesis.',8,30,60,2,
  '[{"slot_type":"foundations","slot_title":"Graduate Foundations","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Advanced Core I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Advanced Core II","credits":3,"year":1,"term":"2"},
    {"slot_type":"core","slot_title":"Advanced Core III","credits":3,"year":1,"term":"2"},
    {"slot_type":"research_methods","slot_title":"Graduate Research Methods","credits":3,"year":1,"term":"2"},
    {"slot_type":"ethics","slot_title":"Research & Professional Ethics","credits":3,"year":1,"term":"2"},
    {"slot_type":"elective","slot_title":"Graduate Elective","credits":3,"year":2,"term":"1"},
    {"slot_type":"capstone","slot_title":"Master''s Thesis / Capstone","credits":6,"year":2,"term":"2"}]'::jsonb),
('PHD-V1','Doctoral','Doctorate Template v1','Coursework + research methods + dissertation + defense.',6,30,NULL,4,
  '[{"slot_type":"core","slot_title":"Doctoral Core Seminar I","credits":3,"year":1,"term":"1"},
    {"slot_type":"core","slot_title":"Doctoral Core Seminar II","credits":3,"year":1,"term":"2"},
    {"slot_type":"research_methods","slot_title":"Advanced Research Methods","credits":3,"year":1,"term":"1"},
    {"slot_type":"research_methods","slot_title":"Quantitative / Qualitative Methods","credits":3,"year":1,"term":"2"},
    {"slot_type":"ethics","slot_title":"Research Ethics & Integrity","credits":3,"year":1,"term":"2"},
    {"slot_type":"elective","slot_title":"Specialization Elective","credits":3,"year":2,"term":"1"},
    {"slot_type":"dissertation","slot_title":"Dissertation Proposal","credits":6,"year":2,"term":"2"},
    {"slot_type":"dissertation","slot_title":"Dissertation Research","credits":12,"year":3,"term":"1"},
    {"slot_type":"defense","slot_title":"Dissertation Defense","credits":3,"year":3,"term":"2"}]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 4. Seed Scroll Distinctions (overlay layer)
INSERT INTO public.scroll_distinctions (code, name, description, theme) VALUES
('SD-THEO-ETH','Theology & Ethical Governance','Spiritual formation and ethical decision frameworks layered on an accredited degree.','theology'),
('SD-PROPH-DISC','Prophetic Discernment','Discernment, foresight and spiritual perception applied to professional practice.','prophetic'),
('SD-KING-STEW','Kingdom Stewardship','Servant leadership and kingdom-aligned stewardship of resources and influence.','stewardship'),
('SD-SCROLL-INNOV','Scroll Innovation','Scroll-aligned innovation, creativity and applied research.','innovation')
ON CONFLICT (code) DO NOTHING;

-- 5. RPC: instantiate program from template
CREATE OR REPLACE FUNCTION public.instantiate_program_from_template(
  p_title text,
  p_faculty text,
  p_template_code text,
  p_distinction_codes text[] DEFAULT ARRAY[]::text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.degree_templates%ROWTYPE;
  v_program_id uuid;
  v_spec jsonb;
  v_dist_id uuid;
  v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins may instantiate programs from templates';
  END IF;

  SELECT * INTO v_template FROM public.degree_templates WHERE code = p_template_code AND is_active;
  IF v_template.id IS NULL THEN RAISE EXCEPTION 'Unknown template %', p_template_code; END IF;

  INSERT INTO public.degree_programs (title, faculty, level, total_credits, is_active, program_status, is_external_facing)
  VALUES (p_title, p_faculty, v_template.level, v_template.min_credits, true, 'pilot_private', true)
  RETURNING id INTO v_program_id;

  FOR v_spec IN SELECT * FROM jsonb_array_elements(v_template.slot_specs) LOOP
    INSERT INTO public.accreditation_blueprint
      (degree_program_id, slot_type, slot_title, target_credits, year_recommended, term_recommended)
    VALUES (
      v_program_id,
      v_spec->>'slot_type',
      v_spec->>'slot_title',
      (v_spec->>'credits')::int,
      (v_spec->>'year')::int,
      v_spec->>'term'
    )
    ON CONFLICT (degree_program_id, slot_type, slot_title) DO NOTHING;
  END LOOP;

  FOREACH v_code IN ARRAY p_distinction_codes LOOP
    SELECT id INTO v_dist_id FROM public.scroll_distinctions WHERE code = v_code;
    IF v_dist_id IS NOT NULL THEN
      INSERT INTO public.program_scroll_distinctions (program_id, distinction_id)
      VALUES (v_program_id, v_dist_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  PERFORM public.recompute_program_accreditation_status();
  RETURN v_program_id;
END $$;

-- 6. Link flagship MSc AI Ethics to Theology & Ethical Governance distinction
INSERT INTO public.program_scroll_distinctions (program_id, distinction_id)
SELECT 'ea2ca2cd-1c4a-45d7-a7f3-f4a7f0172fd2'::uuid, id
FROM public.scroll_distinctions WHERE code = 'SD-THEO-ETH'
ON CONFLICT DO NOTHING;
