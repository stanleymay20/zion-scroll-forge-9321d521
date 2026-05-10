
-- Phase 3: explicit renames
UPDATE public.degree_programs
  SET title = 'MSc in Artificial Intelligence, Ethics & Theology'
  WHERE title = 'MSc in AI Theology';

UPDATE public.degree_programs
  SET title = 'BSc in Strategic Foresight, Spiritual Discernment & Decision Intelligence'
  WHERE title = 'BSc in Prophetic Intelligence';

UPDATE public.degree_programs
  SET title = REPLACE(title, 'Kingdom Economics', 'Faith-Based Economic Ethics & Social Enterprise')
  WHERE title ILIKE '%Kingdom Economics%';

-- External-facing flag
ALTER TABLE public.degree_programs
  ADD COLUMN IF NOT EXISTS is_external_facing boolean NOT NULL DEFAULT true;

UPDATE public.degree_programs
  SET is_external_facing = false
  WHERE lower(level) = 'exousia';

-- Phase 5: Accreditation blueprint (required slots, not fake courses)
CREATE TABLE IF NOT EXISTS public.accreditation_blueprint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  slot_type text NOT NULL CHECK (slot_type IN ('foundations','research_methods','ethics','core','elective','capstone','practicum','dissertation','defense')),
  slot_title text NOT NULL,
  target_credits int NOT NULL DEFAULT 3,
  year_recommended int,
  term_recommended text,
  prerequisite_slot_id uuid REFERENCES public.accreditation_blueprint(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unfilled' CHECK (status IN ('unfilled','filled','waived')),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (degree_program_id, slot_type, slot_title)
);

CREATE INDEX IF NOT EXISTS idx_blueprint_program ON public.accreditation_blueprint(degree_program_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_status ON public.accreditation_blueprint(status);

ALTER TABLE public.accreditation_blueprint ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blueprint readable by authenticated"
  ON public.accreditation_blueprint FOR SELECT TO authenticated USING (true);

CREATE POLICY "Blueprint admin write"
  ON public.accreditation_blueprint FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- Slot generator
CREATE OR REPLACE FUNCTION public.generate_accreditation_blueprint()
RETURNS TABLE(program_id uuid, slots_inserted int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_inserted int;
  v_specs jsonb;
  v_spec jsonb;
BEGIN
  FOR r IN
    SELECT id, title, level FROM public.degree_programs
    WHERE is_active = true AND lower(level) <> 'exousia'
  LOOP
    v_inserted := 0;

    v_specs := CASE lower(r.level)
      WHEN 'certificate' THEN '[
        {"slot_type":"foundations","slot_title":"Foundations of the Discipline","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Core Competency I","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Core Competency II","credits":3,"year":1,"term":"2"},
        {"slot_type":"ethics","slot_title":"Professional Ethics","credits":3,"year":1,"term":"2"}
      ]'::jsonb
      WHEN 'diploma' THEN '[
        {"slot_type":"foundations","slot_title":"Foundations of the Discipline","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Core Competency I","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Core Competency II","credits":3,"year":1,"term":"2"},
        {"slot_type":"core","slot_title":"Core Competency III","credits":3,"year":1,"term":"2"},
        {"slot_type":"ethics","slot_title":"Applied Ethics","credits":3,"year":1,"term":"2"},
        {"slot_type":"capstone","slot_title":"Diploma Capstone Project","credits":3,"year":1,"term":"3"}
      ]'::jsonb
      WHEN 'undergraduate' THEN '[
        {"slot_type":"foundations","slot_title":"Foundations I","credits":3,"year":1,"term":"1"},
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
        {"slot_type":"capstone","slot_title":"Senior Capstone / Thesis","credits":6,"year":4,"term":"2"}
      ]'::jsonb
      WHEN 'graduate' THEN '[
        {"slot_type":"foundations","slot_title":"Graduate Foundations","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Advanced Core I","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Advanced Core II","credits":3,"year":1,"term":"2"},
        {"slot_type":"core","slot_title":"Advanced Core III","credits":3,"year":1,"term":"2"},
        {"slot_type":"research_methods","slot_title":"Graduate Research Methods","credits":3,"year":1,"term":"2"},
        {"slot_type":"ethics","slot_title":"Research & Professional Ethics","credits":3,"year":1,"term":"2"},
        {"slot_type":"elective","slot_title":"Graduate Elective","credits":3,"year":2,"term":"1"},
        {"slot_type":"capstone","slot_title":"Master''s Thesis / Capstone","credits":6,"year":2,"term":"2"}
      ]'::jsonb
      WHEN 'doctoral' THEN '[
        {"slot_type":"core","slot_title":"Doctoral Core Seminar I","credits":3,"year":1,"term":"1"},
        {"slot_type":"core","slot_title":"Doctoral Core Seminar II","credits":3,"year":1,"term":"2"},
        {"slot_type":"research_methods","slot_title":"Advanced Research Methods","credits":3,"year":1,"term":"1"},
        {"slot_type":"research_methods","slot_title":"Quantitative / Qualitative Methods","credits":3,"year":1,"term":"2"},
        {"slot_type":"ethics","slot_title":"Research Ethics & Integrity","credits":3,"year":1,"term":"2"},
        {"slot_type":"elective","slot_title":"Specialization Elective","credits":3,"year":2,"term":"1"},
        {"slot_type":"dissertation","slot_title":"Dissertation Proposal","credits":6,"year":2,"term":"2"},
        {"slot_type":"dissertation","slot_title":"Dissertation Research","credits":12,"year":3,"term":"1"},
        {"slot_type":"defense","slot_title":"Dissertation Defense","credits":3,"year":3,"term":"2"}
      ]'::jsonb
      ELSE '[]'::jsonb
    END;

    FOR v_spec IN SELECT * FROM jsonb_array_elements(v_specs) LOOP
      INSERT INTO public.accreditation_blueprint
        (degree_program_id, slot_type, slot_title, target_credits, year_recommended, term_recommended)
      VALUES (
        r.id,
        v_spec->>'slot_type',
        v_spec->>'slot_title',
        (v_spec->>'credits')::int,
        (v_spec->>'year')::int,
        v_spec->>'term'
      )
      ON CONFLICT (degree_program_id, slot_type, slot_title) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    program_id := r.id;
    slots_inserted := v_inserted;
    RETURN NEXT;
  END LOOP;
END $$;

SELECT public.generate_accreditation_blueprint();
SELECT public.recompute_program_accreditation_status();
