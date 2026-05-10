
ALTER TABLE public.degree_programs
  ADD COLUMN IF NOT EXISTS accreditation_status text NOT NULL DEFAULT 'experimental',
  ADD COLUMN IF NOT EXISTS accreditation_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accreditation_checked_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.degree_programs
    ADD CONSTRAINT degree_programs_accreditation_status_check
    CHECK (accreditation_status IN ('accreditation_ready','needs_rework','experimental','internal_honorific'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.recompute_program_accreditation_status()
RETURNS TABLE(program_id uuid, title text, level text, old_status text, new_status text, course_count int, credits int, missing text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_course_count int;
  v_credits int;
  v_has_research bool;
  v_has_ethics bool;
  v_has_capstone bool;
  v_has_practicum bool;
  v_missing text[];
  v_new_status text;
  v_min_courses int;
  v_min_credits int;
  v_max_credits int;
  v_requires_capstone bool;
  v_requires_research bool;
  v_old_status text;
BEGIN
  FOR r IN SELECT dp.id, dp.title, dp.level, dp.total_credits, dp.accreditation_status
           FROM public.degree_programs dp WHERE dp.is_active = true LOOP

    SELECT COUNT(*)::int, COALESCE(SUM(c.credit_hours),0)::int
      INTO v_course_count, v_credits
    FROM public.degree_program_courses dpc
    JOIN public.courses c ON c.id = dpc.course_id
    WHERE dpc.degree_program_id = r.id;

    IF v_credits = 0 THEN v_credits := COALESCE(r.total_credits,0); END IF;

    SELECT
      bool_or(c.title ILIKE '%research method%' OR c.description ILIKE '%research method%'),
      bool_or(c.title ILIKE '%ethic%' OR c.description ILIKE '%ethic%'),
      bool_or(c.title ILIKE '%capstone%' OR c.title ILIKE '%thesis%' OR c.title ILIKE '%dissertation%'),
      bool_or(c.title ILIKE '%practicum%' OR c.title ILIKE '%internship%' OR c.title ILIKE '%field work%')
    INTO v_has_research, v_has_ethics, v_has_capstone, v_has_practicum
    FROM public.degree_program_courses dpc
    JOIN public.courses c ON c.id = dpc.course_id
    WHERE dpc.degree_program_id = r.id;

    v_has_research := COALESCE(v_has_research,false);
    v_has_ethics := COALESCE(v_has_ethics,false);
    v_has_capstone := COALESCE(v_has_capstone,false);
    v_has_practicum := COALESCE(v_has_practicum,false);

    v_missing := ARRAY[]::text[];
    v_requires_capstone := false;
    v_requires_research := false;

    CASE lower(r.level)
      WHEN 'exousia' THEN
        v_new_status := 'internal_honorific';
        v_min_courses := 0; v_min_credits := 0; v_max_credits := 9999;
      WHEN 'certificate' THEN
        v_min_courses := 4; v_min_credits := 9; v_max_credits := 18;
      WHEN 'diploma' THEN
        v_min_courses := 6; v_min_credits := 18; v_max_credits := 36;
      WHEN 'undergraduate' THEN
        v_min_courses := 30; v_min_credits := 120; v_max_credits := 9999;
        v_requires_capstone := true; v_requires_research := true;
      WHEN 'graduate' THEN
        v_min_courses := 8; v_min_credits := 30; v_max_credits := 60;
        v_requires_capstone := true; v_requires_research := true;
      WHEN 'doctoral' THEN
        v_min_courses := 6; v_min_credits := 30; v_max_credits := 9999;
        v_requires_capstone := true; v_requires_research := true;
      ELSE
        v_min_courses := 0; v_min_credits := 0; v_max_credits := 9999;
    END CASE;

    IF lower(r.level) <> 'exousia' THEN
      IF v_course_count < v_min_courses THEN
        v_missing := array_append(v_missing, format('course_count<%s', v_min_courses));
      END IF;
      IF v_credits < v_min_credits THEN
        v_missing := array_append(v_missing, format('credits<%s', v_min_credits));
      END IF;
      IF v_max_credits < 9999 AND v_credits > v_max_credits THEN
        v_missing := array_append(v_missing, format('credits>%s', v_max_credits));
      END IF;
      IF NOT v_has_ethics THEN v_missing := array_append(v_missing, 'ethics'); END IF;
      IF v_requires_research AND NOT v_has_research THEN v_missing := array_append(v_missing, 'research_methods'); END IF;
      IF v_requires_capstone AND NOT v_has_capstone THEN v_missing := array_append(v_missing, 'capstone_or_thesis'); END IF;

      IF array_length(v_missing,1) IS NULL THEN
        v_new_status := 'accreditation_ready';
      ELSIF v_course_count = 0 OR v_credits = 0 THEN
        v_new_status := 'experimental';
      ELSE
        v_new_status := 'needs_rework';
      END IF;
    END IF;

    v_old_status := r.accreditation_status;

    UPDATE public.degree_programs SET
      accreditation_status = v_new_status,
      accreditation_metrics = jsonb_build_object(
        'course_count', v_course_count,
        'credits', v_credits,
        'min_courses', v_min_courses,
        'min_credits', v_min_credits,
        'max_credits', v_max_credits,
        'has_research_methods', v_has_research,
        'has_ethics', v_has_ethics,
        'has_capstone_or_thesis', v_has_capstone,
        'has_practicum', v_has_practicum,
        'missing', to_jsonb(v_missing)
      ),
      accreditation_checked_at = now()
    WHERE id = r.id;

    program_id := r.id; title := r.title; level := r.level;
    old_status := v_old_status; new_status := v_new_status;
    course_count := v_course_count; credits := v_credits; missing := v_missing;
    RETURN NEXT;
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.accreditation_baseline_report AS
SELECT
  dp.id, dp.title, dp.level, dp.faculty,
  dp.accreditation_status, dp.accreditation_metrics, dp.accreditation_checked_at
FROM public.degree_programs dp
WHERE dp.is_active = true;

SELECT public.recompute_program_accreditation_status();
