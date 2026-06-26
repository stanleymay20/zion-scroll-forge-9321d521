
-- Phase D: Academic Records Engine

-- 1. Extend grade_records with operational columns
ALTER TABLE public.grade_records
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.course_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assessment_id uuid,
  ADD COLUMN IF NOT EXISTS percentage numeric(6,3),
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS graded_by uuid,
  ADD COLUMN IF NOT EXISTS graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_grade_records_student_term ON public.grade_records(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_grade_records_section ON public.grade_records(section_id);
CREATE INDEX IF NOT EXISTS idx_grade_records_course ON public.grade_records(course_id);

-- 2. Academic records audit log
CREATE TABLE IF NOT EXISTS public.academic_records_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  student_id uuid,
  term_id uuid,
  course_id uuid,
  section_id uuid,
  grade_record_id uuid,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.academic_records_audit TO authenticated;
GRANT ALL ON public.academic_records_audit TO service_role;
ALTER TABLE public.academic_records_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit"
  ON public.academic_records_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR student_id = auth.uid());
CREATE POLICY "System insert audit"
  ON public.academic_records_audit FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_records_audit_student ON public.academic_records_audit(student_id, created_at DESC);

-- 3. Helper: percentage -> letter + grade points (4.0 scale)
CREATE OR REPLACE FUNCTION public.compute_letter_grade(_pct numeric)
RETURNS TABLE(letter text, grade_points numeric)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT
    CASE
      WHEN _pct IS NULL THEN 'I'
      WHEN _pct >= 93 THEN 'A'
      WHEN _pct >= 90 THEN 'A-'
      WHEN _pct >= 87 THEN 'B+'
      WHEN _pct >= 83 THEN 'B'
      WHEN _pct >= 80 THEN 'B-'
      WHEN _pct >= 77 THEN 'C+'
      WHEN _pct >= 73 THEN 'C'
      WHEN _pct >= 70 THEN 'C-'
      WHEN _pct >= 67 THEN 'D+'
      WHEN _pct >= 63 THEN 'D'
      WHEN _pct >= 60 THEN 'D-'
      ELSE 'F'
    END,
    CASE
      WHEN _pct IS NULL THEN 0
      WHEN _pct >= 93 THEN 4.0
      WHEN _pct >= 90 THEN 3.7
      WHEN _pct >= 87 THEN 3.3
      WHEN _pct >= 83 THEN 3.0
      WHEN _pct >= 80 THEN 2.7
      WHEN _pct >= 77 THEN 2.3
      WHEN _pct >= 73 THEN 2.0
      WHEN _pct >= 70 THEN 1.7
      WHEN _pct >= 67 THEN 1.3
      WHEN _pct >= 63 THEN 1.0
      WHEN _pct >= 60 THEN 0.7
      ELSE 0
    END;
$$;

-- 4. submit_course_grade RPC (instructor/registrar/admin)
CREATE OR REPLACE FUNCTION public.submit_course_grade(
  _student_id uuid,
  _section_id uuid,
  _percentage numeric,
  _notes text DEFAULT NULL,
  _finalize boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_id uuid;
  v_term_id uuid;
  v_credits numeric;
  v_letter text;
  v_points numeric;
  v_grade_id uuid;
  v_attempt int;
  v_is_instructor boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT cs.course_id, cs.term_id, COALESCE(c.credit_hours, 3)
    INTO v_course_id, v_term_id, v_credits
  FROM public.course_sections cs
  LEFT JOIN public.courses c ON c.id = cs.course_id
  WHERE cs.id = _section_id;

  IF v_course_id IS NULL THEN RAISE EXCEPTION 'section_not_found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.faculty_teaching_assignments fta
    WHERE fta.faculty_id = auth.uid()
      AND (fta.section_id = _section_id OR fta.course_id = v_course_id)
  ) INTO v_is_instructor;

  IF NOT (v_is_instructor
       OR public.has_role(auth.uid(),'admin')
       OR public.has_role(auth.uid(),'registrar')
       OR public.has_role(auth.uid(),'instructor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT letter, grade_points INTO v_letter, v_points
  FROM public.compute_letter_grade(_percentage);

  SELECT COALESCE(MAX(attempt_number),0)+1 INTO v_attempt
  FROM public.grade_records
  WHERE student_id=_student_id AND course_id=v_course_id;

  INSERT INTO public.grade_records(
    student_id, course_id, section_id, term_id,
    credit_hours, percentage, letter_grade, grade_points,
    status, attempt_number, graded_by, graded_at, posted_by, posted_at,
    is_final, finalized_at, notes, source
  ) VALUES (
    _student_id, v_course_id, _section_id, v_term_id,
    v_credits, _percentage, v_letter, v_points,
    CASE WHEN _finalize THEN 'final'::grade_status ELSE 'posted'::grade_status END,
    v_attempt, auth.uid(), now(), auth.uid(), now(),
    _finalize, CASE WHEN _finalize THEN now() END, _notes, 'manual'
  ) RETURNING id INTO v_grade_id;

  INSERT INTO public.academic_records_audit(event_type, student_id, term_id, course_id, section_id, grade_record_id, actor_id, payload)
  VALUES ('grade_submitted', _student_id, v_term_id, v_course_id, _section_id, v_grade_id, auth.uid(),
          jsonb_build_object('percentage',_percentage,'letter',v_letter,'finalized',_finalize));

  PERFORM public.compute_student_gpa(_student_id, v_term_id);
  PERFORM public.evaluate_academic_standing(_student_id, v_term_id);

  RETURN v_grade_id;
END $$;

-- 5. compute_student_gpa
CREATE OR REPLACE FUNCTION public.compute_student_gpa(_student_id uuid, _term_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_term_gpa numeric := 0;
  v_cum_gpa numeric := 0;
  v_term_credits_att numeric := 0;
  v_term_credits_earn numeric := 0;
  v_cum_credits_att numeric := 0;
  v_cum_credits_earn numeric := 0;
  v_failed numeric := 0;
  v_withdrawals int := 0;
  v_incomplete int := 0;
BEGIN
  -- Cumulative (best attempt per course)
  WITH best AS (
    SELECT DISTINCT ON (course_id) course_id, credit_hours, grade_points, letter_grade, term_id
    FROM public.grade_records
    WHERE student_id=_student_id AND letter_grade IS NOT NULL AND letter_grade NOT IN ('W','I')
    ORDER BY course_id, grade_points DESC NULLS LAST, graded_at DESC
  )
  SELECT
    COALESCE(SUM(grade_points*credit_hours)/NULLIF(SUM(credit_hours),0),0),
    COALESCE(SUM(credit_hours),0),
    COALESCE(SUM(CASE WHEN letter_grade <> 'F' THEN credit_hours ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN letter_grade = 'F' THEN credit_hours ELSE 0 END),0)
  INTO v_cum_gpa, v_cum_credits_att, v_cum_credits_earn, v_failed
  FROM best;

  IF _term_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(grade_points*credit_hours)/NULLIF(SUM(credit_hours),0),0),
      COALESCE(SUM(credit_hours),0),
      COALESCE(SUM(CASE WHEN letter_grade NOT IN ('F','W','I') THEN credit_hours ELSE 0 END),0),
      COUNT(*) FILTER (WHERE letter_grade='W'),
      COUNT(*) FILTER (WHERE letter_grade='I')
    INTO v_term_gpa, v_term_credits_att, v_term_credits_earn, v_withdrawals, v_incomplete
    FROM public.grade_records
    WHERE student_id=_student_id AND term_id=_term_id AND letter_grade IS NOT NULL;
  END IF;

  INSERT INTO public.academic_records_audit(event_type, student_id, term_id, actor_id, payload)
  VALUES ('gpa_recalculated', _student_id, _term_id, auth.uid(),
          jsonb_build_object('term_gpa',v_term_gpa,'cum_gpa',v_cum_gpa,
                             'term_credits_earned',v_term_credits_earn,
                             'cum_credits_earned',v_cum_credits_earn));

  RETURN jsonb_build_object(
    'term_gpa', v_term_gpa,
    'cumulative_gpa', v_cum_gpa,
    'term_credits_attempted', v_term_credits_att,
    'term_credits_earned', v_term_credits_earn,
    'cumulative_credits_attempted', v_cum_credits_att,
    'cumulative_credits_earned', v_cum_credits_earn,
    'failed_credits', v_failed,
    'withdrawals', v_withdrawals,
    'incomplete', v_incomplete
  );
END $$;

-- 6. evaluate_academic_standing
CREATE OR REPLACE FUNCTION public.evaluate_academic_standing(_student_id uuid, _term_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_stats jsonb;
  v_term_gpa numeric;
  v_cum_gpa numeric;
  v_term_credits_earn numeric;
  v_standing text;
  v_dean boolean := false;
  v_honors text := NULL;
  v_prev text;
BEGIN
  v_stats := public.compute_student_gpa(_student_id, _term_id);
  v_term_gpa := (v_stats->>'term_gpa')::numeric;
  v_cum_gpa  := (v_stats->>'cumulative_gpa')::numeric;
  v_term_credits_earn := (v_stats->>'term_credits_earned')::numeric;

  v_standing := CASE
    WHEN v_cum_gpa >= 2.0 THEN 'good_standing'
    WHEN v_cum_gpa >= 1.7 THEN 'academic_warning'
    WHEN v_cum_gpa >= 1.0 THEN 'academic_probation'
    ELSE 'academic_suspension'
  END;

  IF v_term_gpa >= 3.7 AND v_term_credits_earn >= 12 THEN v_dean := true; END IF;
  IF v_cum_gpa >= 3.9 THEN v_honors := 'summa_cum_laude';
  ELSIF v_cum_gpa >= 3.7 THEN v_honors := 'magna_cum_laude';
  ELSIF v_cum_gpa >= 3.5 THEN v_honors := 'cum_laude';
  END IF;

  SELECT standing INTO v_prev FROM public.student_academic_standing
   WHERE user_id=_student_id AND term_id=_term_id;

  INSERT INTO public.student_academic_standing(
    user_id, term_id, gpa, cumulative_gpa,
    credits_earned, credits_attempted, standing, dean_list, honors,
    last_calculated_at, computed_inputs, computed_by
  ) VALUES (
    _student_id, _term_id, v_term_gpa, v_cum_gpa,
    v_term_credits_earn::int, ((v_stats->>'term_credits_attempted')::numeric)::int,
    v_standing, v_dean, v_honors, now(), v_stats, auth.uid()
  )
  ON CONFLICT (user_id, term_id) DO UPDATE SET
    gpa=EXCLUDED.gpa, cumulative_gpa=EXCLUDED.cumulative_gpa,
    credits_earned=EXCLUDED.credits_earned, credits_attempted=EXCLUDED.credits_attempted,
    standing=EXCLUDED.standing, dean_list=EXCLUDED.dean_list, honors=EXCLUDED.honors,
    last_calculated_at=now(), computed_inputs=EXCLUDED.computed_inputs, updated_at=now();

  IF v_prev IS DISTINCT FROM v_standing THEN
    INSERT INTO public.academic_standing_audit(user_id, term_id, previous_standing, new_standing, inputs_snapshot, triggered_by)
    VALUES (_student_id, _term_id, v_prev, v_standing, v_stats, auth.uid());
    INSERT INTO public.academic_records_audit(event_type, student_id, term_id, actor_id, payload)
    VALUES ('standing_updated', _student_id, _term_id, auth.uid(),
            jsonb_build_object('previous',v_prev,'new',v_standing,'dean_list',v_dean,'honors',v_honors));
  END IF;

  RETURN v_standing;
END $$;

-- 6b. unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_standing_user_term
  ON public.student_academic_standing(user_id, term_id);

-- 7. evaluate_progression
CREATE OR REPLACE FUNCTION public.evaluate_progression(_student_id uuid, _term_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_standing text;
  v_cum_gpa numeric;
  v_failed numeric;
  v_decision text;
BEGIN
  SELECT standing, cumulative_gpa INTO v_standing, v_cum_gpa
  FROM public.student_academic_standing
  WHERE user_id=_student_id AND term_id=_term_id;

  SELECT COALESCE(SUM(credit_hours),0) INTO v_failed
  FROM public.grade_records
  WHERE student_id=_student_id AND term_id=_term_id AND letter_grade='F';

  v_decision := CASE
    WHEN v_standing = 'academic_suspension' THEN 'suspended'
    WHEN v_standing = 'academic_probation' OR v_failed > 6 THEN 'conditional'
    WHEN v_cum_gpa >= 2.0 THEN 'eligible'
    ELSE 'repeat_term'
  END;

  INSERT INTO public.academic_records_audit(event_type, student_id, term_id, actor_id, payload)
  VALUES ('progression_decision', _student_id, _term_id, auth.uid(),
          jsonb_build_object('decision',v_decision,'cum_gpa',v_cum_gpa,'failed_credits',v_failed,'standing',v_standing));

  RETURN jsonb_build_object('decision',v_decision,'cum_gpa',v_cum_gpa,'failed_credits',v_failed,'standing',v_standing);
END $$;

-- 8. generate_transcript
CREATE OR REPLACE FUNCTION public.generate_transcript(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_terms jsonb;
  v_cum jsonb;
BEGIN
  IF auth.uid() <> _student_id
     AND NOT public.has_role(auth.uid(),'admin')
     AND NOT public.has_role(auth.uid(),'registrar') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_agg(t ORDER BY t->>'starts_on') INTO v_terms
  FROM (
    SELECT jsonb_build_object(
      'term_id', at.id,
      'term_name', at.name,
      'starts_on', at.starts_on,
      'standing', sas.standing,
      'term_gpa', sas.gpa,
      'cumulative_gpa', sas.cumulative_gpa,
      'dean_list', sas.dean_list,
      'honors', sas.honors,
      'courses', (
        SELECT jsonb_agg(jsonb_build_object(
          'course_id', gr.course_id,
          'course_title', c.title,
          'credit_hours', gr.credit_hours,
          'percentage', gr.percentage,
          'letter_grade', gr.letter_grade,
          'grade_points', gr.grade_points,
          'status', gr.status,
          'attempt', gr.attempt_number,
          'graded_at', gr.graded_at
        ) ORDER BY c.title)
        FROM public.grade_records gr
        LEFT JOIN public.courses c ON c.id=gr.course_id
        WHERE gr.student_id=_student_id AND gr.term_id=at.id
      )
    ) AS t
    FROM public.academic_terms at
    LEFT JOIN public.student_academic_standing sas
      ON sas.term_id=at.id AND sas.user_id=_student_id
    WHERE EXISTS (SELECT 1 FROM public.grade_records gr WHERE gr.student_id=_student_id AND gr.term_id=at.id)
  ) sub;

  v_cum := public.compute_student_gpa(_student_id, NULL);

  INSERT INTO public.academic_records_audit(event_type, student_id, actor_id, payload)
  VALUES ('transcript_generated', _student_id, auth.uid(), jsonb_build_object('terms_count', COALESCE(jsonb_array_length(v_terms),0)));

  RETURN jsonb_build_object(
    'student_id', _student_id,
    'generated_at', now(),
    'cumulative', v_cum,
    'terms', COALESCE(v_terms,'[]'::jsonb)
  );
END $$;

-- 9. Trigger: auto post grade from assessment_attempts when finalized
CREATE OR REPLACE FUNCTION public.trg_assessment_to_grade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pct numeric;
  v_section_id uuid;
  v_course_id uuid;
  v_term_id uuid;
  v_credits numeric;
  v_letter text;
  v_points numeric;
  v_attempt int;
BEGIN
  IF NEW.status NOT IN ('graded','submitted') OR NEW.score IS NULL OR NEW.max_score IS NULL OR NEW.max_score = 0 THEN
    RETURN NEW;
  END IF;
  IF (OLD IS NOT NULL AND OLD.status = NEW.status AND OLD.score = NEW.score) THEN
    RETURN NEW;
  END IF;

  v_pct := (NEW.score / NEW.max_score) * 100;

  SELECT a.section_id, a.course_id INTO v_section_id, v_course_id
  FROM public.assignments a WHERE a.id = NEW.assignment_id;

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  SELECT cs.term_id, COALESCE(c.credit_hours, 3) INTO v_term_id, v_credits
  FROM public.courses c
  LEFT JOIN public.course_sections cs ON cs.id = v_section_id
  WHERE c.id = v_course_id;

  SELECT letter, grade_points INTO v_letter, v_points FROM public.compute_letter_grade(v_pct);

  SELECT COALESCE(MAX(attempt_number),0)+1 INTO v_attempt
  FROM public.grade_records WHERE student_id=NEW.user_id AND course_id=v_course_id AND assessment_id=NEW.assignment_id;

  INSERT INTO public.grade_records(
    student_id, course_id, section_id, term_id, assessment_id,
    credit_hours, percentage, letter_grade, grade_points,
    status, attempt_number, graded_by, graded_at, posted_by, posted_at, source
  ) VALUES (
    NEW.user_id, v_course_id, v_section_id, v_term_id, NEW.assignment_id,
    v_credits, v_pct, v_letter, v_points,
    'posted'::grade_status, v_attempt, NEW.graded_by, COALESCE(NEW.graded_at, now()), NEW.graded_by, now(), 'assessment'
  );

  INSERT INTO public.academic_records_audit(event_type, student_id, term_id, course_id, section_id, actor_id, payload)
  VALUES ('grade_auto_posted', NEW.user_id, v_term_id, v_course_id, v_section_id, NEW.graded_by,
          jsonb_build_object('assessment_id',NEW.assignment_id,'percentage',v_pct,'letter',v_letter));

  IF v_term_id IS NOT NULL THEN
    PERFORM public.evaluate_academic_standing(NEW.user_id, v_term_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS assessment_attempts_to_grade ON public.assessment_attempts;
CREATE TRIGGER assessment_attempts_to_grade
AFTER INSERT OR UPDATE ON public.assessment_attempts
FOR EACH ROW EXECUTE FUNCTION public.trg_assessment_to_grade();

-- 10. assignments table optional columns we reference
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS section_id uuid,
  ADD COLUMN IF NOT EXISTS course_id uuid;

-- 11. Immutability: prevent edits to finalized grade_records (except admins)
CREATE OR REPLACE FUNCTION public.guard_grade_record_immutability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_final AND NOT public.has_role(auth.uid(),'admin') AND NOT public.has_role(auth.uid(),'registrar') THEN
    RAISE EXCEPTION 'grade_record_finalized_immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS grade_record_immutable ON public.grade_records;
CREATE TRIGGER grade_record_immutable
BEFORE UPDATE OR DELETE ON public.grade_records
FOR EACH ROW EXECUTE FUNCTION public.guard_grade_record_immutability();
