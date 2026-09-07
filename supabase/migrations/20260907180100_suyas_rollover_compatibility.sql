-- ============================================================================
-- SUYAS rollover compatibility
-- Keeps the existing Operations Command Center callable while removing the
-- authority of free text: labels must resolve uniquely to canonical terms.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rollover_term(
  p_source_term_label text,
  p_target_term_label text,
  p_only_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_id uuid;
  v_target_id uuid;
  v_source_matches int;
  v_target_matches int;
  v_source text := lower(trim(COALESCE(p_source_term_label, '')));
  v_target text := lower(trim(COALESCE(p_target_term_label, '')));
BEGIN
  IF v_source = '' OR v_target = '' THEN
    RAISE EXCEPTION 'canonical_suyas_term_label_required';
  END IF;
  IF v_source = v_target THEN
    RAISE EXCEPTION 'same_term';
  END IF;

  SELECT count(*)
    INTO v_source_matches
    FROM public.academic_terms
   WHERE lower(code) = v_source OR lower(name) = v_source;

  IF v_source_matches = 0 THEN
    RAISE EXCEPTION 'source_canonical_suyas_term_not_found';
  ELSIF v_source_matches > 1 THEN
    RAISE EXCEPTION 'source_canonical_suyas_term_ambiguous';
  END IF;

  SELECT id
    INTO v_source_id
    FROM public.academic_terms
   WHERE lower(code) = v_source OR lower(name) = v_source
   LIMIT 1;

  SELECT count(*)
    INTO v_target_matches
    FROM public.academic_terms
   WHERE lower(code) = v_target OR lower(name) = v_target;

  IF v_target_matches = 0 THEN
    RAISE EXCEPTION 'target_canonical_suyas_term_not_found';
  ELSIF v_target_matches > 1 THEN
    RAISE EXCEPTION 'target_canonical_suyas_term_ambiguous';
  END IF;

  SELECT id
    INTO v_target_id
    FROM public.academic_terms
   WHERE lower(code) = v_target OR lower(name) = v_target
   LIMIT 1;

  RETURN public.rollover_suyas_term(v_source_id, v_target_id, p_only_active);
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_term(text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollover_term(text,text,boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.rollover_term(text,text,boolean) IS
  'Compatibility facade for Operations UI. Text is identifier input only: source and target must resolve uniquely to existing academic_terms code/name, then rollover delegates to rollover_suyas_term(uuid,uuid,boolean). It cannot create arbitrary term labels.';

-- ============================================================================
-- Assignment publication compatibility hardening
-- `published` is the sole publication authority. Historical `is_published`
-- remains only as a synchronized read-compatibility alias when that column exists.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_suyas_assignment_publication_alias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A caller may not create a publication transition by changing only the
  -- historical alias. Canonical `published` must be the field that changes so
  -- trg_suyas_assignment_publication_scope can validate section -> term -> year.
  IF TG_OP = 'UPDATE'
     AND OLD.is_published IS DISTINCT FROM NEW.is_published
     AND OLD.published IS NOT DISTINCT FROM NEW.published THEN
    RAISE EXCEPTION 'suyas_legacy_is_published_read_only';
  END IF;

  IF TG_OP = 'INSERT'
     AND NEW.is_published IS DISTINCT FROM COALESCE(NEW.published, false) THEN
    RAISE EXCEPTION 'suyas_legacy_is_published_read_only';
  END IF;

  NEW.is_published := COALESCE(NEW.published, false);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_suyas_assignment_publication_alias() FROM PUBLIC;

DO $$
DECLARE
  v_has_legacy_is_published boolean;
BEGIN
  IF to_regclass('public.assignments') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.assignments
     SET published = false
   WHERE published IS NULL;

  ALTER TABLE public.assignments
    ALTER COLUMN published SET DEFAULT false,
    ALTER COLUMN published SET NOT NULL;

  ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

  -- Historical assignment SELECT policies accumulated as permissive OR rules.
  -- Remove every known broad student/public policy before installing one
  -- canonical publication-aware visibility rule.
  DROP POLICY IF EXISTS "Students can view published assignments" ON public.assignments;
  DROP POLICY IF EXISTS "Students can view assignments for enrolled courses" ON public.assignments;
  DROP POLICY IF EXISTS "Students can view course assignments" ON public.assignments;
  DROP POLICY IF EXISTS "Assignments readable when course allows access" ON public.assignments;
  DROP POLICY IF EXISTS "read assignments if enrolled or teaching" ON public.assignments;
  DROP POLICY IF EXISTS "Assignments readable only by enrolled students or teaching faculty" ON public.assignments;
  DROP POLICY IF EXISTS "Assignments canonical publication visibility" ON public.assignments;

  CREATE POLICY "Assignments canonical publication visibility"
    ON public.assignments
    FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'superadmin')
      OR public.has_role(auth.uid(), 'faculty')
      OR public.has_role(auth.uid(), 'registrar')
      OR (
        published IS TRUE
        AND EXISTS (
          SELECT 1
            FROM public.enrollments e
           WHERE e.course_id = assignments.course_id
             AND e.user_id = auth.uid()
        )
      )
    );

  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'assignments'
       AND column_name = 'is_published'
  ) INTO v_has_legacy_is_published;

  DROP TRIGGER IF EXISTS trg_z_suyas_assignment_publication_alias ON public.assignments;

  IF v_has_legacy_is_published THEN
    EXECUTE 'UPDATE public.assignments
                SET is_published = published
              WHERE is_published IS DISTINCT FROM published';
    EXECUTE 'ALTER TABLE public.assignments
               ALTER COLUMN is_published SET DEFAULT false,
               ALTER COLUMN is_published SET NOT NULL';

    -- Alphabetical trigger order intentionally places this `trg_z_...` trigger
    -- after trg_suyas_assignment_publication_scope for the same BEFORE event.
    CREATE TRIGGER trg_z_suyas_assignment_publication_alias
      BEFORE INSERT OR UPDATE OF published, is_published
      ON public.assignments
      FOR EACH ROW EXECUTE FUNCTION public.tg_suyas_assignment_publication_alias();

    EXECUTE $comment$
      COMMENT ON COLUMN public.assignments.is_published IS
        'Legacy read-compatibility alias. SUYAS canonical publication authority is assignments.published; direct alias-only mutation is rejected.'
    $comment$;
  END IF;
END$$;

COMMENT ON COLUMN public.assignments.published IS
  'Canonical assignment publication state. New publication transitions are governed by SUYAS section -> term -> academic-year authority.';
