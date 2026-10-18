-- P0 2026-10-18: close anonymous/cross-student GPA, standing and transcript RPC leaks.
-- Captured from existing Lovable Cloud via read-only pg_get_functiondef.
-- The original function bodies are preserved; only an early, NULL-safe caller
-- authorization guard is added to each. No table data or triggers are changed.
-- Do not execute in production before staging parity and explicit approval.

DO $preflight$
BEGIN
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'canonical identity-role authority prerequisite missing';
  END IF;
END
$preflight$;

-- Runtime-preserved function: compute_student_gpa(uuid,uuid)
CREATE OR REPLACE FUNCTION public.compute_student_gpa(_student_id uuid, _term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Caller-scoped GPA visibility; never expose another student's grades.
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR (
       auth.uid() IS DISTINCT FROM _student_id
       AND NOT (
         COALESCE(public.has_role(auth.uid(),'faculty'::public.app_role),false)
         OR COALESCE(public.has_role(auth.uid(),'registrar'::public.app_role),false)
         OR COALESCE(public.has_role(auth.uid(),'admin'::public.app_role),false)
         OR COALESCE(public.has_role(auth.uid(),'superadmin'::public.app_role),false)
       )
     )) THEN
    RAISE EXCEPTION 'gpa_access_forbidden' USING ERRCODE='42501';
  END IF;

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
END $function$;

-- Runtime-preserved function: evaluate_academic_standing(uuid,uuid)
CREATE OR REPLACE FUNCTION public.evaluate_academic_standing(_student_id uuid, _term_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stats jsonb; v_term_gpa numeric; v_cum_gpa numeric; v_term_credits_earn numeric;
  v_standing text; v_dean boolean := false; v_honors text := NULL; v_prev text;
BEGIN

  -- Academic standing changes are institutional actions, not self-service.
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT (
       COALESCE(public.has_role(auth.uid(),'faculty'::public.app_role),false)
       OR COALESCE(public.has_role(auth.uid(),'registrar'::public.app_role),false)
       OR COALESCE(public.has_role(auth.uid(),'admin'::public.app_role),false)
       OR COALESCE(public.has_role(auth.uid(),'superadmin'::public.app_role),false)
     ) THEN
    RAISE EXCEPTION 'academic_standing_forbidden' USING ERRCODE='42501';
  END IF;

  v_stats := public.compute_student_gpa(_student_id, _term_id);
  v_term_gpa := (v_stats->>'term_gpa')::numeric;
  v_cum_gpa  := (v_stats->>'cumulative_gpa')::numeric;
  v_term_credits_earn := (v_stats->>'term_credits_earned')::numeric;

  v_standing := CASE
    WHEN v_cum_gpa >= 2.0 THEN 'good'
    WHEN v_cum_gpa >= 1.7 THEN 'warning'
    WHEN v_cum_gpa >= 1.0 THEN 'probation'
    ELSE 'suspension'
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
END $function$;

-- Runtime-preserved function: generate_transcript(uuid)
CREATE OR REPLACE FUNCTION public.generate_transcript(_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_terms jsonb;
  v_cum jsonb;
BEGIN

  -- NULL-safe caller identity check, including anonymous requests.
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR (
       auth.uid() IS DISTINCT FROM _student_id
       AND NOT (
         COALESCE(public.has_role(auth.uid(),'registrar'::public.app_role),false)
         OR COALESCE(public.has_role(auth.uid(),'admin'::public.app_role),false)
         OR COALESCE(public.has_role(auth.uid(),'superadmin'::public.app_role),false)
       )
     )) THEN
    RAISE EXCEPTION 'transcript_access_forbidden' USING ERRCODE='42501';
  END IF;

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
END $function$;

-- Anonymous callers have no legitimate reason to execute these RPCs.
REVOKE ALL ON FUNCTION public.compute_student_gpa(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.evaluate_academic_standing(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.generate_transcript(uuid) FROM PUBLIC,anon;
-- Authenticated students can calculate their own GPA and transcripts; staff
-- authorization is enforced by the hardened function body.
GRANT EXECUTE ON FUNCTION public.compute_student_gpa(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.generate_transcript(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_academic_standing(uuid,uuid) TO service_role;
