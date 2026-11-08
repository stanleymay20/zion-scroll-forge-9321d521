-- =====================================================================
-- Phase 2C — bootstrap_pilot_institution RPC
-- =====================================================================
-- One-call convenience that wraps P2A (pilot institution tier) +
-- P2B (dual-persona registration) in a single transaction:
--
--   SELECT public.bootstrap_pilot_institution(
--     _name            => 'ScrollUniversity',
--     _operator        => '<operator user_id>',
--     _reviewer        => '<reviewer user_id>',
--     _attestation     => 'Operator attests dual-persona review integrity'
--   );
--
-- Behavior:
--   - Caller must be authenticated.
--   - Both user_ids must exist in auth.users and be distinct.
--   - Creates a public.institutions row with lifecycle_status='pilot'.
--   - Calls public.register_pilot_personas internally.
--   - Writes an ops_log row ('pilot_institution_bootstrapped') when
--     that table is present.
--   - Returns jsonb: {success, institution_id, persona_id} on happy
--     path; {success:false, error:<code>} on validation failure.
--
-- The whole body runs in a sub-transaction; on any failure, both the
-- institution row and the persona row are rolled back together.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_pilot_institution(
  _name text,
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
  _institution_id uuid := gen_random_uuid();
  _personas_result jsonb;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'institution_name_required');
  END IF;
  IF _operator IS NULL OR _reviewer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'operator_and_reviewer_required');
  END IF;
  IF _operator = _reviewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'operator_and_reviewer_must_differ');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _operator) THEN
    RETURN jsonb_build_object('success', false, 'error', 'operator_user_not_found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _reviewer) THEN
    RETURN jsonb_build_object('success', false, 'error', 'reviewer_user_not_found');
  END IF;

  BEGIN
    INSERT INTO public.institutions (id, name, lifecycle_status)
    VALUES (_institution_id, trim(_name), 'pilot');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'institution_insert_failed',
                              'detail', SQLERRM);
  END;

  _personas_result := public.register_pilot_personas(
    _institution_id, _operator, _reviewer, _attestation
  );

  IF NOT COALESCE((_personas_result->>'success')::boolean, false) THEN
    -- Rollback the institution row by raising, which aborts the
    -- enclosing (sub-)transaction.
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'bootstrap_pilot_institution_rolled_back',
      DETAIL  = _personas_result::text;
  END IF;

  BEGIN
    IF to_regclass('public.ops_log') IS NOT NULL THEN
      EXECUTE
        'INSERT INTO public.ops_log (actor_id, action, target_table, target_id, payload) '
        'VALUES ($1, ''pilot_institution_bootstrapped'', ''institutions'', $2, $3)'
      USING _actor, _institution_id,
        jsonb_build_object(
          'name', trim(_name),
          'operator', _operator,
          'reviewer', _reviewer,
          'persona_id', _personas_result->'persona_id',
          'attestation', COALESCE(_attestation, '')
        );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- ops_log shape drift tolerated; primary record is the institution.
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', _institution_id,
    'persona_id', _personas_result->'persona_id'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_pilot_institution(text, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_pilot_institution(text, uuid, uuid, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.bootstrap_pilot_institution(text, uuid, uuid, text) IS
  'P2C: atomic bootstrap of a pilot institution + dual-persona pair. Wraps P2A (lifecycle_status=pilot default) + P2B (register_pilot_personas) in one transaction. Rolls back the institution row if persona registration fails.';
