-- Module quiz attempt authority.
-- Attempt policy is enforced atomically in PostgreSQL; the browser and Edge
-- Function may display the policy but cannot grant an extra attempt.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS attempts_allowed integer NOT NULL DEFAULT 3
    CHECK (attempts_allowed BETWEEN 1 AND 20);

-- quiz_submissions is a legacy/optional relation in older clean bootstraps.
-- The active module-quiz trusted boundary now requires it, so reconcile the
-- minimal canonical shape here rather than depending on a partially applied
-- historical migration.
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  total numeric NOT NULL DEFAULT 100 CHECK (total > 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  attempt_number integer
);

-- Reconcile older table shapes without weakening existing rows or policies.
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS module_id uuid,
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS total numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS attempt_number integer;

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Reassert the verified-learning truth boundary even when this table had to be
-- created after the earlier optional-table hardening migration.
REVOKE INSERT, UPDATE, DELETE ON public.quiz_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quiz_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_submissions TO service_role;

DROP POLICY IF EXISTS "Users can insert own submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.quiz_submissions;
CREATE POLICY "Users can view own submissions"
  ON public.quiz_submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Give historical submissions deterministic attempt numbers per learner/module.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, course_id, module_id
      ORDER BY submitted_at NULLS LAST, id
    )::integer AS rn
  FROM public.quiz_submissions
)
UPDATE public.quiz_submissions qs
SET attempt_number = ranked.rn
FROM ranked
WHERE ranked.id = qs.id
  AND qs.attempt_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_submissions_attempt_unique
  ON public.quiz_submissions(user_id, course_id, module_id, attempt_number)
  WHERE attempt_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_submissions_user_module_idx
  ON public.quiz_submissions(user_id, course_id, module_id, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.module_quiz_attempt_policy(
  p_user_id uuid,
  p_course_id uuid,
  p_module_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts_allowed integer := 3;
  v_passing_score integer := 70;
  v_attempts_used integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.course_modules m
    WHERE m.id = p_module_id
      AND m.course_id = p_course_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'module_course_mismatch';
  END IF;

  -- If duplicate quiz metadata exists for a module, use the stricter effective
  -- policy rather than allowing ambiguity to weaken the assessment boundary.
  SELECT
    COALESCE(MIN(q.attempts_allowed), 3),
    COALESCE(MAX(q.passing_score), 70)
  INTO v_attempts_allowed, v_passing_score
  FROM public.quizzes q
  WHERE q.module_id = p_module_id;

  SELECT count(*)::integer
  INTO v_attempts_used
  FROM public.quiz_submissions qs
  WHERE qs.user_id = p_user_id
    AND qs.course_id = p_course_id
    AND qs.module_id = p_module_id;

  RETURN jsonb_build_object(
    'attempts_allowed', v_attempts_allowed,
    'attempts_used', v_attempts_used,
    'attempts_remaining', GREATEST(v_attempts_allowed - v_attempts_used, 0),
    'can_attempt', v_attempts_used < v_attempts_allowed,
    'passing_score', v_passing_score
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_verified_module_quiz_submission(
  p_user_id uuid,
  p_course_id uuid,
  p_module_id uuid,
  p_score numeric,
  p_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy jsonb;
  v_attempts_allowed integer;
  v_attempts_used integer;
  v_attempt_number integer;
  v_passing_score integer;
  v_submission_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_course_id IS NULL OR p_module_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'quiz_identity_required';
  END IF;

  IF p_score < 0 OR p_score > 100 OR p_total <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'invalid_quiz_score';
  END IF;

  -- Serialize attempts for one learner/module so concurrent requests cannot both
  -- observe the same remaining slot.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_course_id::text || ':' || p_module_id::text, 0)
  );

  v_policy := public.module_quiz_attempt_policy(p_user_id, p_course_id, p_module_id);
  v_attempts_allowed := (v_policy->>'attempts_allowed')::integer;
  v_attempts_used := (v_policy->>'attempts_used')::integer;
  v_passing_score := (v_policy->>'passing_score')::integer;

  IF v_attempts_used >= v_attempts_allowed THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'quiz_attempt_limit_reached',
      DETAIL = jsonb_build_object(
        'attempts_allowed', v_attempts_allowed,
        'attempts_used', v_attempts_used,
        'attempts_remaining', 0
      )::text;
  END IF;

  v_attempt_number := v_attempts_used + 1;

  INSERT INTO public.quiz_submissions (
    user_id,
    course_id,
    module_id,
    score,
    total,
    submitted_at,
    attempt_number
  ) VALUES (
    p_user_id,
    p_course_id,
    p_module_id,
    p_score,
    p_total,
    now(),
    v_attempt_number
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'attempt_number', v_attempt_number,
    'attempts_allowed', v_attempts_allowed,
    'attempts_used', v_attempt_number,
    'attempts_remaining', GREATEST(v_attempts_allowed - v_attempt_number, 0),
    'can_attempt', v_attempt_number < v_attempts_allowed,
    'passing_score', v_passing_score,
    'passed', p_score >= v_passing_score
  );
END;
$$;

-- Policy can be read only through the authenticated Edge boundary; the atomic
-- recorder itself is trusted-server-only.
REVOKE ALL ON FUNCTION public.module_quiz_attempt_policy(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_verified_module_quiz_submission(uuid, uuid, uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.module_quiz_attempt_policy(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_verified_module_quiz_submission(uuid, uuid, uuid, numeric, numeric) TO service_role;

COMMENT ON FUNCTION public.record_verified_module_quiz_submission(uuid, uuid, uuid, numeric, numeric) IS
  'Atomic trusted-server recorder for module quiz attempts. Enforces the effective attempts_allowed policy under a per-learner/module advisory transaction lock.';
