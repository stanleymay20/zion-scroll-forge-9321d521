-- ============================================================================
-- ScrollCoin spending identity boundary
--
-- SECURITY: Never infer trusted backend execution merely from auth.uid() = NULL.
-- An absent/invalid JWT identity must fail closed. Only an explicit service_role
-- claim may spend on behalf of another user; authenticated users are self-only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.spend_scrollcoin(
  p_user_id uuid,
  p_amount numeric,
  p_desc text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_role text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;

  -- Read the caller identity from the request claims. Do not convert identity
  -- parsing failures or absent claims into trusted backend authority.
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  BEGIN
    v_role := auth.role();
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  -- Trusted backend delegation is explicit. Every other caller must have a
  -- concrete identity and may debit only its own wallet.
  IF COALESCE(v_role, '') <> 'service_role' THEN
    IF v_actor IS NULL OR v_actor <> p_user_id THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  UPDATE public.wallets
     SET balance = balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient ScrollCoin balance';
  END IF;

  INSERT INTO public.transactions(user_id, type, amount, description)
  VALUES (p_user_id, 'spent', p_amount, p_desc);
END;
$$;

REVOKE ALL ON FUNCTION public.spend_scrollcoin(uuid,numeric,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_scrollcoin(uuid,numeric,text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.spend_scrollcoin(uuid,numeric,text) IS
  'Self-only ScrollCoin spending for authenticated users. Cross-user spending requires an explicit service_role claim; missing or invalid caller identity fails closed.';
