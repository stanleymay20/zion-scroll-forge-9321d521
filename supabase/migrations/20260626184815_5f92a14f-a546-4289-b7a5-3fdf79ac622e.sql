
-- ============================================================================
-- Phase C Stabilization: Fix cohort simulation blockers
-- 1. generate_degree_plan must populate term_label (NOT NULL)
-- 2. Drop obsolete compute_student_gpa(uuid) overload causing ambiguity
-- 3. Migrate check_credential_eligibility to canonical overload
-- ============================================================================

-- ── BLOCKER 1: term_label NOT NULL in degree_plan_items ────────────────────
CREATE OR REPLACE FUNCTION public.generate_degree_plan(_student_id uuid, _program_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id uuid;
  v_title text;
BEGIN
  SELECT 'Degree Plan: ' || title INTO v_title FROM public.degree_programs WHERE id=_program_id;

  INSERT INTO public.degree_plans(student_user_id, degree_program_id, title, status)
  VALUES (_student_id, _program_id, COALESCE(v_title,'Degree Plan'), 'draft')
  ON CONFLICT (student_user_id, degree_program_id) DO UPDATE
    SET title = EXCLUDED.title, updated_at = now()
  RETURNING id INTO v_plan_id;

  INSERT INTO public.degree_plan_items(
    plan_id, student_id, degree_program_id, course_id,
    course_code, course_title, credit_hours,
    requirement_type, required, sequence,
    recommended_year, recommended_term, status,
    term_label
  )
  SELECT
    v_plan_id, _student_id, _program_id, c.id,
    c.id::text, c.title, COALESCE(c.credit_hours,3),
    CASE WHEN dpc.is_required THEN 'core' ELSE 'elective' END,
    COALESCE(dpc.is_required, true),
    dpc.sequence_order,
    dpc.recommended_year, dpc.recommended_term,
    'planned',
    COALESCE(
      NULLIF(trim(
        CASE WHEN dpc.recommended_year IS NOT NULL THEN 'Year ' || dpc.recommended_year::text ELSE '' END
        || CASE WHEN dpc.recommended_term IS NOT NULL THEN ' ' || dpc.recommended_term ELSE '' END
      ), ''),
      'Unassigned'
    )
  FROM public.degree_program_courses dpc
  JOIN public.courses c ON c.id = dpc.course_id
  WHERE dpc.degree_program_id = _program_id
    AND NOT EXISTS (
      SELECT 1 FROM public.degree_plan_items dpi
      WHERE dpi.plan_id = v_plan_id AND dpi.course_id = c.id
    );

  INSERT INTO public.degree_audit_log(event_type, student_id, degree_program_id, plan_id, actor_id, payload)
  VALUES ('plan_generated', _student_id, _program_id, v_plan_id, auth.uid(),
          jsonb_build_object('items_count', (SELECT count(*) FROM public.degree_plan_items WHERE plan_id=v_plan_id)));

  RETURN v_plan_id;
END $$;

-- ── BLOCKER 2: drop obsolete compute_student_gpa(uuid) overload ────────────
-- Two overloads existed:
--   public.compute_student_gpa(uuid)                        RETURNS TABLE (legacy, 2026-05)
--   public.compute_student_gpa(uuid, uuid DEFAULT NULL)     RETURNS jsonb (canonical, 2026-06)
-- A one-arg call matches both because of the DEFAULT, so PG raises
-- "function compute_student_gpa(uuid) is not unique". Drop the legacy one.

-- Update the only legacy caller first to use the canonical jsonb overload
CREATE OR REPLACE FUNCTION public.check_credential_eligibility(
  p_student_id uuid,
  p_kind public.issued_credential_kind
)
RETURNS TABLE (eligible boolean, reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_stats jsonb;
  v_final_credits numeric;
  v_gpa numeric;
BEGIN
  v_stats := public.compute_student_gpa(p_student_id, NULL);
  v_final_credits := COALESCE((v_stats->>'total_credit_hours')::numeric, 0);
  v_gpa := NULLIF(v_stats->>'gpa','')::numeric;

  IF p_kind IN ('bachelor','master','doctorate','supreme') AND v_final_credits < 30 THEN
    RETURN QUERY SELECT false, 'Insufficient finalized credit hours for this credential tier';
    RETURN;
  END IF;
  IF p_kind IN ('master','doctorate','supreme') AND (v_gpa IS NULL OR v_gpa < 3.0) THEN
    RETURN QUERY SELECT false, 'GPA threshold not met for graduate-tier credential';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Eligibility checks passed';
END $$;

-- Now drop the legacy overload (only the single-arg TABLE-returning version)
DROP FUNCTION IF EXISTS public.compute_student_gpa(uuid);
