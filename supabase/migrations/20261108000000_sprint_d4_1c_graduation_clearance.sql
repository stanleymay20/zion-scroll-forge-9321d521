-- =====================================================================
-- Sprint D4.1c — Graduation Clearance + Repeat/Attempt Policy
-- =====================================================================
-- D4.1a reconciled the registrar substrate. D4.1b hardened the
-- enrollment state-write path with a trusted-session guard and the
-- holds + deadline-aware drop RPCs. D4.1c closes the registrar track
-- by adding:
--
--   1. public.student_course_completions — a canonical table recording
--      final outcomes of a student's course attempts (grade, credits
--      earned, completion timestamp). Historical shapes vary on
--      whether enrollments / section_enrollments carry these fields,
--      and the enroll RPC's historical "completed_at IS NOT NULL"
--      check reads a column that doesn't reliably exist. This table
--      is the deliberate canonical home for that signal.
--
--   2. can_attempt_course(student, course, max_attempts) -> text[]
--      Returns a list of blockers for a new enrollment attempt. Issue
--      codes: already_completed_passing, max_attempts_reached,
--      user_id_required, course_id_required.
--      Called by future registrar wrappers; the existing enroll
--      RPC stays untouched.
--
--   3. evaluate_degree_completion(student, degree) -> text[]
--      Enumerates remaining requirements blocking graduation.
--      Issue codes: user_id_required, degree_id_required,
--      degree_not_found, no_active_enrollment_in_degree,
--      missing_required_course:<course_id>,
--      insufficient_credits_earned, active_holds_block_graduation.
--      Empty array = ready to graduate.
--
--   4. vw_student_degree_progress — per-student-degree-enrollment
--      scorecard with required/completed counts, credits earned, and
--      the issue list from evaluate_degree_completion.
--
-- Non-goals this slice (D4.1 close-out):
--   - Transfer-credit reconciliation (program_transfer_requests
--     promotion is still ad-hoc).
--   - Registrar notification hook (pending notifications table
--     reconciliation; CI logs "column body of relation notifications
--     does not exist" as advisory noise).
-- =====================================================================

-- ---------- 1. student_course_completions ---------------------------
CREATE TABLE IF NOT EXISTS public.student_course_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  grade text,
  grade_points numeric(4,2),
  credits_earned numeric(4,1) NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempt_number int NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Defensive ALTER for environments that pre-create the table with
-- an older column set.
ALTER TABLE public.student_course_completions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS grade_points numeric(4,2),
  ADD COLUMN IF NOT EXISTS credits_earned numeric(4,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS recorded_by uuid;

CREATE INDEX IF NOT EXISTS student_completions_user_idx
  ON public.student_course_completions(user_id, course_id);

CREATE INDEX IF NOT EXISTS student_completions_passed_idx
  ON public.student_course_completions(user_id)
  WHERE passed;

ALTER TABLE public.student_course_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student reads own completions" ON public.student_course_completions;
CREATE POLICY "Student reads own completions"
  ON public.student_course_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin / registrar / faculty read — conditional on has_role presence
-- (same defensive pattern as D4.1a/b).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Registrar reads all completions" ON public.student_course_completions';
    EXECUTE $policy$
      CREATE POLICY "Registrar reads all completions"
        ON public.student_course_completions FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
          OR public.has_role(auth.uid(), 'registrar'::public.app_role)
          OR public.has_role(auth.uid(), 'faculty'::public.app_role)
        )
    $policy$;
  END IF;
END$$;

COMMENT ON TABLE public.student_course_completions IS
  'D4.1c: canonical final-outcome ledger per student+course attempt. Reliable completion signal that evaluate_degree_completion and can_attempt_course read, independent of the shared enrollments table drift.';

-- ---------- 2. can_attempt_course -----------------------------------
CREATE OR REPLACE FUNCTION public.can_attempt_course(
  _user uuid,
  _course_id uuid,
  _max_attempts int DEFAULT 3
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
BEGIN
  IF _user IS NULL THEN
    RETURN ARRAY['user_id_required'];
  END IF;
  IF _course_id IS NULL THEN
    RETURN ARRAY['course_id_required'];
  END IF;
  IF _max_attempts IS NULL OR _max_attempts < 1 THEN
    _max_attempts := 3;
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
  IF v_attempt_count >= _max_attempts THEN
    v_issues := array_append(v_issues, 'max_attempts_reached');
  END IF;

  RETURN v_issues;
END;
$$;

REVOKE ALL ON FUNCTION public.can_attempt_course(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_attempt_course(uuid, uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_attempt_course(uuid, uuid, int) IS
  'D4.1c: list reasons a given student cannot attempt a given course now. Empty = allowed. Issue codes: user_id_required, course_id_required, already_completed_passing, max_attempts_reached.';

-- ---------- 3. evaluate_degree_completion ---------------------------
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
  v_degree_exists boolean;
  v_active_enrollment boolean;
  v_missing_course_id uuid;
  v_credits_earned numeric(6,1);
  v_active_holds int;
  v_dp_courses_exists boolean;
BEGIN
  IF _user IS NULL THEN
    RETURN ARRAY['user_id_required'];
  END IF;
  IF _degree_id IS NULL THEN
    RETURN ARRAY['degree_id_required'];
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.degree_programs WHERE id = _degree_id
  ) INTO v_degree_exists;
  IF NOT v_degree_exists THEN
    RETURN ARRAY['degree_not_found'];
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.student_degree_enrollments
     WHERE user_id = _user
       AND status IN ('active', 'enrolled')
       AND (degree_id = _degree_id OR program_id = _degree_id)
  ) INTO v_active_enrollment;
  IF NOT v_active_enrollment THEN
    v_issues := array_append(v_issues, 'no_active_enrollment_in_degree');
  END IF;

  -- Required-course coverage. Only check when degree_program_courses
  -- carries required rows for this degree; many degrees in production
  -- store their requirements elsewhere, in which case this check is a
  -- no-op and the clearance relies on credits + holds alone.
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
  -- Threshold is advisory until degrees declare their own credit
  -- requirement. 60 is the common associate/half-bachelor baseline.
  IF v_credits_earned < 60 THEN
    v_issues := array_append(v_issues, 'insufficient_credits_earned');
  END IF;

  -- Active holds that block administrative actions like graduation.
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
  'D4.1c: list remaining requirements blocking a given student from graduating a given degree. Empty = cleared. Reads degree_program_courses, student_course_completions, student_holds.';

-- ---------- 4. vw_student_degree_progress ---------------------------
CREATE OR REPLACE VIEW public.vw_student_degree_progress AS
SELECT
  sde.id                                                  AS enrollment_id,
  sde.user_id,
  COALESCE(sde.degree_id, sde.program_id)                 AS degree_id,
  dp.title                                                AS degree_title,
  sde.status                                              AS enrollment_status,
  (SELECT count(*) FROM public.degree_program_courses dpc
     WHERE dpc.degree_program_id = COALESCE(sde.degree_id, sde.program_id)
       AND COALESCE(dpc.is_required, true))               AS required_courses,
  (SELECT count(*) FROM public.degree_program_courses dpc
     WHERE dpc.degree_program_id = COALESCE(sde.degree_id, sde.program_id)
       AND COALESCE(dpc.is_required, true)
       AND EXISTS (
         SELECT 1 FROM public.student_course_completions scc
          WHERE scc.user_id = sde.user_id
            AND scc.course_id = dpc.course_id
            AND scc.passed))                              AS completed_required_courses,
  (SELECT COALESCE(SUM(credits_earned), 0)
     FROM public.student_course_completions
    WHERE user_id = sde.user_id AND passed)               AS credits_earned,
  public.evaluate_degree_completion(
    sde.user_id, COALESCE(sde.degree_id, sde.program_id)
  )                                                       AS issues
FROM public.student_degree_enrollments sde
LEFT JOIN public.degree_programs dp
  ON dp.id = COALESCE(sde.degree_id, sde.program_id);

COMMENT ON VIEW public.vw_student_degree_progress IS
  'D4.1c: per-student-degree-enrollment progress scorecard. required/completed required courses, credits earned, and the evaluate_degree_completion issue list.';

GRANT SELECT ON public.vw_student_degree_progress TO authenticated;
