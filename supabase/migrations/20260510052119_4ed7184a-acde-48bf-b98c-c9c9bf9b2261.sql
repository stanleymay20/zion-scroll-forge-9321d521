
-- 1. Canonical faculty name normalization
CREATE OR REPLACE FUNCTION public.normalize_faculty_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_name IS NULL OR length(trim(p_name)) = 0 THEN NULL
    WHEN lower(trim(p_name)) IN ('scroll theology','theology') THEN 'Scroll Theology'
    WHEN lower(trim(p_name)) IN ('scroll medicine','scrollmedicine','scrollmedicine faculty','health') THEN 'Scroll Medicine'
    WHEN lower(trim(p_name)) IN ('scroll governance') THEN 'Scroll Governance'
    WHEN lower(trim(p_name)) IN ('scroll economy','kingdom economics','finance','kingdom finance') THEN 'Scroll Economy'
    WHEN lower(trim(p_name)) IN ('scroll education','scroll education & leadership','leadership','scroll leadership') THEN 'Scroll Education'
    WHEN lower(trim(p_name)) IN ('scroll technology','scroll engineering & ai','prophetic technology','divine technology','scroll ai') THEN 'Scroll Technology'
    WHEN lower(trim(p_name)) IN ('scroll agriculture') THEN 'Scroll Agriculture'
    WHEN lower(trim(p_name)) IN ('scroll arts','sacred arts & worship','scroll culture & arts','arts','creative arts & worship') THEN 'Scroll Arts'
    WHEN lower(trim(p_name)) IN ('scroll science','ethic science','edenic science') THEN 'Scroll Science'
    WHEN lower(trim(p_name)) IN ('scroll diplomacy','geoprophetic intelligence') THEN 'Scroll Diplomacy'
    WHEN lower(trim(p_name)) IN ('scroll justice','scroll law','prophetic law & governance') THEN 'Scroll Justice'
    WHEN lower(trim(p_name)) IN ('scroll energy') THEN 'Scroll Energy'
    WHEN lower(trim(p_name)) IN ('scrollmedia & communication') THEN 'ScrollMedia & Communication'
    WHEN lower(trim(p_name)) IN ('prophetic intelligence') THEN 'Prophetic Intelligence'
    WHEN lower(trim(p_name)) IN ('kingdom architecture') THEN 'Kingdom Architecture'
    ELSE trim(p_name)
  END;
$$;

-- 2. Audit fields on degree_program_courses
ALTER TABLE public.degree_program_courses
  ADD COLUMN IF NOT EXISTS cross_faculty_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cross_faculty_reason text,
  ADD COLUMN IF NOT EXISTS cross_faculty_approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cross_faculty_approved_at timestamptz;

-- 3. Faculty-alignment enforcement triggers
CREATE OR REPLACE FUNCTION public.enforce_dpc_faculty_alignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pf text;
  v_cf text;
BEGIN
  SELECT public.normalize_faculty_name(faculty) INTO v_pf
    FROM public.degree_programs WHERE id = NEW.degree_program_id;
  SELECT public.normalize_faculty_name(faculty) INTO v_cf
    FROM public.courses WHERE id = NEW.course_id;

  IF v_pf IS NOT NULL AND v_cf IS NOT NULL AND v_pf <> v_cf AND NOT NEW.cross_faculty_override THEN
    RAISE EXCEPTION
      'Faculty mismatch: course faculty "%" does not match program faculty "%". '
      'Set cross_faculty_override=true with cross_faculty_reason (>=10 chars) if intentional.',
      v_cf, v_pf
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.cross_faculty_override
     AND (NEW.cross_faculty_reason IS NULL OR length(trim(NEW.cross_faculty_reason)) < 10) THEN
    RAISE EXCEPTION 'cross_faculty_reason (>=10 chars) required when cross_faculty_override=true'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_dpc_faculty_alignment ON public.degree_program_courses;
CREATE TRIGGER trg_dpc_faculty_alignment
  BEFORE INSERT OR UPDATE ON public.degree_program_courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dpc_faculty_alignment();

CREATE OR REPLACE FUNCTION public.enforce_dcr_faculty_alignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pf text;
  v_cf text;
BEGIN
  SELECT public.normalize_faculty_name(faculty) INTO v_pf
    FROM public.degree_programs WHERE id = NEW.degree_id;
  SELECT public.normalize_faculty_name(faculty) INTO v_cf
    FROM public.courses WHERE id = NEW.course_id;

  IF v_pf IS NOT NULL AND v_cf IS NOT NULL AND v_pf <> v_cf THEN
    RAISE EXCEPTION
      'Faculty mismatch: course faculty "%" does not match program faculty "%"',
      v_cf, v_pf
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_dcr_faculty_alignment ON public.degree_course_requirements;
CREATE TRIGGER trg_dcr_faculty_alignment
  BEFORE INSERT OR UPDATE ON public.degree_course_requirements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dcr_faculty_alignment();

-- 4. One-time cleanup of pre-existing cross-faculty mappings without explicit override
DELETE FROM public.degree_program_courses dpc
WHERE NOT dpc.cross_faculty_override
  AND EXISTS (
    SELECT 1
    FROM public.degree_programs dp
    JOIN public.courses c ON c.id = dpc.course_id
    WHERE dp.id = dpc.degree_program_id
      AND public.normalize_faculty_name(dp.faculty) IS NOT NULL
      AND public.normalize_faculty_name(c.faculty)  IS NOT NULL
      AND public.normalize_faculty_name(dp.faculty) <> public.normalize_faculty_name(c.faculty)
  );

DELETE FROM public.degree_course_requirements dcr
WHERE EXISTS (
  SELECT 1
  FROM public.degree_programs dp
  JOIN public.courses c ON c.id = dcr.course_id
  WHERE dp.id = dcr.degree_id
    AND public.normalize_faculty_name(dp.faculty) IS NOT NULL
    AND public.normalize_faculty_name(c.faculty)  IS NOT NULL
    AND public.normalize_faculty_name(dp.faculty) <> public.normalize_faculty_name(c.faculty)
);

-- 5. Helper function: validate a candidate course for a given degree program
CREATE OR REPLACE FUNCTION public.is_course_valid_for_program(p_program_id uuid, p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.degree_program_courses dpc
    WHERE dpc.degree_program_id = p_program_id
      AND dpc.course_id = p_course_id
  );
$$;
