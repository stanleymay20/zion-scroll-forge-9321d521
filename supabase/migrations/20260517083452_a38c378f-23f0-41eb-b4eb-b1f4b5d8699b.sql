
-- PR9: Catalog Truth Enforcement & Institutional Differentiation
-- Fail-closed status engine. Never invents verification.

CREATE OR REPLACE FUNCTION public.compute_program_public_status(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prog RECORD;
  v_tier text;
  v_enrollable boolean := false;
  v_curriculum boolean := false;
  v_faculty boolean := false;
  v_outcomes boolean := false;
  v_practicum boolean := false;
  v_ai_tutor boolean := false;
  v_thesis boolean := false;
  v_accreditation boolean := false;
  v_trust_score int := 0;
  v_disclosures text[] := ARRAY[]::text[];
  v_claim_count int;
BEGIN
  SELECT * INTO prog FROM degree_programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tier', 'unknown',
      'enrollable', false,
      'trust_score', 0,
      'disclosures', ARRAY['Program not found']::text[]
    );
  END IF;

  -- Hard tier classification (fail-closed)
  v_tier := CASE
    WHEN prog.accreditation_status = 'internal_honorific' OR prog.institutional_layer = 'scroll_distinction'
      THEN 'internal_distinction'
    WHEN prog.lifecycle_status = 'archived' THEN 'archived'
    WHEN prog.program_status = 'curriculum_pending' THEN 'curriculum_pending'
    WHEN prog.accreditation_status = 'accreditation_ready' THEN 'accreditation_track'
    WHEN prog.accreditation_status = 'accreditation_track' THEN 'accreditation_track'
    WHEN prog.accreditation_status = 'needs_rework' THEN 'pilot'
    WHEN prog.institutional_layer = 'research_innovation' THEN 'research_innovation'
    WHEN prog.accreditation_status = 'experimental' THEN 'experimental'
    ELSE 'experimental'
  END;

  -- Per-dimension checks — grounded in public_claims verified state.
  -- A program "has verified X" only when at least one public_claim of that
  -- type is publicly visible per is_claim_publicly_visible().
  BEGIN
    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program'
      AND pc.subject_id = p_program_id
      AND pc.claim_type = 'curriculum'
      AND public.is_claim_publicly_visible(pc.id);
    v_curriculum := v_claim_count > 0;

    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program' AND pc.subject_id = p_program_id
      AND pc.claim_type = 'faculty'
      AND public.is_claim_publicly_visible(pc.id);
    v_faculty := v_claim_count > 0;

    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program' AND pc.subject_id = p_program_id
      AND pc.claim_type = 'employment'
      AND public.is_claim_publicly_visible(pc.id);
    v_outcomes := v_claim_count > 0;

    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program' AND pc.subject_id = p_program_id
      AND pc.claim_type = 'practicum'
      AND public.is_claim_publicly_visible(pc.id);
    v_practicum := v_claim_count > 0;

    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program' AND pc.subject_id = p_program_id
      AND pc.claim_type = 'ai_tutor'
      AND public.is_claim_publicly_visible(pc.id);
    v_ai_tutor := v_claim_count > 0;

    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program' AND pc.subject_id = p_program_id
      AND pc.claim_type = 'research'
      AND public.is_claim_publicly_visible(pc.id);
    v_thesis := v_claim_count > 0;

    SELECT COUNT(*) INTO v_claim_count
    FROM public_claims pc
    WHERE pc.subject_kind = 'program' AND pc.subject_id = p_program_id
      AND pc.claim_type = 'accreditation'
      AND public.is_claim_publicly_visible(pc.id);
    v_accreditation := v_claim_count > 0;
  EXCEPTION WHEN undefined_table OR undefined_function THEN
    -- If trust layer not present, every dimension fails closed.
    v_curriculum := false; v_faculty := false; v_outcomes := false;
    v_practicum := false; v_ai_tutor := false; v_thesis := false;
    v_accreditation := false;
  END;

  -- Enrollable only when:
  --   tier = accreditation_track
  --   AND program is active + external_facing + not archived
  --   AND verified curriculum + verified faculty + accreditation evidence
  v_enrollable :=
    v_tier = 'accreditation_track'
    AND COALESCE(prog.is_active, false)
    AND COALESCE(prog.is_external_facing, false)
    AND prog.lifecycle_status = 'active'
    AND v_curriculum AND v_faculty AND v_accreditation;

  -- Trust score (0–100) — sum of verified dimensions
  v_trust_score :=
      (CASE WHEN v_accreditation THEN 20 ELSE 0 END)
    + (CASE WHEN v_curriculum    THEN 20 ELSE 0 END)
    + (CASE WHEN v_faculty       THEN 20 ELSE 0 END)
    + (CASE WHEN v_outcomes      THEN 15 ELSE 0 END)
    + (CASE WHEN v_practicum     THEN 10 ELSE 0 END)
    + (CASE WHEN v_ai_tutor      THEN  5 ELSE 0 END)
    + (CASE WHEN v_thesis        THEN 10 ELSE 0 END);

  -- Disclosures
  IF v_tier = 'curriculum_pending' THEN
    v_disclosures := array_append(v_disclosures, 'This program is currently under development.');
  END IF;
  IF v_tier = 'pilot' THEN
    v_disclosures := array_append(v_disclosures, 'Pilot curriculum — not yet open for external enrollment.');
  END IF;
  IF v_tier = 'experimental' THEN
    v_disclosures := array_append(v_disclosures, 'Experimental program — not accreditation-ready.');
  END IF;
  IF v_tier = 'internal_distinction' THEN
    v_disclosures := array_append(v_disclosures, 'Internal honorific recognition, not an external degree.');
  END IF;
  IF NOT v_outcomes THEN
    v_disclosures := array_append(v_disclosures, 'Outcomes not yet verified.');
  END IF;
  IF NOT v_faculty THEN
    v_disclosures := array_append(v_disclosures, 'Faculty credentials pending public verification.');
  END IF;
  IF NOT v_practicum THEN
    v_disclosures := array_append(v_disclosures, 'Practicum partners not yet verified.');
  END IF;
  IF NOT v_ai_tutor THEN
    v_disclosures := array_append(v_disclosures, 'AI tutor capability not yet independently verified.');
  END IF;

  RETURN jsonb_build_object(
    'program_id', p_program_id,
    'tier', v_tier,
    'enrollable', v_enrollable,
    'trust_score', v_trust_score,
    'verified', jsonb_build_object(
      'accreditation', v_accreditation,
      'curriculum',    v_curriculum,
      'faculty',       v_faculty,
      'outcomes',      v_outcomes,
      'practicum',     v_practicum,
      'ai_tutor',      v_ai_tutor,
      'thesis',        v_thesis
    ),
    'disclosures', v_disclosures,
    'computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_program_public_status(uuid) TO anon, authenticated;

-- Read-only convenience view joining programs with their computed truth state.
CREATE OR REPLACE VIEW public.program_public_render_state AS
SELECT
  p.id                   AS program_id,
  p.title,
  p.faculty,
  p.scroll_level,
  p.accreditation_status,
  p.program_status,
  p.lifecycle_status,
  p.institutional_layer,
  public.compute_program_public_status(p.id) AS public_status
FROM public.degree_programs p;

GRANT SELECT ON public.program_public_render_state TO anon, authenticated;
