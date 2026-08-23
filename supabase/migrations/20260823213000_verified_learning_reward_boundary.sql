-- ============================================================================
-- Verified Learning P0 — reward + legacy completion boundary
-- ============================================================================
-- Credential-bearing completion and reward issuance must originate from trusted
-- server-side evidence. Legacy browser-writable completion tables become read-only
-- projections; generic ScrollCoin minting becomes service-only.
-- ============================================================================

-- 1) Legacy completion projections are no longer student-authoritative.
DO $$
BEGIN
  IF to_regclass('public.module_progress') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.module_progress FROM authenticated;
    GRANT SELECT ON public.module_progress TO authenticated;
    DROP POLICY IF EXISTS "Users can update own progress" ON public.module_progress;
  END IF;

  IF to_regclass('public.learning_progress') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.learning_progress FROM authenticated;
    GRANT SELECT ON public.learning_progress TO authenticated;
    DROP POLICY IF EXISTS "Users can insert own progress" ON public.learning_progress;
    DROP POLICY IF EXISTS "Users can update own progress" ON public.learning_progress;
  END IF;
END $$;

-- 2) Disable legacy reward triggers whose source rows were historically client-writable.
DROP TRIGGER IF EXISTS t_award_quiz ON public.quiz_submissions;
DROP TRIGGER IF EXISTS t_award_module_complete ON public.module_progress;

-- 3) Generic mint API is internal-only. It previously accepted arbitrary user+amount.
REVOKE ALL ON FUNCTION public.earn_scrollcoin(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.earn_scrollcoin(uuid,numeric,text) TO service_role;

-- Spending remains a user action, but only against the caller's own wallet and only
-- for a positive amount. Keep service_role access for trusted backend workflows.
CREATE OR REPLACE FUNCTION public.spend_scrollcoin(p_user_id uuid, p_amount numeric, p_desc text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;

  BEGIN v_actor := auth.uid(); EXCEPTION WHEN OTHERS THEN v_actor := NULL; END;

  -- service_role has no end-user auth.uid(); ordinary callers must spend only self.
  IF v_actor IS NOT NULL AND v_actor <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.wallets
     SET balance = balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient ScrollCoin balance';
  END IF;

  INSERT INTO public.transactions(user_id,type,amount,description)
  VALUES (p_user_id,'spent',p_amount,p_desc);
END;
$$;
REVOKE ALL ON FUNCTION public.spend_scrollcoin(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_scrollcoin(uuid,numeric,text) TO authenticated, service_role;

-- 4) Immutable/idempotent source ledger for verified rewards.
CREATE TABLE IF NOT EXISTS public.verified_learning_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  source_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,reward_type,source_id)
);

ALTER TABLE public.verified_learning_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.verified_learning_rewards FROM anon, authenticated;
GRANT SELECT ON public.verified_learning_rewards TO authenticated;
GRANT ALL ON public.verified_learning_rewards TO service_role;

DROP POLICY IF EXISTS "Students read own verified rewards" ON public.verified_learning_rewards;
CREATE POLICY "Students read own verified rewards"
  ON public.verified_learning_rewards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5) Trusted, once-per-source award API. Not callable by browsers.
CREATE OR REPLACE FUNCTION public.award_verified_learning_reward(
  p_user_id uuid,
  p_reward_type text,
  p_source_id uuid,
  p_amount numeric,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'user_and_source_required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'invalid_reward_amount';
  END IF;

  INSERT INTO public.verified_learning_rewards(user_id,reward_type,source_id,amount,metadata)
  VALUES (p_user_id,p_reward_type,p_source_id,p_amount,COALESCE(p_metadata,'{}'::jsonb))
  ON CONFLICT (user_id,reward_type,source_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN false; -- already awarded; idempotent replay
  END IF;

  PERFORM public.earn_scrollcoin(
    p_user_id,
    p_amount,
    format('Verified learning reward: %s', p_reward_type)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)
  TO service_role;

COMMENT ON FUNCTION public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb) IS
  'P0 verified-learning reward boundary: service-only, positive bounded amount, unique user/reward/source idempotency, and immutable source ledger.';
