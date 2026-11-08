-- =====================================================================
-- Phase 1D — Catalog-driven policies on degree_programs
-- =====================================================================
-- D4.1c defined can_attempt_course(_max_attempts=3) and
-- evaluate_degree_completion with a hardcoded 60-credit baseline.
-- These should come from the catalog, not from engineering defaults.
--
-- Phase 1D:
--   1. Adds max_attempts (int) and required_credits (numeric(4,1))
--      to public.degree_programs.
--   2. Backfills NULLs with the historical defaults (3, 60) so
--      existing degrees keep behaving the same.
--   3. Rewrites can_attempt_course + evaluate_degree_completion to
--      resolve the policy from the student's active degree, falling
--      back to the explicit argument, then to 3 / 60.
--
-- Callers that pass an explicit _max_attempts argument keep that
-- value — catalog is the default, not an override.
-- =====================================================================

-- ---------- 1. catalog columns ---------------------------------------
ALTER TABLE public.degree_programs
  ADD COLUMN IF NOT EXISTS max_attempts int,
  ADD COLUMN IF NOT EXISTS required_credits numeric(4,1);

UPDATE public.degree_programs
   SET max_attempts     = COALESCE(max_attempts, 3),
       required_credits = COALESCE(required_credits, 60);

ALTER TABLE public.degree_programs
  ALTER COLUMN max_attempts     SET DEFAULT 3,
  ALTER COLUMN required_credits SET DEFAULT 60;

COMMENT ON COLUMN public.degree_programs.max_attempts IS
  'P1D: maximum enrollment attempts per course for students in this degree. Default 3; read by can_attempt_course.';
COMMENT ON COLUMN public.degree_programs.required_credits IS
  'P1D: total credits required to clear graduation. Default 60; read by evaluate_degree_completion.';

-- ---------- 2. can_attempt_course — catalog-aware --------------------
-- Signature kept compatible with D4.1c; parameter default changed from
-- 3 to NULL so callers can opt out of the explicit override.
CREATE OR REPLACE FUNCTION public.can_attempt_course(
  _user uuid,
  _course_id uuid,
  _max_attempts int DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues text[] := ARRAY[]::text[];
  v_passing_exists boolean;
  v_attempt_count int;
  v_resolved_max int;
  v_catalog_max int;
BEGIN
  IF _user IS NULL THEN
    RETURN ARRAY['user_id_required'];
  END IF;
  IF _course_id IS NULL THEN
    RETURN ARRAY['course_id_required'];
  END IF;

  -- Resolve max_attempts: explicit arg > student's active degree > 3.
  IF _max_attempts IS NOT NULL AND _max_attempts >= 1 THEN
    v_resolved_max := _max_attempts;
  ELSE
    SELECT dp.max_attempts INTO v_catalog_max
      FROM public.student_degree_enrollments sde
      JOIN public.degree_programs dp
        ON dp.id = COALESCE(sde.degree_id, sde.program_id)
     WHERE sde.user_id = _user
       AND sde.status IN ('active','enrolled')
     ORDER BY sde.enrolled_at DESC NULLS LAST
     LIMIT 1;
    v_resolved_max := COALESCE(v_catalog_max, 3);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.student_course_completions
     WHERE user_id = _user AND course_id = _course_id AND passed
  ) INTO v_passing_exists;
  IF v_passing_exists THEN
    v_issues := array_append(v_issues, 'already_completed_passing');
  END IF;

  SELECT count(*) INTO v_attempt_count
    FROM public.student_course_completions
   WHERE user_id = _user AND course_id = _course_id;
  IF v_attempt_count >= v_resolved_max THEN
    v_issues := array_append(v_issues, 'max_attempts_reached');
  END IF;

  RETURN v_issues;
END;
$$;

-- grants unchanged from D4.1c
REVOKE ALL ON FUNCTION public.can_attempt_course(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_attempt_course(uuid, uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_attempt_course(uuid, uuid, int) IS
  'P1D: catalog-aware repeat-attempt predicate. Resolves max_attempts from the student''s active degree_programs.max_attempts; explicit _max_attempts argument wins when supplied.';

-- ---------- 3. evaluate_degree_completion — catalog-aware ------------
-- Signature + return type unchanged. Internal body now reads
-- degree_programs.required_credits instead of the hardcoded 60.
CREATE OR REPLACE FUNCTION public.evaluate_degree_completion(
  _user uuid,
  _degree_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues text[] := ARRAY[]::text[];
  v_degree record;
  v_active_enrollment boolean;
  v_missing_course_id uuid;
  v_credits_earned numeric(6,1);
  v_active_holds int;
  v_dp_courses_exists boolean;
  v_required numeric(4,1);
BEGIN
  IF _user IS NULL THEN
    RETURN ARRAY['user_id_required'];
  END IF;
  IF _degree_id IS NULL THEN
    RETURN ARRAY['degree_id_required'];
  END IF;

  SELECT * INTO v_degree FROM public.degree_programs WHERE id = _degree_id;
  IF NOT FOUND THEN
    RETURN ARRAY['degree_not_found'];
  END IF;

  v_required := COALESCE(v_degree.required_credits, 60);

  SELECT EXISTS (
    SELECT 1 FROM public.student_degree_enrollments
     WHERE user_id = _user
       AND status IN ('active', 'enrolled')
       AND (degree_id = _degree_id OR program_id = _degree_id)
  ) INTO v_active_enrollment;
  IF NOT v_active_enrollment THEN
    v_issues := array_append(v_issues, 'no_active_enrollment_in_degree');
  END IF;

  v_dp_courses_exists := to_regclass('public.degree_program_courses') IS NOT NULL;
  IF v_dp_courses_exists THEN
    FOR v_missing_course_id IN
      SELECT dpc.course_id
        FROM public.degree_program_courses dpc
       WHERE dpc.degree_program_id = _degree_id
         AND COALESCE(dpc.is_required, true)
         AND NOT EXISTS (
           SELECT 1 FROM public.student_course_completions scc
            WHERE scc.user_id = _user
              AND scc.course_id = dpc.course_id
              AND scc.passed
         )
    LOOP
      v_issues := array_append(v_issues,
        'missing_required_course:' || v_missing_course_id::text);
    END LOOP;
  END IF;

  SELECT COALESCE(SUM(credits_earned), 0) INTO v_credits_earned
    FROM public.student_course_completions
   WHERE user_id = _user AND passed;
  IF v_credits_earned < v_required THEN
    v_issues := array_append(v_issues, 'insufficient_credits_earned');
  END IF;

  IF to_regclass('public.student_holds') IS NOT NULL THEN
    SELECT count(*) INTO v_active_holds
      FROM public.student_holds
     WHERE user_id = _user AND lifted_at IS NULL;
    IF v_active_holds > 0 THEN
      v_issues := array_append(v_issues, 'active_holds_block_graduation');
    END IF;
  END IF;

  RETURN v_issues;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_degree_completion(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_degree_completion(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.evaluate_degree_completion(uuid, uuid) IS
  'P1D: catalog-aware graduation clearance. Reads degree_programs.required_credits (default 60) rather than hardcoding the threshold.';
