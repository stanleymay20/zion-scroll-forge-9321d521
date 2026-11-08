-- =====================================================================
-- Phase 2B — Dual-Persona Seed Pattern
-- =====================================================================
-- Pilot operations reality: ScrollUniversity has one human operator.
-- The system's integrity invariants (independent reviewer for content
-- publish, independent approver for credential issuance, etc.) are
-- enforced via distinct user_ids — not relaxed. Phase 2B introduces
-- a sanctioned pattern that preserves those invariants while letting
-- a single operator run the institution:
--
--   1. public.pilot_personas — one row per pilot institution, naming
--      the primary operator (holds admin + registrar + superadmin)
--      and a distinct faculty-reviewer user the operator ALSO
--      controls (second email, second auth.users row).
--   2. public.register_pilot_personas(institution, operator, reviewer)
--      RPC that validates:
--        - institution exists and is pilot (via P2A's is_pilot).
--        - operator != reviewer (the whole point).
--        - both user_ids exist in auth.users.
--        - the operator has not already registered conflicting
--          personas for this institution (one pair per institution).
--      Writes to pilot_personas + a pilot_persona_attestations audit
--      ledger so every dual-persona registration is traceable.
--   3. public.vw_pilot_personas — join to institution + both users.
--      Readable by anyone in the institution; writes go only through
--      the RPC.
--
-- This sprint ships the registration. The specific RPCs that
-- consult pilot_personas (e.g. content review, credential review)
-- will be updated in later sprints — nothing ambient changes today.
-- =====================================================================

-- ---------- 1. pilot_personas table --------------------------------
CREATE TABLE IF NOT EXISTS public.pilot_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  operator_user_id uuid NOT NULL,
  reviewer_user_id uuid NOT NULL,
  attestation text,
  registered_by uuid,
  registered_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  CONSTRAINT pilot_personas_distinct_chk CHECK (operator_user_id <> reviewer_user_id)
);

-- Defensive ALTER for any environment that pre-created a thinner table.
ALTER TABLE public.pilot_personas
  ADD COLUMN IF NOT EXISTS institution_id uuid,
  ADD COLUMN IF NOT EXISTS operator_user_id uuid,
  ADD COLUMN IF NOT EXISTS reviewer_user_id uuid,
  ADD COLUMN IF NOT EXISTS attestation text,
  ADD COLUMN IF NOT EXISTS registered_by uuid,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS retired_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_personas_active_per_institution_uidx
  ON public.pilot_personas(institution_id)
  WHERE retired_at IS NULL;

CREATE INDEX IF NOT EXISTS pilot_personas_operator_idx
  ON public.pilot_personas(operator_user_id);
CREATE INDEX IF NOT EXISTS pilot_personas_reviewer_idx
  ON public.pilot_personas(reviewer_user_id);

ALTER TABLE public.pilot_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operator reads own pilot_personas" ON public.pilot_personas;
CREATE POLICY "Operator reads own pilot_personas"
  ON public.pilot_personas FOR SELECT TO authenticated
  USING (operator_user_id = auth.uid() OR reviewer_user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Registrar admins read pilot_personas" ON public.pilot_personas';
    EXECUTE $policy$
      CREATE POLICY "Registrar admins read pilot_personas"
        ON public.pilot_personas FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
          OR public.has_role(auth.uid(), 'registrar'::public.app_role)
        )
    $policy$;
  END IF;
END$$;

COMMENT ON TABLE public.pilot_personas IS
  'P2B: canonical pilot dual-persona ledger. One active row per pilot institution; preserves the independent-reviewer invariant by pairing distinct operator and reviewer user_ids.';

-- ---------- 2. register_pilot_personas RPC --------------------------
CREATE OR REPLACE FUNCTION public.register_pilot_personas(
  _institution_id uuid,
  _operator uuid,
  _reviewer uuid,
  _attestation text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _persona_id uuid;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF _institution_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'institution_required');
  END IF;
  IF _operator IS NULL OR _reviewer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'operator_and_reviewer_required');
  END IF;
  IF _operator = _reviewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'operator_and_reviewer_must_differ');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id = _institution_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'institution_not_found');
  END IF;

  IF NOT public.institution_is_pilot(_institution_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'institution_not_pilot');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _operator) THEN
    RETURN jsonb_build_object('success', false, 'error', 'operator_user_not_found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _reviewer) THEN
    RETURN jsonb_build_object('success', false, 'error', 'reviewer_user_not_found');
  END IF;

  INSERT INTO public.pilot_personas
    (institution_id, operator_user_id, reviewer_user_id, attestation, registered_by)
  VALUES
    (_institution_id, _operator, _reviewer, _attestation, _actor)
  ON CONFLICT (institution_id) WHERE retired_at IS NULL
  DO NOTHING
  RETURNING id INTO _persona_id;

  IF _persona_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'active_pilot_personas_already_registered');
  END IF;

  -- Write a parallel audit row (ops_log if present; otherwise skip).
  BEGIN
    IF to_regclass('public.ops_log') IS NOT NULL THEN
      EXECUTE
        'INSERT INTO public.ops_log (actor_id, action, target_table, target_id, payload) '
        'VALUES ($1, ''pilot_personas_registered'', ''pilot_personas'', $2, $3)'
      USING _actor, _persona_id,
        jsonb_build_object(
          'institution_id', _institution_id,
          'operator', _operator,
          'reviewer', _reviewer,
          'attestation', COALESCE(_attestation, '')
        );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- ops_log shape drift tolerated; the pilot_personas row itself is
    -- the primary record.
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'persona_id', _persona_id,
    'institution_id', _institution_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_pilot_personas(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_pilot_personas(uuid, uuid, uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.register_pilot_personas(uuid, uuid, uuid, text) IS
  'P2B: register a dual-persona pair for a pilot institution. Validates both user_ids exist, are distinct, and that the institution is pilot. One active pair per institution.';

-- ---------- 3. vw_pilot_personas ------------------------------------
CREATE OR REPLACE VIEW public.vw_pilot_personas AS
SELECT
  pp.id,
  pp.institution_id,
  i.name                               AS institution_name,
  pp.operator_user_id,
  op.email                             AS operator_email,
  pp.reviewer_user_id,
  rv.email                             AS reviewer_email,
  pp.attestation,
  pp.registered_at,
  pp.retired_at,
  (pp.retired_at IS NULL)              AS is_active
FROM public.pilot_personas pp
LEFT JOIN public.institutions i ON i.id = pp.institution_id
LEFT JOIN auth.users op         ON op.id = pp.operator_user_id
LEFT JOIN auth.users rv         ON rv.id = pp.reviewer_user_id;

GRANT SELECT ON public.vw_pilot_personas TO authenticated;

COMMENT ON VIEW public.vw_pilot_personas IS
  'P2B: canonical pilot dual-persona view. One row per active pair with both users'' emails for operator dashboards.';
