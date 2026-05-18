CREATE TABLE IF NOT EXISTS public.faculty_productivity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  faculty_user_id uuid NOT NULL,
  course_count integer NOT NULL DEFAULT 0,
  total_credit_hours numeric(6,2) NOT NULL DEFAULT 0,
  student_count integer NOT NULL DEFAULT 0,
  finalized_grade_count integer NOT NULL DEFAULT 0,
  mean_gpa numeric(4,2),
  median_gpa numeric(4,2),
  on_time_post_rate numeric(5,2),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  snapshot_by uuid,
  notes text,
  UNIQUE(term_id, faculty_user_id, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_fps_faculty ON public.faculty_productivity_snapshots(faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_fps_term ON public.faculty_productivity_snapshots(term_id);

ALTER TABLE public.faculty_productivity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faculty_read_own_productivity"
  ON public.faculty_productivity_snapshots FOR SELECT TO authenticated
  USING (faculty_user_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'superadmin')
         OR public.has_role(auth.uid(), 'registrar'));

CREATE POLICY "registrar_insert_productivity"
  ON public.faculty_productivity_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin')
              OR public.has_role(auth.uid(), 'superadmin')
              OR public.has_role(auth.uid(), 'registrar'));

CREATE OR REPLACE FUNCTION public.tg_fps_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'faculty_productivity_snapshots is append-only';
END;
$$;

DROP TRIGGER IF EXISTS tg_fps_no_update ON public.faculty_productivity_snapshots;
CREATE TRIGGER tg_fps_no_update BEFORE UPDATE ON public.faculty_productivity_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.tg_fps_immutable();

DROP TRIGGER IF EXISTS tg_fps_no_delete ON public.faculty_productivity_snapshots;
CREATE TRIGGER tg_fps_no_delete BEFORE DELETE ON public.faculty_productivity_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.tg_fps_immutable();

CREATE OR REPLACE FUNCTION public.compute_faculty_load(p_faculty uuid, p_term uuid)
RETURNS TABLE (
  course_count integer,
  total_credit_hours numeric,
  student_count integer,
  finalized_grade_count integer,
  mean_gpa numeric,
  median_gpa numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_term_label text;
BEGIN
  SELECT COALESCE(code, name) INTO v_term_label FROM public.academic_terms WHERE id = p_term;

  RETURN QUERY
  WITH assigned AS (
    SELECT fta.course_id
    FROM public.faculty_teaching_assignments fta
    WHERE fta.faculty_user_id = p_faculty
      AND fta.state = 'active'
      AND (fta.term_label = v_term_label OR fta.term_label IS NULL)
      AND fta.course_id IS NOT NULL
  ),
  course_meta AS (
    SELECT c.id, COALESCE(c.credit_hours, 3.0)::numeric AS ch
    FROM public.courses c WHERE c.id IN (SELECT course_id FROM assigned)
  ),
  grades AS (
    SELECT gr.grade_points
    FROM public.grade_records gr
    WHERE gr.term_id = p_term
      AND gr.course_id IN (SELECT course_id FROM assigned)
      AND gr.status = 'final'
      AND gr.grade_points IS NOT NULL
  )
  SELECT
    (SELECT count(*)::int FROM assigned),
    COALESCE((SELECT sum(ch) FROM course_meta), 0)::numeric,
    COALESCE((SELECT count(DISTINCT e.user_id)::int
              FROM public.enrollments e
              WHERE e.course_id IN (SELECT course_id FROM assigned)), 0),
    (SELECT count(*)::int FROM grades),
    (SELECT round(avg(grade_points)::numeric, 2) FROM grades),
    (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY grade_points))::numeric, 2) FROM grades);
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_faculty_term(p_faculty uuid, p_term uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_row record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'superadmin')
          OR public.has_role(auth.uid(), 'registrar')) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  SELECT * INTO v_row FROM public.compute_faculty_load(p_faculty, p_term);

  INSERT INTO public.faculty_productivity_snapshots(
    term_id, faculty_user_id, course_count, total_credit_hours,
    student_count, finalized_grade_count, mean_gpa, median_gpa, snapshot_by
  ) VALUES (
    p_term, p_faculty,
    COALESCE(v_row.course_count,0),
    COALESCE(v_row.total_credit_hours,0),
    COALESCE(v_row.student_count,0),
    COALESCE(v_row.finalized_grade_count,0),
    CASE WHEN COALESCE(v_row.finalized_grade_count,0) >= 5 THEN v_row.mean_gpa END,
    CASE WHEN COALESCE(v_row.finalized_grade_count,0) >= 5 THEN v_row.median_gpa END,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_all_faculty_for_term(p_term uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_term_label text;
  v_count integer := 0;
  v_f uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'superadmin')
          OR public.has_role(auth.uid(), 'registrar')) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  SELECT COALESCE(code, name) INTO v_term_label FROM public.academic_terms WHERE id = p_term;

  FOR v_f IN
    SELECT DISTINCT faculty_user_id
    FROM public.faculty_teaching_assignments
    WHERE state = 'active' AND (term_label = v_term_label OR term_label IS NULL)
  LOOP
    PERFORM public.snapshot_faculty_term(v_f, p_term);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;