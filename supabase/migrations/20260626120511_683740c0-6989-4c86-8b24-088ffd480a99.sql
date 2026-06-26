
-- Prerequisite enforcement: RPC + audit table

CREATE TABLE IF NOT EXISTS public.prerequisite_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  eligible boolean NOT NULL,
  missing_prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_page text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.prerequisite_check_logs TO authenticated;
GRANT ALL ON public.prerequisite_check_logs TO service_role;

ALTER TABLE public.prerequisite_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own prereq check logs"
ON public.prerequisite_check_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students read own prereq check logs"
ON public.prerequisite_check_logs FOR SELECT TO authenticated
USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX IF NOT EXISTS idx_prereq_check_logs_student_course
  ON public.prerequisite_check_logs(student_id, course_id, checked_at DESC);

-- RPC: check_prerequisites(student_id, course_id) -> jsonb
CREATE OR REPLACE FUNCTION public.check_prerequisites(
  p_student_id uuid,
  p_course_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prereqs jsonb;
  v_completed jsonb := '[]'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_item jsonb;
  v_prereq_id uuid;
  v_prereq_title text;
  v_is_complete boolean;
  v_total_modules integer;
  v_completed_modules integer;
BEGIN
  IF p_student_id IS NULL OR p_course_id IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'missing_prerequisites', '[]'::jsonb,
      'completed_prerequisites', '[]'::jsonb,
      'message', 'Invalid student or course identifier.'
    );
  END IF;

  SELECT COALESCE(prerequisite_courses, '[]'::jsonb)
    INTO v_prereqs
  FROM public.courses
  WHERE id = p_course_id;

  IF v_prereqs IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'missing_prerequisites', '[]'::jsonb,
      'completed_prerequisites', '[]'::jsonb,
      'message', 'Course not found.'
    );
  END IF;

  IF jsonb_array_length(v_prereqs) = 0 THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'missing_prerequisites', '[]'::jsonb,
      'completed_prerequisites', '[]'::jsonb,
      'message', 'No prerequisites required.'
    );
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_prereqs)
  LOOP
    -- Support both {"course_id": "..."} and bare uuid string entries
    v_prereq_id := NULL;
    BEGIN
      IF jsonb_typeof(v_item) = 'string' THEN
        v_prereq_id := (v_item #>> '{}')::uuid;
      ELSE
        v_prereq_id := NULLIF(v_item->>'course_id','')::uuid;
      END IF;
    EXCEPTION WHEN others THEN
      v_prereq_id := NULL;
    END;

    IF v_prereq_id IS NULL THEN
      CONTINUE; -- skip malformed entries
    END IF;

    -- Resolve title (prefer payload title; fall back to DB)
    v_prereq_title := COALESCE(NULLIF(v_item->>'title',''), '');
    IF v_prereq_title = '' THEN
      SELECT title INTO v_prereq_title FROM public.courses WHERE id = v_prereq_id;
    END IF;

    -- Completion signal: course_certificates row OR 100% module completion
    v_is_complete := FALSE;

    IF EXISTS (
      SELECT 1 FROM public.course_certificates
       WHERE course_id = v_prereq_id AND user_id = p_student_id
    ) THEN
      v_is_complete := TRUE;
    ELSE
      SELECT COUNT(*) INTO v_total_modules
        FROM public.course_modules WHERE course_id = v_prereq_id;

      IF v_total_modules > 0 THEN
        SELECT COUNT(DISTINCT mc.module_id) INTO v_completed_modules
          FROM public.module_completions mc
          JOIN public.course_modules m ON m.id = mc.module_id
         WHERE m.course_id = v_prereq_id AND mc.user_id = p_student_id;

        IF v_completed_modules >= v_total_modules THEN
          v_is_complete := TRUE;
        END IF;
      END IF;
    END IF;

    IF v_is_complete THEN
      v_completed := v_completed || jsonb_build_array(jsonb_build_object(
        'course_id', v_prereq_id,
        'title', v_prereq_title
      ));
    ELSE
      v_missing := v_missing || jsonb_build_array(jsonb_build_object(
        'course_id', v_prereq_id,
        'title', v_prereq_title
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'eligible', jsonb_array_length(v_missing) = 0,
    'missing_prerequisites', v_missing,
    'completed_prerequisites', v_completed,
    'message', CASE
      WHEN jsonb_array_length(v_missing) = 0
        THEN 'All prerequisites satisfied.'
      ELSE 'You must complete the following prerequisite course(s) before starting this course.'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_prerequisites(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_prerequisites(uuid, uuid) TO authenticated, service_role;
