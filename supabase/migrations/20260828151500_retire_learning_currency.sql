-- ============================================================================
-- Retire the ScrollCoin / ScrollGold learning-currency subsystem
-- ============================================================================
-- Scroll University uses verified evidence, mastery, credentials, achievements,
-- and non-economic XP for learning motivation. Academic progress must never
-- mint, spend, or depend on a virtual currency.
--
-- Historical wallet/transaction rows are retained for audit/migration safety,
-- but all currency mutation APIs are disabled. Tables can be archived/dropped
-- later only after production data retention has been reviewed.
-- ============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb)
      FROM PUBLIC, anon, authenticated, service_role;
    COMMENT ON FUNCTION public.award_verified_learning_reward(uuid,text,uuid,numeric,jsonb) IS
      'RETIRED: verified academic evidence no longer issues economic rewards. EXECUTE is revoked.';
  END IF;

  IF to_regprocedure('public.earn_scrollcoin(uuid,numeric,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.earn_scrollcoin(uuid,numeric,text)
      FROM PUBLIC, anon, authenticated, service_role;
    COMMENT ON FUNCTION public.earn_scrollcoin(uuid,numeric,text) IS
      'RETIRED: Scroll University no longer uses a learning currency. EXECUTE is revoked.';
  END IF;

  IF to_regprocedure('public.spend_scrollcoin(uuid,numeric,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.spend_scrollcoin(uuid,numeric,text)
      FROM PUBLIC, anon, authenticated, service_role;
    COMMENT ON FUNCTION public.spend_scrollcoin(uuid,numeric,text) IS
      'RETIRED: Scroll University no longer uses a learning currency. EXECUTE is revoked.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.verified_learning_rewards') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.verified_learning_rewards
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;

  IF to_regclass('public.wallets') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.wallets
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.transactions
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.quiz_submissions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS t_award_quiz ON public.quiz_submissions';
  END IF;
  IF to_regclass('public.module_progress') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS t_award_module_complete ON public.module_progress';
  END IF;
END $$;
