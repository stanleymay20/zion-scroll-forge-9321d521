-- Prevent new duplicate course identities without deleting or rewriting any
-- existing academic records. Existing legacy duplicates remain intact for a
-- separately audited consolidation pass.
--
-- The historical migration chain can leave a vanilla CI bootstrap without
-- institution_id even though the live Lovable Cloud schema has it. Reconcile
-- only the nullable identity columns this guard requires; do not backfill,
-- delete, merge, or otherwise reinterpret academic records here.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS institution_id uuid,
  ADD COLUMN IF NOT EXISTS faculty_id uuid;

CREATE OR REPLACE FUNCTION public.normalize_course_identity_text(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT regexp_replace(lower(btrim(coalesce(p_value, ''))), '[[:space:]]+', ' ', 'g')
$$;

REVOKE ALL ON FUNCTION public.normalize_course_identity_text(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.find_course_identity_conflict(
  p_course_id uuid,
  p_institution_id uuid,
  p_faculty_id uuid,
  p_faculty text,
  p_title text,
  p_level text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.id
  FROM public.courses c
  WHERE c.id IS DISTINCT FROM p_course_id
    AND c.institution_id IS NOT DISTINCT FROM p_institution_id
    AND public.normalize_course_identity_text(c.title) = public.normalize_course_identity_text(p_title)
    AND public.normalize_course_identity_text(c.level) = public.normalize_course_identity_text(p_level)
    AND (
      (
        c.faculty_id IS NOT NULL
        AND p_faculty_id IS NOT NULL
        AND c.faculty_id = p_faculty_id
      )
      OR (
        (c.faculty_id IS NULL OR p_faculty_id IS NULL)
        AND public.normalize_course_identity_text(c.faculty) = public.normalize_course_identity_text(p_faculty)
      )
    )
  ORDER BY c.created_at NULLS LAST, c.id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.find_course_identity_conflict(uuid,uuid,uuid,text,text,text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_course_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflict uuid;
BEGIN
  v_conflict := public.find_course_identity_conflict(
    NEW.id,
    NEW.institution_id,
    NEW.faculty_id,
    NEW.faculty,
    NEW.title,
    NEW.level
  );

  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'duplicate_course_identity',
      DETAIL = format('Conflicting course id: %s', v_conflict),
      HINT = 'Reuse the existing course identity or create a genuinely distinct faculty/title/level course.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_duplicate_course_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS course_identity_duplicate_guard ON public.courses;
CREATE TRIGGER course_identity_duplicate_guard
BEFORE INSERT OR UPDATE OF institution_id, faculty_id, faculty, title, level
ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_course_identity();

CREATE INDEX IF NOT EXISTS idx_courses_catalog_identity_lookup
ON public.courses (
  institution_id,
  faculty_id,
  lower(btrim(faculty)),
  lower(btrim(title)),
  lower(btrim(level))
);

COMMENT ON FUNCTION public.prevent_duplicate_course_identity() IS
  'COURSE_IDENTITY_DUPLICATE_GUARD_20260908: prevents new same-institution, same-faculty, normalized-title, same-level course duplicates while preserving existing historical rows.';
