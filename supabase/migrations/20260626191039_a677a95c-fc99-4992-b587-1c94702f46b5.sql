
-- Align evaluate_academic_standing output with student_academic_standing.standing CHECK
-- Canonical values per CHECK: good, warning, probation, suspension, dismissed
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
