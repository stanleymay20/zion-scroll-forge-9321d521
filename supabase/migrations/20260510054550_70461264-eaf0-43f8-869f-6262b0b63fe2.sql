-- Canonicalize faculty display names across programs & courses to the 12 canonical names
-- Uses existing normalize_faculty_name(); non-destructive (no mappings deleted/added)

UPDATE public.degree_programs
SET faculty = normalize_faculty_name(faculty)
WHERE faculty IS NOT NULL
  AND faculty <> normalize_faculty_name(faculty);

UPDATE public.courses
SET faculty = normalize_faculty_name(faculty)
WHERE faculty IS NOT NULL
  AND faculty <> normalize_faculty_name(faculty);

-- Going-forward enforcement: trigger to keep faculty text canonical on write
CREATE OR REPLACE FUNCTION public.enforce_canonical_faculty_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.faculty IS NOT NULL THEN
    NEW.faculty := public.normalize_faculty_name(NEW.faculty);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canonical_faculty_programs ON public.degree_programs;
CREATE TRIGGER trg_canonical_faculty_programs
BEFORE INSERT OR UPDATE OF faculty ON public.degree_programs
FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_faculty_name();

DROP TRIGGER IF EXISTS trg_canonical_faculty_courses ON public.courses;
CREATE TRIGGER trg_canonical_faculty_courses
BEFORE INSERT OR UPDATE OF faculty ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_faculty_name();