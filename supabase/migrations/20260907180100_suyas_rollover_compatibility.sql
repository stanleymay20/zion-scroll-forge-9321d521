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

  SELECT count(*), min(id)
    INTO v_source_matches, v_source_id
    FROM public.academic_terms
   WHERE lower(code) = v_source OR lower(name) = v_source;

  SELECT count(*), min(id)
    INTO v_target_matches, v_target_id
    FROM public.academic_terms
   WHERE lower(code) = v_target OR lower(name) = v_target;

  IF v_source_matches = 0 THEN
    RAISE EXCEPTION 'source_canonical_suyas_term_not_found';
  ELSIF v_source_matches > 1 THEN
    RAISE EXCEPTION 'source_canonical_suyas_term_ambiguous';
  END IF;

  IF v_target_matches = 0 THEN
    RAISE EXCEPTION 'target_canonical_suyas_term_not_found';
  ELSIF v_target_matches > 1 THEN
    RAISE EXCEPTION 'target_canonical_suyas_term_ambiguous';
  END IF;

  RETURN public.rollover_suyas_term(v_source_id, v_target_id, p_only_active);
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_term(text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollover_term(text,text,boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.rollover_term(text,text,boolean) IS
  'Compatibility facade for Operations UI. Text is identifier input only: source and target must resolve uniquely to existing academic_terms code/name, then rollover delegates to rollover_suyas_term(uuid,uuid,boolean). It cannot create arbitrary term labels.';
