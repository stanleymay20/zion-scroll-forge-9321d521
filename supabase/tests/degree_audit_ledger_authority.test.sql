-- Blocking regression: a student must not forge degree audit events.
-- Test is read-only and transaction-scoped; run after the P0 migration.
\set ON_ERROR_STOP on
BEGIN;

DO $test$
DECLARE
  v_table regclass := to_regclass('public.degree_audit_log');
  v_rls boolean;
  v_browser_insert_policies int;
  v_select_policies int;
BEGIN
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'P0: degree_audit_log does not exist; cannot verify integrity';
  END IF;

  SELECT c.relrowsecurity INTO v_rls FROM pg_class c WHERE c.oid = v_table;
  IF NOT COALESCE(v_rls,false) THEN
    RAISE EXCEPTION 'P0: degree_audit_log RLS was disabled';
  END IF;

  IF has_table_privilege('anon', v_table, 'INSERT')
     OR has_table_privilege('anon', v_table, 'UPDATE')
     OR has_table_privilege('anon', v_table, 'DELETE')
     OR has_table_privilege('authenticated', v_table, 'INSERT')
     OR has_table_privilege('authenticated', v_table, 'UPDATE')
     OR has_table_privilege('authenticated', v_table, 'DELETE') THEN
    RAISE EXCEPTION 'P0: browser roles retain direct degree_audit_log writes';
  END IF;

  SELECT COUNT(*) INTO v_browser_insert_policies
  FROM pg_policies p
  CROSS JOIN LATERAL unnest(p.roles) AS r(role_name)
  WHERE p.schemaname = 'public'
    AND p.tablename = 'degree_audit_log'
    AND p.cmd IN ('INSERT','ALL')
    AND r.role_name::text IN ('public','anon','authenticated');

  IF v_browser_insert_policies <> 0 THEN
    RAISE EXCEPTION 'P0: browser-targeted INSERT/ALL RLS policies remain on degree_audit_log (%)',
      v_browser_insert_policies;
  END IF;

  SELECT COUNT(*) INTO v_select_policies
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'degree_audit_log'
    AND p.cmd IN ('SELECT','ALL');
  IF v_select_policies = 0 THEN
    RAISE EXCEPTION 'P0: audit-log student/staff read policy was inadvertently removed';
  END IF;

  IF NOT has_table_privilege('service_role', v_table, 'INSERT') THEN
    RAISE EXCEPTION 'P0: trusted service_role lost audit-log insert permission';
  END IF;

  RAISE NOTICE 'PASS: degree audit ledger is RLS-enabled, not browser-writeable; trusted writes preserved';
END
$test$;

ROLLBACK;
