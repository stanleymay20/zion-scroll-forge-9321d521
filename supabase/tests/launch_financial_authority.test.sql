-- ============================================================================
-- Launch Financial Authority Regression Suite
-- ============================================================================
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE _fin_results(test_no int,name text,status text,detail text);
CREATE OR REPLACE FUNCTION pg_temp.fin_record(n int,nm text,ok boolean,d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  INSERT INTO _fin_results VALUES(n,nm,CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END,d);
  IF NOT ok THEN RAISE EXCEPTION 'Financial authority test % failed: % — %',n,nm,d; END IF;
END $$;

DO $$ DECLARE r regclass := to_regclass('public.payments'); BEGIN
  PERFORM pg_temp.fin_record(1,'payment records are not browser-writable',r IS NULL OR (
    NOT has_table_privilege('authenticated',r,'INSERT') AND NOT has_table_privilege('authenticated',r,'UPDATE') AND NOT has_table_privilege('authenticated',r,'DELETE')));
END $$;
DO $$ DECLARE r regclass := to_regclass('public.invoices'); BEGIN
  PERFORM pg_temp.fin_record(2,'invoice records are not browser-writable',r IS NULL OR (
    NOT has_table_privilege('authenticated',r,'INSERT') AND NOT has_table_privilege('authenticated',r,'UPDATE') AND NOT has_table_privilege('authenticated',r,'DELETE')));
END $$;
DO $$ DECLARE r regclass := to_regclass('public.subscriptions'); BEGIN
  PERFORM pg_temp.fin_record(3,'subscriptions are not browser-writable',r IS NULL OR (
    NOT has_table_privilege('authenticated',r,'INSERT') AND NOT has_table_privilege('authenticated',r,'UPDATE') AND NOT has_table_privilege('authenticated',r,'DELETE')));
END $$;
DO $$ DECLARE r regclass := to_regclass('public.stripe_webhook_events'); BEGIN
  PERFORM pg_temp.fin_record(4,'Stripe event idempotency ledger exists and is private',r IS NOT NULL
    AND NOT has_table_privilege('authenticated',r,'SELECT')
    AND NOT has_table_privilege('authenticated',r,'INSERT'));
END $$;
DO $$ DECLARE f regprocedure := to_regprocedure('public.create_student_account(uuid,uuid)'); BEGIN
  PERFORM pg_temp.fin_record(5,'student account creation RPC is backend-only',f IS NULL OR NOT has_function_privilege('authenticated',f,'EXECUTE'));
END $$;
DO $$ DECLARE f regprocedure := to_regprocedure('public.apply_financial_aid(uuid)'); BEGIN
  PERFORM pg_temp.fin_record(6,'financial aid application RPC is backend-only',f IS NULL OR NOT has_function_privilege('authenticated',f,'EXECUTE'));
END $$;

\echo '================ LAUNCH FINANCIAL AUTHORITY ================'
TABLE _fin_results;
\echo '============================================================'
ROLLBACK;
