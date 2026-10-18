-- ============================================================================
-- P0 (2026-10-18): stop unauthenticated / cross-student execution of
-- PostgreSQL SECURITY DEFINER academic state functions.
--
-- Live Lovable Cloud forensic proof (read-only): postgres-owned definer RPCs
-- generate_degree_plan(uuid,uuid), run_degree_audit(uuid,uuid),
-- evaluate_graduation_candidate(uuid), check_credential_eligibility(uuid,kind)
-- were all callable by anon and authenticated; none checked caller identity.
--
-- Do NOT execute against production until Lovable Cloud migration parity,
-- staging proof of legitimate registrar workflows and backups are approved.
-- ============================================================================
DO $preflight$
DECLARE
  v_name text;
  v_signature text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.generate_degree_plan(uuid,uuid)',
    'public.run_degree_audit(uuid,uuid)',
    'public.evaluate_graduation_candidate(uuid)',
    'public.check_credential_eligibility(uuid,public.issued_credential_kind)'
  ] LOOP
    IF to_regprocedure(v_signature) IS NULL THEN
      RAISE EXCEPTION 'degree RPC hardening prerequisite missing: %',v_signature;
    END IF;
  END LOOP;

  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'degree RPC hardening requires canonical has_role identity predicate';
  END IF;
END
$preflight$;

-- These are *state-changing* academic authorities, not student-facing RPCs.
-- Internal postgres-owned SECURITY DEFINER callers and service_role retain
-- execution. Legitimate users read their own progress via RLS views/portal.
REVOKE ALL ON FUNCTION public.generate_degree_plan(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_degree_audit(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_graduation_candidate(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generate_degree_plan(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_degree_audit(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_graduation_candidate(uuid) TO service_role;

-- The existing registrar-only browser calls check_credential_eligibility.
-- Keep that staff UI working while rejecting arbitrary student-ID queries.
CREATE OR REPLACE FUNCTION public.check_credential_eligibility(
  p_student_id uuid,
  p_kind public.issued_credential_kind
)
RETURNS TABLE (eligible boolean, reason text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_stats jsonb;
  v_final_credits numeric;
  v_gpa numeric;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT (
       COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role),false)
       OR COALESCE(public.has_role(auth.uid(), 'superadmin'::public.app_role),false)
       OR COALESCE(public.has_role(auth.uid(), 'registrar'::public.app_role),false)
     )
  THEN
    RAISE EXCEPTION 'credential_eligibility_forbidden' USING ERRCODE='42501';
  END IF;

  v_stats := public.compute_student_gpa(p_student_id,NULL);
  v_final_credits := COALESCE((v_stats->>'total_credit_hours')::numeric,0);
  v_gpa := NULLIF(v_stats->>'gpa','')::numeric;

  IF p_kind IN ('bachelor','master','doctorate','supreme') AND v_final_credits < 30 THEN
    RETURN QUERY SELECT false, 'Insufficient finalized credit hours for this credential tier';
    RETURN;
  END IF;
  IF p_kind IN ('master','doctorate','supreme') AND (v_gpa IS NULL OR v_gpa < 3.0) THEN
    RETURN QUERY SELECT false, 'GPA threshold not met for graduate-tier credential';
    RETURN;
  END IF;
  RETURN QUERY SELECT true, 'Eligibility checks passed';
END
$body$;

REVOKE ALL ON FUNCTION public.check_credential_eligibility(uuid,public.issued_credential_kind)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_credential_eligibility(uuid,public.issued_credential_kind)
  TO authenticated,service_role;

COMMENT ON FUNCTION public.check_credential_eligibility(uuid,public.issued_credential_kind)
IS 'P0 academic authority: only explicit active registrar/admin/superadmin roles or service_role may inspect another student credential eligibility. Not publicly callable.';
