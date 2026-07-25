
-- =========================================================================
-- Sprint D3.6 — Skill Taxonomy & Skill-Attested Learning
-- =========================================================================

-- 3.1 Versioning on skills_catalog ---------------------------------------
ALTER TABLE public.skills_catalog
  ADD COLUMN IF NOT EXISTS skill_version   text        NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS effective_from  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS effective_to    timestamptz,
  ADD COLUMN IF NOT EXISTS is_current      boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS external_ids    jsonb       NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS skills_catalog_current_name_uidx
  ON public.skills_catalog (lower(name)) WHERE is_current = true;

-- 3.2 Mapping tables -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  skill_id  uuid NOT NULL REFERENCES public.skills_catalog(id) ON DELETE CASCADE,
  weight    numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source    text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, skill_id)
);

GRANT SELECT ON public.course_skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_skills TO authenticated;
GRANT ALL ON public.course_skills TO service_role;
ALTER TABLE public.course_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_skills_public_read" ON public.course_skills
  FOR SELECT USING (true);
CREATE POLICY "course_skills_faculty_write" ON public.course_skills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "course_skills_faculty_update" ON public.course_skills
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "course_skills_faculty_delete" ON public.course_skills
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE TABLE IF NOT EXISTS public.module_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  skill_id  uuid NOT NULL REFERENCES public.skills_catalog(id) ON DELETE CASCADE,
  weight    numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source    text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, skill_id)
);

GRANT SELECT ON public.module_skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.module_skills TO authenticated;
GRANT ALL ON public.module_skills TO service_role;
ALTER TABLE public.module_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_skills_public_read" ON public.module_skills FOR SELECT USING (true);
CREATE POLICY "module_skills_faculty_write" ON public.module_skills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "module_skills_faculty_update" ON public.module_skills
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "module_skills_faculty_delete" ON public.module_skills
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE TABLE IF NOT EXISTS public.assessment_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type text NOT NULL CHECK (assessment_type IN ('assignment','divine_assessment','quiz','exam')),
  assessment_id   uuid NOT NULL,
  skill_id  uuid NOT NULL REFERENCES public.skills_catalog(id) ON DELETE CASCADE,
  weight    numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source    text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_type, assessment_id, skill_id)
);

GRANT SELECT ON public.assessment_skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assessment_skills TO authenticated;
GRANT ALL ON public.assessment_skills TO service_role;
ALTER TABLE public.assessment_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessment_skills_public_read" ON public.assessment_skills FOR SELECT USING (true);
CREATE POLICY "assessment_skills_faculty_write" ON public.assessment_skills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "assessment_skills_faculty_update" ON public.assessment_skills
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "assessment_skills_faculty_delete" ON public.assessment_skills
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

-- 3.3 Append-only evidence ledger ---------------------------------------
CREATE TABLE IF NOT EXISTS public.student_skill_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills_catalog(id) ON DELETE CASCADE,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('demonstrated','inferred')),
  source_type   text NOT NULL,
  source_id     uuid,
  mastery_score numeric NOT NULL CHECK (mastery_score BETWEEN 0 AND 100),
  confidence    numeric NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_skill_events_dedup_uidx
  ON public.student_skill_events (user_id, skill_id, source_type, COALESCE(source_id,'00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS student_skill_events_user_idx ON public.student_skill_events(user_id);
CREATE INDEX IF NOT EXISTS student_skill_events_skill_idx ON public.student_skill_events(skill_id);

GRANT SELECT, INSERT ON public.student_skill_events TO authenticated;
GRANT ALL ON public.student_skill_events TO service_role;
ALTER TABLE public.student_skill_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reject_skill_event_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'student_skill_events is append-only'; END $$;

DROP TRIGGER IF EXISTS student_skill_events_no_update ON public.student_skill_events;
CREATE TRIGGER student_skill_events_no_update
  BEFORE UPDATE OR DELETE ON public.student_skill_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_skill_event_mutation();

CREATE POLICY "sse_self_read" ON public.student_skill_events
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'faculty')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'superadmin')
    OR EXISTS (SELECT 1 FROM public.advising_assignments a
               WHERE a.student_user_id = student_skill_events.user_id
                 AND a.advisor_user_id = auth.uid()
                 AND a.active)
  );

CREATE POLICY "sse_service_insert" ON public.student_skill_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'faculty')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'superadmin')
  );

-- 3.4 Aggregate view -----------------------------------------------------
CREATE OR REPLACE VIEW public.vw_student_skill_profile AS
WITH decayed AS (
  SELECT
    e.user_id,
    e.skill_id,
    e.evidence_kind,
    e.mastery_score,
    e.confidence * power(
      0.5::numeric,
      (EXTRACT(EPOCH FROM (now() - e.occurred_at)) / (60*60*24*30))::numeric /
      CASE WHEN e.evidence_kind = 'demonstrated' THEN 24 ELSE 12 END
    ) AS current_confidence,
    e.confidence AS original_confidence,
    e.occurred_at
  FROM public.student_skill_events e
)
SELECT
  d.user_id,
  d.skill_id,
  sc.name AS skill_name,
  sc.category,
  sc.faculty_id,
  sc.skill_version,
  d.evidence_kind,
  ROUND(SUM(d.mastery_score * d.current_confidence) / NULLIF(SUM(d.current_confidence),0), 1) AS weighted_mastery,
  ROUND(AVG(d.current_confidence)::numeric, 3) AS avg_current_confidence,
  ROUND(AVG(d.original_confidence)::numeric, 3) AS avg_original_confidence,
  COUNT(*) AS evidence_count,
  MAX(d.occurred_at) AS last_evidence_at
FROM decayed d
JOIN public.skills_catalog sc ON sc.id = d.skill_id
GROUP BY d.user_id, d.skill_id, sc.name, sc.category, sc.faculty_id, sc.skill_version, d.evidence_kind;

GRANT SELECT ON public.vw_student_skill_profile TO authenticated, service_role;

-- =========================================================================
-- 4. RPCs
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_student_skill_profile(
  _student uuid,
  _kind    text DEFAULT NULL
) RETURNS SETOF public.vw_student_skill_profile
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (
    _student = auth.uid()
    OR public.has_role(auth.uid(),'faculty')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'superadmin')
    OR EXISTS (SELECT 1 FROM public.advising_assignments
               WHERE student_user_id = _student AND advisor_user_id = auth.uid() AND active)
  ) THEN
    RAISE EXCEPTION 'not authorised to view this skill profile';
  END IF;

  RETURN QUERY
    SELECT * FROM public.vw_student_skill_profile
    WHERE user_id = _student
      AND (_kind IS NULL OR evidence_kind = _kind)
    ORDER BY weighted_mastery DESC NULLS LAST;
END $$;

GRANT EXECUTE ON FUNCTION public.get_student_skill_profile(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_skill_evidence(
  _student uuid,
  _skill uuid,
  _evidence_kind text,
  _source_type text,
  _source_id uuid,
  _mastery numeric,
  _confidence numeric DEFAULT 0.5,
  _occurred_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF _evidence_kind NOT IN ('demonstrated','inferred') THEN
    RAISE EXCEPTION 'invalid evidence_kind';
  END IF;
  IF _mastery < 0 OR _mastery > 100 THEN
    RAISE EXCEPTION 'mastery out of range';
  END IF;

  INSERT INTO public.student_skill_events(
    user_id, skill_id, evidence_kind, source_type, source_id,
    mastery_score, confidence, occurred_at
  )
  VALUES (_student, _skill, _evidence_kind, _source_type, _source_id,
          _mastery, GREATEST(0, LEAST(1, _confidence)), COALESCE(_occurred_at, now()))
  ON CONFLICT (user_id, skill_id, source_type, COALESCE(source_id,'00000000-0000-0000-0000-000000000000'::uuid))
    DO NOTHING
  RETURNING id INTO _id;

  RETURN _id;
END $$;

GRANT EXECUTE ON FUNCTION public.record_skill_evidence(uuid,uuid,text,text,uuid,numeric,numeric,timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.recompute_student_skill_mastery(_student uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _inserted integer := 0;
  r record;
BEGIN
  -- module_progress evidence (demonstrated when mastery >= 70)
  FOR r IN
    SELECT smp.user_id, ms.skill_id, smp.mastery_level, smp.updated_at, smp.module_id
      FROM public.student_module_progress smp
      JOIN public.module_skills ms ON ms.module_id = smp.module_id
     WHERE smp.user_id = _student AND smp.mastery_level >= 70
  LOOP
    PERFORM public.record_skill_evidence(
      r.user_id, r.skill_id, 'demonstrated', 'module_progress', r.module_id,
      r.mastery_level, 0.6, r.updated_at
    );
    _inserted := _inserted + 1;
  END LOOP;

  RETURN _inserted;
END $$;

GRANT EXECUTE ON FUNCTION public.recompute_student_skill_mastery(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_course_skill_map(_course uuid)
RETURNS TABLE (
  skill_id uuid,
  skill_name text,
  category text,
  source_layer text,
  weight numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH combined AS (
    SELECT cs.skill_id, 'course'::text AS layer, cs.weight FROM public.course_skills cs WHERE cs.course_id = _course
    UNION ALL
    SELECT ms.skill_id, 'module'::text, ms.weight
      FROM public.module_skills ms
      JOIN public.course_modules cm ON cm.id = ms.module_id
     WHERE cm.course_id = _course
  )
  SELECT c.skill_id, sc.name, sc.category,
         string_agg(DISTINCT c.layer, ',' ORDER BY c.layer) AS source_layer,
         MAX(c.weight) AS weight
    FROM combined c
    JOIN public.skills_catalog sc ON sc.id = c.skill_id
   GROUP BY c.skill_id, sc.name, sc.category;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_skill_map(uuid) TO anon, authenticated, service_role;
