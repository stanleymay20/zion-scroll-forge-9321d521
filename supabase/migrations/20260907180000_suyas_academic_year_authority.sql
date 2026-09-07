-- ============================================================================
-- SUYAS academic-year authority
-- Canonicalizes academic_years -> academic_terms as the operational calendar.
-- Preserves legacy semesters as historical compatibility only.
-- ============================================================================

-- 1) Every canonical academic term belongs to a SUYAS academic year.
ALTER TABLE public.academic_terms
  ADD COLUMN IF NOT EXISTS academic_year_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.academic_terms'::regclass
       AND conname = 'academic_terms_academic_year_id_fkey'
  ) THEN
    ALTER TABLE public.academic_terms
      ADD CONSTRAINT academic_terms_academic_year_id_fkey
      FOREIGN KEY (academic_year_id)
      REFERENCES public.academic_years(id)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- Explicit CI replays this migration after the historical bootstrap. Temporarily
-- remove our own guards so normalization remains idempotent on replay.
DROP TRIGGER IF EXISTS trg_suyas_academic_year_state_authority ON public.academic_years;
DROP TRIGGER IF EXISTS trg_suyas_academic_term_year_integrity ON public.academic_terms;

-- Keep the historical date aliases coherent before deriving cycles.
UPDATE public.academic_terms
   SET starts_on = COALESCE(starts_on, start_date),
       ends_on   = COALESCE(ends_on, end_date),
       start_date = COALESCE(start_date, starts_on),
       end_date   = COALESCE(end_date, ends_on)
 WHERE starts_on IS NULL OR ends_on IS NULL OR start_date IS NULL OR end_date IS NULL;

-- Generate missing academic-year envelopes from the canonical term calendar.
-- ScrollUniversity convention: Fall begins the cycle; Spring/Summer stay in it.
WITH term_bounds AS (
  SELECT
    CASE
      WHEN EXTRACT(MONTH FROM COALESCE(starts_on, start_date)) >= 8
        THEN EXTRACT(YEAR FROM COALESCE(starts_on, start_date))::int
      ELSE EXTRACT(YEAR FROM COALESCE(starts_on, start_date))::int - 1
    END AS cycle_year,
    MIN(COALESCE(starts_on, start_date)) AS min_start,
    MAX(COALESCE(ends_on, end_date)) AS max_end
  FROM public.academic_terms
  WHERE COALESCE(starts_on, start_date) IS NOT NULL
    AND COALESCE(ends_on, end_date) IS NOT NULL
  GROUP BY 1
), institution_seed AS (
  SELECT institution_id
    FROM public.academic_years
   WHERE institution_id IS NOT NULL
   ORDER BY created_at NULLS LAST
   LIMIT 1
)
INSERT INTO public.academic_years (
  institution_id, name, start_date, end_date, is_active, year_type, status
)
SELECT
  (SELECT institution_id FROM institution_seed),
  format('%s-%s Academic Year', tb.cycle_year, tb.cycle_year + 1),
  tb.min_start,
  tb.max_end,
  false,
  'semester',
  CASE
    WHEN tb.max_end < current_date THEN 'archived'
    WHEN current_date BETWEEN tb.min_start AND tb.max_end THEN 'published'
    ELSE 'draft'
  END
FROM term_bounds tb
WHERE NOT EXISTS (
  SELECT 1
    FROM public.academic_years ay
   WHERE ay.name = format('%s-%s Academic Year', tb.cycle_year, tb.cycle_year + 1)
      OR (tb.min_start >= ay.start_date AND tb.max_end <= ay.end_date)
);

-- If a generated-name year already existed, let the canonical term envelope define
-- its date bounds so every child term can be validated deterministically.
WITH term_bounds AS (
  SELECT
    CASE
      WHEN EXTRACT(MONTH FROM COALESCE(starts_on, start_date)) >= 8
        THEN EXTRACT(YEAR FROM COALESCE(starts_on, start_date))::int
      ELSE EXTRACT(YEAR FROM COALESCE(starts_on, start_date))::int - 1
    END AS cycle_year,
    MIN(COALESCE(starts_on, start_date)) AS min_start,
    MAX(COALESCE(ends_on, end_date)) AS max_end
  FROM public.academic_terms
  WHERE COALESCE(starts_on, start_date) IS NOT NULL
    AND COALESCE(ends_on, end_date) IS NOT NULL
  GROUP BY 1
)
UPDATE public.academic_years ay
   SET start_date = tb.min_start,
       end_date = tb.max_end,
       updated_at = now()
  FROM term_bounds tb
 WHERE ay.name = format('%s-%s Academic Year', tb.cycle_year, tb.cycle_year + 1)
   AND (ay.start_date IS DISTINCT FROM tb.min_start OR ay.end_date IS DISTINCT FROM tb.max_end);

-- Backfill each canonical term to the smallest academic-year envelope containing it.
UPDATE public.academic_terms t
   SET academic_year_id = (
         SELECT ay.id
           FROM public.academic_years ay
          WHERE COALESCE(t.starts_on, t.start_date) >= ay.start_date
            AND COALESCE(t.ends_on, t.end_date) <= ay.end_date
          ORDER BY (ay.end_date - ay.start_date) ASC, ay.start_date DESC
          LIMIT 1
       ),
       updated_at = now()
 WHERE t.academic_year_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.academic_terms WHERE academic_year_id IS NULL) THEN
    RAISE EXCEPTION 'SUYAS authority migration cannot continue: canonical academic_terms remain without academic_year_id';
  END IF;
END$$;

ALTER TABLE public.academic_terms
  ALTER COLUMN academic_year_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS academic_terms_academic_year_idx
  ON public.academic_terms(academic_year_id, starts_on, ends_on);

-- 2) Normalize stale lifecycle state once, before reinstalling state guards.
UPDATE public.academic_years
   SET is_active = false,
       status = CASE
         WHEN end_date < current_date THEN 'archived'
         WHEN current_date BETWEEN start_date AND end_date THEN 'published'
         ELSE COALESCE(NULLIF(status, ''), 'draft')
       END,
       updated_at = now();

UPDATE public.academic_years
   SET is_active = true,
       status = 'published',
       updated_at = now()
 WHERE id = (
   SELECT id
     FROM public.academic_years
    WHERE current_date BETWEEN start_date AND end_date
    ORDER BY start_date DESC
    LIMIT 1
 );

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_single_active_idx
  ON public.academic_years ((is_active))
  WHERE is_active IS TRUE;

-- A term whose dates are past cannot remain the active teaching term.
UPDATE public.academic_terms
   SET is_active = false,
       status = 'archived',
       updated_at = now()
 WHERE COALESCE(ends_on, end_date) < current_date
   AND (COALESCE(is_active, false) OR status::text IN ('planned','open','in_session','closed'));

UPDATE public.academic_terms
   SET is_active = true,
       status = 'in_session',
       updated_at = now()
 WHERE current_date BETWEEN COALESCE(starts_on, start_date) AND COALESCE(ends_on, end_date)
   AND academic_year_id = (
     SELECT id FROM public.academic_years WHERE is_active IS TRUE LIMIT 1
   );

-- 3) Parent/child date + lifecycle integrity.
CREATE OR REPLACE FUNCTION public.tg_suyas_academic_term_year_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year public.academic_years%ROWTYPE;
  v_start date := COALESCE(NEW.starts_on, NEW.start_date);
  v_end date := COALESCE(NEW.ends_on, NEW.end_date);
BEGIN
  IF NEW.academic_year_id IS NULL THEN
    RAISE EXCEPTION 'suyas_academic_year_required';
  END IF;
  IF v_start IS NULL OR v_end IS NULL THEN
    RAISE EXCEPTION 'suyas_term_dates_required';
  END IF;

  SELECT * INTO v_year
    FROM public.academic_years
   WHERE id = NEW.academic_year_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'suyas_academic_year_not_found';
  END IF;

  IF v_start < v_year.start_date OR v_end > v_year.end_date THEN
    RAISE EXCEPTION 'suyas_term_outside_academic_year';
  END IF;

  IF NEW.status::text IN ('open','in_session') AND v_year.status <> 'published' THEN
    RAISE EXCEPTION 'suyas_operational_term_requires_published_year';
  END IF;

  IF v_year.status = 'archived' AND NEW.status::text NOT IN ('closed','archived') THEN
    RAISE EXCEPTION 'suyas_archived_year_terms_are_read_only';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_suyas_academic_term_year_integrity
BEFORE INSERT OR UPDATE OF academic_year_id, starts_on, ends_on, start_date, end_date, status
ON public.academic_terms
FOR EACH ROW EXECUTE FUNCTION public.tg_suyas_academic_term_year_integrity();

-- Direct clients may edit year metadata, but lifecycle state is RPC-owned.
CREATE OR REPLACE FUNCTION public.tg_suyas_academic_year_state_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_internal boolean := COALESCE(current_setting('app.suyas_year_internal', true), '') = 'on';
BEGIN
  IF v_internal THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_active, false) OR COALESCE(NEW.status, 'draft') <> 'draft' THEN
      RAISE EXCEPTION 'suyas_year_state_rpc_only';
    END IF;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'suyas_year_state_rpc_only';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_suyas_academic_year_state_authority
BEFORE INSERT OR UPDATE OF is_active, status
ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.tg_suyas_academic_year_state_authority();

-- 4) Authoritative year lifecycle RPCs now validate canonical academic_terms.
CREATE OR REPLACE FUNCTION public.publish_academic_year(p_year_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_year public.academic_years%ROWTYPE;
  v_term_count int;
  v_required_terms int;
  v_prior_flag text := COALESCE(current_setting('app.suyas_year_internal', true), '');
BEGIN
  IF NOT (
    public.has_role(v_actor,'admin')
    OR public.has_role(v_actor,'superadmin')
    OR public.has_role(v_actor,'registrar')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_year FROM public.academic_years WHERE id = p_year_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'academic_year_not_found'; END IF;
  IF v_year.status <> 'draft' THEN
    RAISE EXCEPTION 'academic_year_publish_requires_draft';
  END IF;
  IF v_year.end_date < v_year.start_date THEN
    RAISE EXCEPTION 'academic_year_dates_invalid';
  END IF;

  SELECT count(*) INTO v_term_count
    FROM public.academic_terms
   WHERE academic_year_id = p_year_id;

  v_required_terms := CASE v_year.year_type
    WHEN 'quarter' THEN 4
    WHEN 'trimester' THEN 3
    ELSE 2
  END;

  IF v_term_count < v_required_terms THEN
    RAISE EXCEPTION 'academic_year_insufficient_terms: required %, found %', v_required_terms, v_term_count;
  END IF;

  PERFORM set_config('app.suyas_year_internal', 'on', true);
  UPDATE public.academic_years SET is_active = false WHERE is_active IS TRUE AND id <> p_year_id;
  UPDATE public.academic_years
     SET status = 'published', is_active = true, updated_at = now()
   WHERE id = p_year_id;
  PERFORM set_config('app.suyas_year_internal', v_prior_flag, true);

  PERFORM public.ops_log_write(
    'suyas', 'academic_year.published', 'info',
    format('Published SUYAS academic year %s', p_year_id),
    jsonb_build_object('academic_year_id', p_year_id, 'term_count', v_term_count)
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.suyas_year_internal', v_prior_flag, true);
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_academic_year(p_year_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_year public.academic_years%ROWTYPE;
  v_prior_flag text := COALESCE(current_setting('app.suyas_year_internal', true), '');
BEGIN
  IF NOT (
    public.has_role(v_actor,'admin')
    OR public.has_role(v_actor,'superadmin')
    OR public.has_role(v_actor,'registrar')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_year FROM public.academic_years WHERE id = p_year_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'academic_year_not_found'; END IF;
  IF v_year.status = 'archived' THEN RAISE EXCEPTION 'academic_year_already_archived'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.academic_terms
     WHERE academic_year_id = p_year_id
       AND status::text IN ('open','in_session')
  ) THEN
    RAISE EXCEPTION 'academic_year_has_operational_terms';
  END IF;

  PERFORM set_config('app.suyas_year_internal', 'on', true);
  UPDATE public.academic_years
     SET status = 'archived', is_active = false, updated_at = now()
   WHERE id = p_year_id;
  PERFORM set_config('app.suyas_year_internal', v_prior_flag, true);

  PERFORM public.ops_log_write(
    'suyas', 'academic_year.archived', 'info',
    format('Archived SUYAS academic year %s', p_year_id),
    jsonb_build_object('academic_year_id', p_year_id)
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.suyas_year_internal', v_prior_flag, true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_academic_year(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_academic_year(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_academic_year(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_academic_year(uuid) TO authenticated, service_role;

-- 5) Shared truth predicate for operational teaching surfaces.
CREATE OR REPLACE FUNCTION public.suyas_term_is_governed(p_term_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.academic_terms t
      JOIN public.academic_years y ON y.id = t.academic_year_id
     WHERE t.id = p_term_id
       AND y.status = 'published'
       AND t.status::text NOT IN ('closed','archived')
  );
$$;

REVOKE ALL ON FUNCTION public.suyas_term_is_governed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suyas_term_is_governed(uuid) TO authenticated, service_role;

-- 6) Published assessments must be section -> term -> academic-year scoped.
CREATE OR REPLACE FUNCTION public.tg_suyas_assignment_publication_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_id uuid;
  v_requires_check boolean := false;
BEGIN
  IF COALESCE(NEW.published, false) THEN
    v_requires_check := TG_OP = 'INSERT';
    IF TG_OP = 'UPDATE' THEN
      v_requires_check := OLD.published IS DISTINCT FROM NEW.published
                       OR OLD.section_id IS DISTINCT FROM NEW.section_id;
    END IF;
  END IF;

  -- Legacy published course-level templates remain readable/editable, but a new
  -- publication transition cannot create another unscoped operational deadline.
  IF NOT v_requires_check THEN RETURN NEW; END IF;

  IF NEW.section_id IS NULL THEN
    RAISE EXCEPTION 'suyas_published_assignment_requires_section';
  END IF;

  SELECT term_id INTO v_term_id
    FROM public.course_sections
   WHERE id = NEW.section_id;
  IF v_term_id IS NULL THEN
    RAISE EXCEPTION 'suyas_published_assignment_requires_term';
  END IF;
  IF NOT public.suyas_term_is_governed(v_term_id) THEN
    RAISE EXCEPTION 'suyas_published_assignment_requires_governed_year';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.assignments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_suyas_assignment_publication_scope ON public.assignments;
    CREATE TRIGGER trg_suyas_assignment_publication_scope
      BEFORE INSERT OR UPDATE OF published, section_id
      ON public.assignments
      FOR EACH ROW EXECUTE FUNCTION public.tg_suyas_assignment_publication_scope();
  END IF;
END$$;

-- 7) Retire app-facing free-text rollover. Historical functions remain only so
-- old audit/regression history is reproducible; application/backend roles cannot call them.
DO $$
BEGIN
  IF to_regprocedure('public.clone_section_for_term(uuid,text,jsonb,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.clone_section_for_term(uuid,text,jsonb,uuid)
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;
  IF to_regprocedure('public.rollover_term(text,text,boolean)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rollover_term(text,text,boolean)
      FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.clone_section_for_suyas_term(
  p_source_section_id uuid,
  p_target_term_id uuid,
  p_overrides jsonb DEFAULT '{}'::jsonb,
  p_correlation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_source public.course_sections%ROWTYPE;
  v_target public.academic_terms%ROWTYPE;
  v_year_status text;
  v_new_id uuid;
  v_corr uuid := COALESCE(p_correlation_id, gen_random_uuid());
  v_operational boolean;
BEGIN
  IF NOT (
    public.has_role(v_actor,'admin')
    OR public.has_role(v_actor,'superadmin')
    OR public.has_role(v_actor,'registrar')
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;

  PERFORM public.assert_not_maintenance();

  SELECT * INTO v_source FROM public.course_sections WHERE id = p_source_section_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_section_not_found'; END IF;

  SELECT t.*
    INTO v_target
    FROM public.academic_terms t
    JOIN public.academic_years y ON y.id = t.academic_year_id
   WHERE t.id = p_target_term_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_suyas_term_not_found'; END IF;

  SELECT y.status
    INTO v_year_status
    FROM public.academic_years y
   WHERE y.id = v_target.academic_year_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_suyas_academic_year_not_found'; END IF;

  IF v_target.status::text IN ('closed','archived') OR v_year_status = 'archived' THEN
    RAISE EXCEPTION 'target_suyas_term_not_schedulable';
  END IF;

  v_operational := v_year_status = 'published' AND v_target.status::text IN ('open','in_session');

  INSERT INTO public.course_sections (
    term_label, term_id, course_id, program_id,
    course_code, course_title, section_code, instructor_user_id,
    seat_capacity, waitlist_capacity, meeting_info, credit_hours,
    active, delivery_mode, room, campus, section_status,
    meets_days, meets_start, meets_end, recommended_year, instructor_label
  )
  VALUES (
    COALESCE(v_target.code, v_target.name), v_target.id, v_source.course_id, v_source.program_id,
    v_source.course_code, v_source.course_title, v_source.section_code,
    COALESCE((p_overrides->>'instructor_user_id')::uuid, v_source.instructor_user_id),
    COALESCE((p_overrides->>'seat_capacity')::int, v_source.seat_capacity),
    COALESCE((p_overrides->>'waitlist_capacity')::int, v_source.waitlist_capacity),
    COALESCE(p_overrides->>'meeting_info', v_source.meeting_info),
    COALESCE((p_overrides->>'credit_hours')::numeric, v_source.credit_hours),
    CASE WHEN v_operational THEN COALESCE((p_overrides->>'active')::boolean, v_source.active) ELSE false END,
    COALESCE(p_overrides->>'delivery_mode', v_source.delivery_mode),
    COALESCE(p_overrides->>'room', v_source.room),
    COALESCE(p_overrides->>'campus', v_source.campus),
    CASE WHEN v_operational THEN COALESCE(p_overrides->>'section_status', v_source.section_status) ELSE 'scheduled' END,
    COALESCE(p_overrides->>'meets_days', v_source.meets_days),
    COALESCE((p_overrides->>'meets_start')::time, v_source.meets_start),
    COALESCE((p_overrides->>'meets_end')::time, v_source.meets_end),
    COALESCE((p_overrides->>'recommended_year')::int, v_source.recommended_year),
    COALESCE(p_overrides->>'instructor_label', v_source.instructor_label)
  )
  RETURNING id INTO v_new_id;

  PERFORM public.ops_log_write(
    'suyas', 'section.cloned_to_governed_term', 'info',
    format('Cloned section %s into SUYAS term %s', p_source_section_id, p_target_term_id),
    jsonb_build_object(
      'source_section_id', p_source_section_id,
      'new_section_id', v_new_id,
      'target_term_id', p_target_term_id,
      'academic_year_id', v_target.academic_year_id,
      'operational', v_operational
    ),
    v_corr
  );

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollover_suyas_term(
  p_source_term_id uuid,
  p_target_term_id uuid,
  p_only_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_corr uuid := gen_random_uuid();
  v_source_term public.academic_terms%ROWTYPE;
  v_target_term public.academic_terms%ROWTYPE;
  v_row public.course_sections%ROWTYPE;
  v_total int := 0;
  v_cloned int := 0;
  v_skipped int := 0;
BEGIN
  IF NOT (
    public.has_role(v_actor,'admin')
    OR public.has_role(v_actor,'superadmin')
    OR public.has_role(v_actor,'registrar')
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;

  PERFORM public.assert_not_maintenance();
  IF p_source_term_id = p_target_term_id THEN RAISE EXCEPTION 'same_term'; END IF;

  SELECT * INTO v_source_term FROM public.academic_terms WHERE id = p_source_term_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source_suyas_term_not_found'; END IF;
  SELECT * INTO v_target_term FROM public.academic_terms WHERE id = p_target_term_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'target_suyas_term_not_found'; END IF;

  FOR v_row IN
    SELECT * FROM public.course_sections
     WHERE term_id = p_source_term_id
       AND (NOT p_only_active OR active IS TRUE)
  LOOP
    v_total := v_total + 1;
    IF EXISTS (
      SELECT 1 FROM public.course_sections
       WHERE term_id = p_target_term_id
         AND course_code = v_row.course_code
         AND section_code = v_row.section_code
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    PERFORM public.clone_section_for_suyas_term(v_row.id, p_target_term_id, '{}'::jsonb, v_corr);
    v_cloned := v_cloned + 1;
  END LOOP;

  PERFORM public.ops_log_write(
    'suyas', 'term.rolled_over', 'info',
    format('SUYAS rollover %s -> %s', p_source_term_id, p_target_term_id),
    jsonb_build_object(
      'source_term_id', p_source_term_id,
      'target_term_id', p_target_term_id,
      'total', v_total,
      'cloned', v_cloned,
      'skipped_existing', v_skipped
    ),
    v_corr
  );

  RETURN jsonb_build_object(
    'correlation_id', v_corr,
    'source_term_id', p_source_term_id,
    'target_term_id', p_target_term_id,
    'total', v_total,
    'cloned', v_cloned,
    'skipped_existing', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clone_section_for_suyas_term(uuid,uuid,jsonb,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollover_suyas_term(uuid,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_section_for_suyas_term(uuid,uuid,jsonb,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rollover_suyas_term(uuid,uuid,boolean) TO authenticated, service_role;

COMMENT ON COLUMN public.academic_terms.academic_year_id IS
  'Canonical SUYAS parent academic year. Operational terms must never exist outside an academic year.';
COMMENT ON FUNCTION public.rollover_suyas_term(uuid,uuid,boolean) IS
  'Authoritative SUYAS section rollover using canonical academic term IDs. Replaces app-facing free-text rollover.';
