-- =====================================================================
-- Sprint D3.5-close — Faculty Workload Planner defect fixes
-- =====================================================================
-- Findings from the D3.5-close audit against the D2 governance gate:
--
--  1. workload_propose_assignment + workload_submit_proposals bypass
--     maintenance mode (spec: "All mutations must respect maintenance
--     mode"). Gate both via assert_not_maintenance() when available.
--
--  2. faculty_workload_policies.is_default has no partial unique index,
--     so multiple rows can carry is_default=true and downstream lookups
--     become non-deterministic. Enforce single-default with a partial
--     unique index.
--
--  3. Convert the direct INSERT INTO ops_log calls to ops_log_write(...)
--     to match the D3.1/D3.4 convention (actor_id defaulting, single
--     helper for future context changes).
--
-- The original migration is not rewritten — this is a follow-up patch
-- so the "shipped-then-audited" history is preserved.
-- =====================================================================

-- ---------- 1. Partial-unique default policy --------------------------
CREATE UNIQUE INDEX IF NOT EXISTS faculty_workload_policies_single_default_uidx
  ON public.faculty_workload_policies (is_default) WHERE is_default = true;

-- ---------- 2. Maintenance gating helper (idempotent shim) -----------
-- If D1 substrate isn't present in this environment we no-op; if it is,
-- we defer to the real function. Matches the D3.1/D3.4 shim pattern.
DO $shim$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='assert_not_maintenance'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.assert_not_maintenance() RETURNS void
      LANGUAGE plpgsql AS $f$ BEGIN RETURN; END $f$;
    $body$;
  END IF;
END$shim$;

DO $shim$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='ops_log_write'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.ops_log_write(
        _source text, _event text, _severity text DEFAULT 'info',
        _message text DEFAULT NULL, _context jsonb DEFAULT '{}'::jsonb,
        _correlation_id uuid DEFAULT NULL, _duration_ms integer DEFAULT NULL,
        _http_status integer DEFAULT NULL, _fingerprint text DEFAULT NULL
      ) RETURNS bigint LANGUAGE plpgsql AS $f$
      DECLARE _id bigint;
      BEGIN
        INSERT INTO public.ops_log (correlation_id, source, event, severity, actor_id,
                                    fingerprint, duration_ms, http_status, message, context)
        VALUES (COALESCE(_correlation_id, gen_random_uuid()), _source, _event, _severity,
                auth.uid(), _fingerprint, _duration_ms, _http_status, _message,
                COALESCE(_context,'{}'::jsonb))
        RETURNING id INTO _id;
        RETURN _id;
      END $f$
    $body$;
  END IF;
END$shim$;

-- ---------- 3. workload_propose_assignment (gated + helper-based) -----
CREATE OR REPLACE FUNCTION public.workload_propose_assignment(
  _section_id uuid, _role text DEFAULT 'primary', _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_term  uuid;
  v_id    uuid;
BEGIN
  BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  PERFORM public.assert_not_maintenance();

  IF NOT (public.has_role(v_actor,'faculty')
          OR public.has_role(v_actor,'admin')
          OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _role NOT IN ('primary','co_instructor','ta') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT term_id INTO v_term FROM public.course_sections WHERE id = _section_id;
  IF v_term IS NULL THEN RAISE EXCEPTION 'section_not_found_or_no_term'; END IF;

  INSERT INTO public.faculty_workload_proposals
    (faculty_user_id, term_id, section_id, role, proposed_by, notes)
  VALUES (v_actor, v_term, _section_id, _role, v_actor, _notes)
  ON CONFLICT (faculty_user_id, section_id, role)
  DO UPDATE SET notes = EXCLUDED.notes,
                status = CASE WHEN public.faculty_workload_proposals.status = 'rejected'
                              THEN 'draft' ELSE public.faculty_workload_proposals.status END
  RETURNING id INTO v_id;

  PERFORM public.ops_log_write(
    'rpc', 'workload.proposal_created', 'info',
    format('Workload proposal %s for section %s (%s)', v_id, _section_id, _role),
    jsonb_build_object('proposal_id', v_id, 'section_id', _section_id, 'role', _role)
  );

  RETURN v_id;
END$$;

-- ---------- 4. workload_submit_proposals (gated + helper-based) ------
CREATE OR REPLACE FUNCTION public.workload_submit_proposals(_term_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_corr  uuid := gen_random_uuid();
  v_count integer;
BEGIN
  BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  PERFORM public.assert_not_maintenance();

  UPDATE public.faculty_workload_proposals
     SET status = 'submitted'
   WHERE faculty_user_id = v_actor
     AND term_id = _term_id
     AND status = 'draft';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.ops_log_write(
    'rpc', 'workload.proposals_submitted', 'info',
    format('%s workload proposal(s) submitted for term %s', v_count, _term_id),
    jsonb_build_object('term_id', _term_id, 'count', v_count),
    v_corr
  );

  RETURN v_count;
END$$;

COMMENT ON FUNCTION public.workload_propose_assignment(uuid, text, text) IS
  'Sprint D3.5 (closed by D3.5-close): maintenance-gated, actor-required, '
  'audited through ops_log_write. Read-and-plan only — no academic-engine writes.';

COMMENT ON FUNCTION public.workload_submit_proposals(uuid) IS
  'Sprint D3.5 (closed by D3.5-close): maintenance-gated, actor-required, '
  'audited with correlated ops_log batch.';
