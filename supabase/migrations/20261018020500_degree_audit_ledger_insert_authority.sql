-- ============================================================================
-- P0: Degree audit ledger is not a browser-writeable source of academic truth.
--
-- Forensic evidence (2026-10-18): live RLS policy "System insert degree audit"
-- had WITH CHECK (true) TO authenticated, with a matching INSERT grant.
-- An authenticated browser must not be able to forge an academic audit event.
--
-- This migration intentionally does NOT alter existing rows, triggers, or
-- SECURITY DEFINER grade/degree-audit routines. Trusted definer routines
-- and the Supabase service_role continue to write under their own authority.
-- Do not apply outside the controlled Lovable Cloud migration-parity rollout.
-- ============================================================================
DO $guard$
BEGIN
  IF to_regclass('public.degree_audit_log') IS NULL THEN
    RAISE EXCEPTION 'degree audit authority prerequisite missing: public.degree_audit_log';
  END IF;
END
$guard$;

-- Revoke write grants first, so even a future permissive RLS policy cannot
-- turn this append-only institutional ledger into a browser-authoritative log.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.degree_audit_log
  FROM PUBLIC, anon, authenticated;

-- The original INSERT policy allowed arbitrary audit events and payloads.
-- Do not replace it with a client-owned INSERT policy.
DROP POLICY IF EXISTS "System insert degree audit"
  ON public.degree_audit_log;

-- Preserve the existing student/staff SELECT policy, historical rows and
-- existing service_role privileges. Changes to definer RPC authorization
-- are separately audited; this migration is deliberately scoped to table DML.
