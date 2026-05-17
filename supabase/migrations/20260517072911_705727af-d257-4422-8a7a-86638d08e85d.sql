
-- ============================================================
-- PR3 Phase C — Assessment & Integrity (operational layer)
-- ============================================================

-- 1. assessment_question_pools -------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_question_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  draw_count int NOT NULL DEFAULT 5 CHECK (draw_count > 0),
  shuffle boolean NOT NULL DEFAULT true,
  time_limit_seconds int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id)
);
ALTER TABLE public.assessment_question_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aqp_staff_all" ON public.assessment_question_pools
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- 2. assessment_attempts -------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  attempt_no int NOT NULL DEFAULT 1,
  drawn_question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric(5,2),
  max_score numeric(5,2),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','submitted','graded','voided')),
  integrity_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by uuid REFERENCES public.profiles(id),
  time_limit_seconds int,
  UNIQUE (user_id, assignment_id, attempt_no)
);
CREATE INDEX IF NOT EXISTS idx_aa_user ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_aa_assign ON public.assessment_attempts(assignment_id);
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aa_student_select_own" ON public.assessment_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "aa_staff_select_all" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "aa_staff_update" ON public.assessment_attempts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- 3. assessment_audit_logs (immutable) -----------------------
CREATE TABLE IF NOT EXISTS public.assessment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL
    CHECK (event_type IN ('started','submitted','graded','flagged','voided','override','review')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aal_attempt ON public.assessment_audit_logs(attempt_id);
ALTER TABLE public.assessment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aal_student_select_own" ON public.assessment_audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts aa
    WHERE aa.id = attempt_id AND aa.user_id = auth.uid()
  ));
CREATE POLICY "aal_staff_select_all" ON public.assessment_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'registrar'));
-- no UPDATE / DELETE policies → immutable by RLS

-- 4. program_learning_outcomes -------------------------------
CREATE TABLE IF NOT EXISTS public.program_learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  code text NOT NULL,
  statement text NOT NULL,
  bloom_level text CHECK (bloom_level IN ('remember','understand','apply','analyze','evaluate','create')),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, code)
);
ALTER TABLE public.program_learning_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plo_public_select" ON public.program_learning_outcomes
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "plo_staff_write" ON public.program_learning_outcomes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- 5. learning_outcome_mappings -------------------------------
CREATE TABLE IF NOT EXISTS public.learning_outcome_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('module','course','assignment')),
  entity_id uuid NOT NULL,
  plo_id uuid NOT NULL REFERENCES public.program_learning_outcomes(id) ON DELETE CASCADE,
  weight numeric(4,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, plo_id)
);
CREATE INDEX IF NOT EXISTS idx_lom_entity ON public.learning_outcome_mappings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lom_plo ON public.learning_outcome_mappings(plo_id);
ALTER TABLE public.learning_outcome_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lom_public_select" ON public.learning_outcome_mappings
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "lom_staff_write" ON public.learning_outcome_mappings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- 6. faculty_curriculum_reviews -------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_curriculum_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','approved','changes_requested','rejected')),
  comments text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, reviewer_id)
);
ALTER TABLE public.faculty_curriculum_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcr_public_select" ON public.faculty_curriculum_reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fcr_staff_write" ON public.faculty_curriculum_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- ============================================================
-- Operational functions
-- ============================================================

-- start_assessment_attempt: draws questions, opens attempt, audits
CREATE OR REPLACE FUNCTION public.start_assessment_attempt(p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pool record;
  v_attempt_no int;
  v_drawn jsonb;
  v_attempt_id uuid;
  v_max numeric(5,2);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pool FROM public.assessment_question_pools
   WHERE assignment_id = p_assignment_id;

  IF v_pool.id IS NULL THEN
    RAISE EXCEPTION 'no question pool configured for assignment %', p_assignment_id;
  END IF;

  IF jsonb_array_length(COALESCE(v_pool.questions,'[]'::jsonb)) < v_pool.draw_count THEN
    RAISE EXCEPTION 'pool has fewer questions than draw_count';
  END IF;

  SELECT COALESCE(MAX(attempt_no),0) + 1 INTO v_attempt_no
  FROM public.assessment_attempts
  WHERE user_id = v_user AND assignment_id = p_assignment_id;

  -- Draw question ids (shuffle if enabled, then take draw_count)
  WITH q AS (
    SELECT (elem->>'id')::text AS qid
    FROM jsonb_array_elements(v_pool.questions) elem
  ),
  ordered AS (
    SELECT qid FROM q
    ORDER BY CASE WHEN v_pool.shuffle THEN random() ELSE 0 END
    LIMIT v_pool.draw_count
  )
  SELECT COALESCE(jsonb_agg(qid), '[]'::jsonb) INTO v_drawn FROM ordered;

  SELECT COALESCE(SUM((elem->>'points')::numeric), v_pool.draw_count::numeric)
    INTO v_max
  FROM jsonb_array_elements(v_pool.questions) elem
  WHERE (elem->>'id')::text = ANY (SELECT jsonb_array_elements_text(v_drawn));

  INSERT INTO public.assessment_attempts (
    user_id, assignment_id, attempt_no, drawn_question_ids,
    max_score, time_limit_seconds, status
  ) VALUES (
    v_user, p_assignment_id, v_attempt_no, v_drawn,
    v_max, v_pool.time_limit_seconds, 'in_progress'
  ) RETURNING id INTO v_attempt_id;

  INSERT INTO public.assessment_audit_logs (attempt_id, actor_id, event_type, payload)
  VALUES (v_attempt_id, v_user, 'started',
          jsonb_build_object('attempt_no', v_attempt_no, 'draw_count', v_pool.draw_count));

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'attempt_no', v_attempt_no,
    'drawn_question_ids', v_drawn,
    'max_score', v_max,
    'time_limit_seconds', v_pool.time_limit_seconds
  );
END;
$$;

-- submit_assessment_attempt: closes attempt, integrity flags, audit
CREATE OR REPLACE FUNCTION public.submit_assessment_attempt(
  p_attempt_id uuid,
  p_responses jsonb,
  p_score numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_attempt record;
  v_flags jsonb := '[]'::jsonb;
  v_drawn_count int;
  v_response_count int;
  v_elapsed int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_attempt FROM public.assessment_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'attempt not found';
  END IF;
  IF v_attempt.user_id <> v_user THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'attempt already %', v_attempt.status;
  END IF;

  v_drawn_count := jsonb_array_length(COALESCE(v_attempt.drawn_question_ids,'[]'::jsonb));
  v_response_count := (
    SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(p_responses,'{}'::jsonb))
  );
  v_elapsed := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::int;

  IF v_attempt.time_limit_seconds IS NOT NULL
     AND v_elapsed > v_attempt.time_limit_seconds + 30 THEN
    v_flags := v_flags || jsonb_build_array('over_time_limit');
  END IF;

  IF v_response_count < v_drawn_count THEN
    v_flags := v_flags || jsonb_build_array('missing_responses');
  END IF;
  IF v_response_count > v_drawn_count THEN
    v_flags := v_flags || jsonb_build_array('extra_responses');
  END IF;

  UPDATE public.assessment_attempts
    SET responses = COALESCE(p_responses, '{}'::jsonb),
        score = p_score,
        integrity_flags = v_flags,
        status = CASE WHEN p_score IS NOT NULL THEN 'graded' ELSE 'submitted' END,
        submitted_at = now(),
        graded_at = CASE WHEN p_score IS NOT NULL THEN now() ELSE NULL END
  WHERE id = p_attempt_id;

  INSERT INTO public.assessment_audit_logs (attempt_id, actor_id, event_type, payload)
  VALUES (p_attempt_id, v_user, 'submitted',
          jsonb_build_object('elapsed_seconds', v_elapsed,
                             'response_count', v_response_count,
                             'drawn_count', v_drawn_count,
                             'flags', v_flags,
                             'self_score', p_score));

  IF jsonb_array_length(v_flags) > 0 THEN
    INSERT INTO public.assessment_audit_logs (attempt_id, actor_id, event_type, payload)
    VALUES (p_attempt_id, v_user, 'flagged', jsonb_build_object('flags', v_flags));
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', CASE WHEN p_score IS NOT NULL THEN 'graded' ELSE 'submitted' END,
    'integrity_flags', v_flags,
    'elapsed_seconds', v_elapsed
  );
END;
$$;

-- record_faculty_review: upsert + audit a curriculum review state
CREATE OR REPLACE FUNCTION public.record_faculty_review(
  p_course_id uuid,
  p_state text,
  p_comments text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(v_user,'faculty') OR public.has_role(v_user,'admin')) THEN
    RAISE EXCEPTION 'faculty or admin role required';
  END IF;
  IF p_state NOT IN ('pending','approved','changes_requested','rejected') THEN
    RAISE EXCEPTION 'invalid review state: %', p_state;
  END IF;

  INSERT INTO public.faculty_curriculum_reviews (course_id, reviewer_id, state, comments, reviewed_at, updated_at)
  VALUES (p_course_id, v_user, p_state, p_comments,
          CASE WHEN p_state <> 'pending' THEN now() ELSE NULL END, now())
  ON CONFLICT (course_id, reviewer_id)
  DO UPDATE SET state = EXCLUDED.state,
                comments = EXCLUDED.comments,
                reviewed_at = EXCLUDED.reviewed_at,
                updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.log_quality_action(
    'faculty_curriculum_review',
    'course', p_course_id,
    NULL,
    jsonb_build_object('state', p_state, 'reviewer', v_user),
    p_comments
  );

  RETURN jsonb_build_object('id', v_id, 'state', p_state);
END;
$$;

-- transcript_with_attainment: credits + GPA + PLO attainment
CREATE OR REPLACE FUNCTION public.transcript_with_attainment(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_credits int := 0;
  v_gpa numeric := 0;
  v_attainment jsonb := '[]'::jsonb;
BEGIN
  -- Authorization: student themselves, or staff
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF v_user <> p_user_id
     AND NOT (public.has_role(v_user,'admin') OR public.has_role(v_user,'registrar') OR public.has_role(v_user,'faculty')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(credits_earned),0), COALESCE(AVG(grade_points),0)
    INTO v_credits, v_gpa
  FROM public.enrollment_records
  WHERE user_id = p_user_id AND status = 'completed';

  -- PLO attainment: average normalized score per PLO from graded attempts
  WITH graded AS (
    SELECT aa.assignment_id,
           CASE WHEN aa.max_score IS NOT NULL AND aa.max_score > 0
                THEN LEAST(1.0, aa.score / aa.max_score)
                ELSE NULL END AS norm_score
    FROM public.assessment_attempts aa
    WHERE aa.user_id = p_user_id AND aa.status = 'graded' AND aa.score IS NOT NULL
  ),
  mapped AS (
    SELECT lom.plo_id,
           AVG(g.norm_score) FILTER (WHERE g.norm_score IS NOT NULL) AS rate,
           COUNT(*) FILTER (WHERE g.norm_score IS NOT NULL) AS attempts
    FROM graded g
    JOIN public.learning_outcome_mappings lom
      ON lom.entity_type = 'assignment' AND lom.entity_id = g.assignment_id
    GROUP BY lom.plo_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'plo_id', m.plo_id,
           'code', plo.code,
           'statement', plo.statement,
           'attainment_rate', ROUND(m.rate::numeric, 3),
           'attempts', m.attempts,
           'attained', m.rate >= 0.7
         ) ORDER BY plo.display_order, plo.code), '[]'::jsonb)
    INTO v_attainment
  FROM mapped m
  JOIN public.program_learning_outcomes plo ON plo.id = m.plo_id;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'credits_completed', v_credits,
    'gpa', ROUND(v_gpa::numeric, 2),
    'plo_attainment', v_attainment,
    'generated_at', now()
  );
END;
$$;
