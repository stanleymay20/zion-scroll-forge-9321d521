
-- Payments cluster: invoices, subscriptions, payment methods, refund requests
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('card','paypal','bank','scrollgold')),
  brand text,
  last4 text,
  exp_month int,
  exp_year int,
  is_default boolean NOT NULL DEFAULT false,
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_owner_all" ON public.payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','canceled','past_due','trialing')),
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year','week','day')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_owner_all" ON public.subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  number text NOT NULL UNIQUE DEFAULT ('INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,8)),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft','open','paid','void','uncollectible','refunded')),
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text,
  pdf_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_owner_select" ON public.invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "inv_owner_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount_cents int NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','refunded')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_owner_select" ON public.refund_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "rr_owner_insert" ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- billing_addresses: add fields if missing (keep backward-compat with existing table)
ALTER TABLE public.billing_addresses
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS line1 text,
  ADD COLUMN IF NOT EXISTS line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.billing_addresses ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ba_owner_all" ON public.billing_addresses;
CREATE POLICY "ba_owner_all" ON public.billing_addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_subs_touch ON public.subscriptions;
CREATE TRIGGER trg_subs_touch BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_rr_touch ON public.refund_requests;
CREATE TRIGGER trg_rr_touch BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_ba_touch ON public.billing_addresses;
CREATE TRIGGER trg_ba_touch BEFORE UPDATE ON public.billing_addresses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_user ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_rr_user ON public.refund_requests(user_id, created_at DESC);
