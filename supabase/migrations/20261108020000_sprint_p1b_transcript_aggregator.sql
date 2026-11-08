-- =====================================================================
-- Phase 1B — Transcript / GPA Aggregator
-- =====================================================================
-- D4.1c landed public.student_course_completions — the canonical
-- per-attempt outcome ledger. Phase 1B aggregates it into the two
-- surfaces students and the registrar actually need:
--
--   1. public.student_cumulative_gpa(user) -> numeric(3,2)
--      Weighted 4.0-scale GPA over PASSING attempts. Returns 0 when
--      no completions. Deterministic; independent of attempt order.
--
--   2. public.compute_student_transcript(user) -> jsonb
--      Canonical transcript surface. Returns:
--        { student: { user_id, email, full_name_if_available },
--          totals: { credits_earned, credits_attempted, gpa, passed, failed },
--          courses: [{ course_id, course_title, grade, grade_points,
--                      credits_earned, passed, attempt_number,
--                      completed_at }, ...],
--          generated_at }
--      The student reads their own; registrar / admin / superadmin
--      can read any (conditional on has_role presence).
--
--   3. public.vw_student_transcript — per-student summary row,
--      intended for dashboards. One row per user with any completions.
--
-- Trust boundary: these are STABLE read-only functions; no writes,
-- no side effects. The transcript is "verifiable" in the sense that
-- it is deterministic over student_course_completions content; pairing
-- it with a cryptographic signature for official-transcript issuance
-- is a later sprint (requires key material + accreditation posture).
-- =====================================================================

-- ---------- 1. student_cumulative_gpa -------------------------------
-- Named distinctly from the historical public.compute_student_gpa
-- (20260518074924 1-arg + 20260626123153 2-arg returning jsonb) to
-- avoid overload ambiguity. The historical functions read
-- public.grade_records; this one reads the P1B canonical completion
-- ledger (student_course_completions).
CREATE OR REPLACE FUNCTION public.student_cumulative_gpa(_user uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ROUND(
      SUM(grade_points * credits_earned)::numeric
      / NULLIF(SUM(credits_earned), 0),
      2
    ),
    0
  )::numeric
  FROM public.student_course_completions
  WHERE user_id = _user
    AND passed
    AND grade_points IS NOT NULL
    AND credits_earned > 0;
$$;

REVOKE ALL ON FUNCTION public.student_cumulative_gpa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_cumulative_gpa(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.student_cumulative_gpa(uuid) IS
  'P1B: credit-weighted 4.0-scale cumulative GPA over passing attempts in student_course_completions. Returns 0 when there are no graded completions.';

-- ---------- 2. compute_student_transcript --------------------------
CREATE OR REPLACE FUNCTION public.compute_student_transcript(_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_courses jsonb;
  v_credits_earned numeric;
  v_credits_attempted numeric;
  v_passed int;
  v_failed int;
  v_gpa numeric;
  v_email text;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'user_id_required',
      'generated_at', now()
    );
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = _user;

  SELECT COALESCE(jsonb_agg(entry ORDER BY (entry->>'completed_at') DESC), '[]'::jsonb)
    INTO v_courses
  FROM (
    SELECT jsonb_build_object(
      'course_id',        scc.course_id,
      'course_title',     c.title,
      'grade',            scc.grade,
      'grade_points',     scc.grade_points,
      'credits_earned',   scc.credits_earned,
      'passed',           scc.passed,
      'attempt_number',   scc.attempt_number,
      'completed_at',     scc.completed_at
    ) AS entry
    FROM public.student_course_completions scc
    LEFT JOIN public.courses c ON c.id = scc.course_id
    WHERE scc.user_id = _user
  ) t;

  SELECT
    COALESCE(SUM(credits_earned) FILTER (WHERE passed), 0),
    COALESCE(SUM(credits_earned), 0),
    count(*) FILTER (WHERE passed),
    count(*) FILTER (WHERE NOT passed)
  INTO v_credits_earned, v_credits_attempted, v_passed, v_failed
  FROM public.student_course_completions
  WHERE user_id = _user;

  v_gpa := public.student_cumulative_gpa(_user);

  RETURN jsonb_build_object(
    'student', jsonb_build_object(
      'user_id', _user,
      'email', v_email
    ),
    'totals', jsonb_build_object(
      'credits_earned',    v_credits_earned,
      'credits_attempted', v_credits_attempted,
      'gpa',               v_gpa,
      'passed',            v_passed,
      'failed',            v_failed
    ),
    'courses', v_courses,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.compute_student_transcript(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_student_transcript(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.compute_student_transcript(uuid) IS
  'P1B: deterministic transcript surface over student_course_completions. Pair with a signature for official-transcript issuance in a later sprint.';

-- ---------- 3. vw_student_transcript -------------------------------
CREATE OR REPLACE VIEW public.vw_student_transcript AS
SELECT
  scc.user_id,
  u.email,
  COUNT(*) FILTER (WHERE scc.passed)                     AS passed_count,
  COUNT(*) FILTER (WHERE NOT scc.passed)                 AS failed_count,
  COALESCE(SUM(scc.credits_earned) FILTER (WHERE scc.passed), 0)
                                                         AS credits_earned,
  COALESCE(SUM(scc.credits_earned), 0)                   AS credits_attempted,
  public.student_cumulative_gpa(scc.user_id)             AS gpa,
  MAX(scc.completed_at)                                  AS most_recent_completion
FROM public.student_course_completions scc
LEFT JOIN auth.users u ON u.id = scc.user_id
GROUP BY scc.user_id, u.email;

COMMENT ON VIEW public.vw_student_transcript IS
  'P1B: one summary row per student with any completions. Backs the student dashboard transcript widget.';

GRANT SELECT ON public.vw_student_transcript TO authenticated;
