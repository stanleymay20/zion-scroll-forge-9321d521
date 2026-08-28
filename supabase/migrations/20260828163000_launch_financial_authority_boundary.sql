-- ============================================================================
-- Launch financial authority boundary
-- ============================================================================
-- A browser may view its financial record but cannot manufacture payments,
-- invoices, subscriptions, charges, credits, refunds, or account balances.
-- Stripe/provider events and registrar/bursar workflows must cross a trusted
-- server boundary before financial state can change.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing','processed','failed')),
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;

DO $$
DECLARE p record;
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
    FOR p IN SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename='payments' AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', p.policyname); END LOOP;
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon, authenticated;
    FOR p IN SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename='invoices' AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', p.policyname); END LOOP;
  END IF;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
    FOR p IN SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename='subscriptions' AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', p.policyname); END LOOP;
  END IF;

  IF to_regclass('public.student_accounts') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.student_accounts FROM anon, authenticated;
  END IF;

  IF to_regclass('public.financial_transactions') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.financial_transactions FROM anon, authenticated;
  END IF;

  IF to_regclass('public.financial_aid') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.financial_aid FROM anon, authenticated;
  END IF;
END $$;

-- Legacy SECURITY DEFINER finance functions are backend-only. They accepted
-- arbitrary subject/account identifiers and therefore cannot be browser RPCs.
DO $$
BEGIN
  IF to_regprocedure('public.create_student_account(uuid,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_student_account(uuid,uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.create_student_account(uuid,uuid) TO service_role;
  END IF;
  IF to_regprocedure('public.post_financial_transaction(uuid,text,integer,text,uuid,text,text,text,date,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.post_financial_transaction(uuid,text,integer,text,uuid,text,text,text,date,uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.post_financial_transaction(uuid,text,integer,text,uuid,text,text,text,date,uuid) TO service_role;
  END IF;
  IF to_regprocedure('public.process_enrollment_charges(uuid,uuid,uuid,text,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.process_enrollment_charges(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.process_enrollment_charges(uuid,uuid,uuid,text,text) TO service_role;
  END IF;
  IF to_regprocedure('public.apply_financial_aid(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.apply_financial_aid(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.apply_financial_aid(uuid) TO service_role;
  END IF;
END $$;

COMMENT ON TABLE public.stripe_webhook_events IS
  'Idempotency ledger for verified Stripe webhook delivery. Browser roles have no access.';
