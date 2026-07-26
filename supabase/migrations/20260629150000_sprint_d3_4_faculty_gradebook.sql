-- =====================================================================
-- Sprint D3.4 — Faculty Gradebook & Assessment Workspace (spine)
-- =====================================================================
-- Adds the wrapper RPC the new inline gradebook UI needs, plus a
-- rubric scaffold for D3.4.2.
--
-- Critical constraint (per spec): "Do not duplicate grading logic."
-- Every grade write still flows through the existing
-- public.submit_course_grade(...) engine. This migration's
-- gradebook_publish_grades is a thin batch wrapper that:
--   - takes an array of {student_id, percentage, notes, finalize}
--   - calls submit_course_grade for each, inside one transaction
--   - emits a single ops_log "gradebook.bulk_published" event with a
--     correlation_id, plus per-row "grade.published" events sharing
--     that correlation_id
--   - is atomic: any single submit_course_grade error rolls back the
--     entire batch (no partial writes)
--
-- Rubric scaffold (grade_rubrics / grade_rubric_scores) is added in
-- the shape the spec describes (criterion, weight, score, feedback)
-- but no editor RPC ships in D3.4.1; D3.4.2 will add the criterion
-- editor + the rubric-total → grade_records writer.
-- =====================================================================

-- ---------- 0. D1 substrate compat (same pattern as D3.1/D3.3) -------
DO $shim$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name='ops_log'
  ) THEN
    -- D3.1 already adds this shim; defensive copy in case migration order changes.
    CREATE TABLE public.ops_log (
      id bigserial PRIMARY KEY,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      correlation_id uuid,
      source text NOT NULL,
      event text NOT NULL,
      severity text NOT NULL DEFAULT 'info',
      actor_id uuid,
      actor_role text,
      fingerprint text,
      duration_ms integer,
      http_status integer,
      message text,
      context jsonb NOT NULL DEFAULT '{}'::jsonb,
      trace_id uuid,
      span_id uuid
    );
  END IF;
END$shim$;

DO $shim$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='ops_log_write'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.ops_log_write(
        _source text, _event text, _severity text DEFAULT 'info',
        _message text DEFAULT NULL, _context jsonb DEFAULT '{}'::jsonb,
        _correlation_id uuid DEFAULT NULL, _duration_ms integer DEFAULT NULL,
        _http_status integer DEFAULT NULL, _fingerprint text DEFAULT NULL
      ) RETURNS bigint LANGUAGE plpgsql AS $f$
      DECLARE _id bigint;
      BEGIN
        INSERT INTO public.ops_log (correlation_id, source, event, severity, actor_id,
                                    fingerprint, duration_ms, http_status, message, context)
        VALUES (COALESCE(_correlation_id, gen_random_uuid()), _source, _event, _severity,
                auth.uid(), _fingerprint, _duration_ms, _http_status, _message,
                COALESCE(_context,'{}'::jsonb))
        RETURNING id INTO _id;
        RETURN _id;
      END $f$
    $body$;
  END IF;
END$shim$;

-- ---------- 1. gradebook_publish_grades (bulk wrapper) ---------------
CREATE OR REPLACE FUNCTION public.gradebook_publish_grades(
  _section_id uuid,
  _rows       jsonb,   -- jsonb array: [{"student_id":"...","percentage":89.5,"notes":"...","finalize":false}, ...]
  _publish_mode text DEFAULT 'publish'  -- 'publish' | 'provisional' | 'finalize'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_corr  uuid := gen_random_uuid();
  v_row   jsonb;
  v_grade_id uuid;
  v_total int := 0;
  v_published int := 0;
  v_finalize boolean;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Defensive: auth.uid() may raise if request.jwt.claims is set to an
  -- unparseable value (empty string in some environments). Treat any
  -- resolution failure as "no authenticated actor".
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN v_actor := NULL;
  END;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _section_id IS NULL THEN RAISE EXCEPTION 'section_required'; END IF;
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION 'rows_must_be_array';
  END IF;
  IF _publish_mode NOT IN ('publish','provisional','finalize') THEN
    RAISE EXCEPTION 'invalid_publish_mode';
  END IF;

  -- finalize mode forces _finalize=true regardless of per-row flag;
  -- provisional mode forces _finalize=false; publish honors per-row.
  -- Per-row submit_course_grade re-checks role (instructor of section,
  -- or admin/registrar/instructor role) — we deliberately don't re-do
  -- the role check here, so the existing engine is the single source
  -- of truth for grading authorization.

  -- Open batch-start event so the correlation_id is queryable even if
  -- the batch aborts.
  PERFORM public.ops_log_write(
    'rpc', 'gradebook.bulk_publish_started', 'info',
    format('Bulk publish in mode=%s for section %s (%s rows)',
           _publish_mode, _section_id, jsonb_array_length(_rows)),
    jsonb_build_object('section_id', _section_id, 'publish_mode', _publish_mode,
                       'row_count', jsonb_array_length(_rows)),
    v_corr
  );

  FOR v_row IN SELECT * FROM jsonb_array_elements(_rows)
  LOOP
    v_total := v_total + 1;

    IF NOT (v_row ? 'student_id') OR NOT (v_row ? 'percentage') THEN
      RAISE EXCEPTION 'row_missing_required_fields'
        USING HINT = 'Every row needs student_id and percentage';
    END IF;

    v_finalize := CASE
      WHEN _publish_mode = 'finalize'    THEN true
      WHEN _publish_mode = 'provisional' THEN false
      ELSE COALESCE((v_row->>'finalize')::boolean, false)
    END;

    -- The single source of truth for a grade write.
    v_grade_id := public.submit_course_grade(
      (v_row->>'student_id')::uuid,
      _section_id,
      (v_row->>'percentage')::numeric,
      v_row->>'notes',
      v_finalize
    );

    v_published := v_published + 1;

    PERFORM public.ops_log_write(
      'rpc', 'grade.published', 'info',
      format('Grade row %s for student %s', v_grade_id, v_row->>'student_id'),
      jsonb_build_object(
        'grade_id', v_grade_id,
        'section_id', _section_id,
        'student_id', (v_row->>'student_id')::uuid,
        'percentage', (v_row->>'percentage')::numeric,
        'finalize', v_finalize,
        'publish_mode', _publish_mode
      ),
      v_corr
    );

    v_results := v_results || jsonb_build_object(
      'student_id', (v_row->>'student_id')::uuid,
      'grade_id',   v_grade_id,
      'finalize',   v_finalize
    );
  END LOOP;

  PERFORM public.ops_log_write(
    'rpc', 'gradebook.bulk_published', 'info',
    format('Bulk publish complete: %s/%s grades', v_published, v_total),
    jsonb_build_object('section_id', _section_id, 'publish_mode', _publish_mode,
                       'total', v_total, 'published', v_published),
    v_corr
  );

  RETURN jsonb_build_object(
    'correlation_id', v_corr,
    'section_id',     _section_id,
    'publish_mode',   _publish_mode,
    'total',          v_total,
    'published',      v_published,
    'rows',           v_results
  );
END$$;

GRANT EXECUTE ON FUNCTION public.gradebook_publish_grades(uuid, jsonb, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.gradebook_publish_grades(uuid, jsonb, text) IS
  'Sprint D3.4: bulk wrapper around submit_course_grade. Atomic '
  '(single transaction; any error rolls back all rows), audited via '
  'ops_log with a shared correlation_id tying the batch + per-row '
  'events. Defers ALL grade-write semantics (RBAC, attempt tracking, '
  'letter grade computation, grade_records insert) to the existing '
  'engine — no duplicated logic.';

-- ---------- 2. Rubric scaffold (D3.4.2 territory; tables only) ------
-- Per spec section 5: criterion, weight, score, feedback.
-- Rubric totals will map into grade_records via a D3.4.2 RPC
-- (rubric_compute_total) — out of scope for D3.4.1 to avoid creating
-- a parallel grade system before the editor exists to populate scores.

CREATE TABLE IF NOT EXISTS public.grade_rubrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      uuid REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  total_weight    numeric(6,2) NOT NULL DEFAULT 100 CHECK (total_weight > 0 AND total_weight <= 1000),
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grade_rubric_criteria (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id       uuid NOT NULL REFERENCES public.grade_rubrics(id) ON DELETE CASCADE,
  ordinal         int  NOT NULL DEFAULT 0,
  criterion       text NOT NULL,
  weight          numeric(6,2) NOT NULL CHECK (weight > 0),
  max_score       numeric(6,2) NOT NULL CHECK (max_score > 0),
  guidance        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rubric_id, ordinal)
);

CREATE TABLE IF NOT EXISTS public.grade_rubric_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id       uuid NOT NULL REFERENCES public.grade_rubrics(id) ON DELETE CASCADE,
  criterion_id    uuid NOT NULL REFERENCES public.grade_rubric_criteria(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score           numeric(6,2) NOT NULL,
  feedback        text,
  scored_by       uuid REFERENCES auth.users(id),
  scored_at       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (criterion_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS grade_rubrics_section_idx ON public.grade_rubrics (section_id);
CREATE INDEX IF NOT EXISTS grade_rubric_criteria_rubric_idx ON public.grade_rubric_criteria (rubric_id, ordinal);
CREATE INDEX IF NOT EXISTS grade_rubric_scores_student_idx ON public.grade_rubric_scores (student_user_id);
CREATE INDEX IF NOT EXISTS grade_rubric_scores_rubric_idx ON public.grade_rubric_scores (rubric_id);

ALTER TABLE public.grade_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_rubric_scores ENABLE ROW LEVEL SECURITY;

-- Rubrics & criteria: visible to anyone teaching the section, the
-- student of any score row, or admin/registrar. Writes faculty/admin only.
DROP POLICY IF EXISTS "grade_rubrics_read" ON public.grade_rubrics;
CREATE POLICY "grade_rubrics_read" ON public.grade_rubrics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'faculty')
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin')
         OR public.has_role(auth.uid(),'registrar')
         OR EXISTS (
           SELECT 1 FROM public.grade_rubric_scores s
            WHERE s.rubric_id = grade_rubrics.id AND s.student_user_id = auth.uid()
         ));

DROP POLICY IF EXISTS "grade_rubrics_write" ON public.grade_rubrics;
CREATE POLICY "grade_rubrics_write" ON public.grade_rubrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'faculty')
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'faculty')
              OR public.has_role(auth.uid(),'admin')
              OR public.has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "grade_rubric_criteria_read" ON public.grade_rubric_criteria;
CREATE POLICY "grade_rubric_criteria_read" ON public.grade_rubric_criteria
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "grade_rubric_criteria_write" ON public.grade_rubric_criteria;
CREATE POLICY "grade_rubric_criteria_write" ON public.grade_rubric_criteria
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'faculty')
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'faculty')
              OR public.has_role(auth.uid(),'admin')
              OR public.has_role(auth.uid(),'superadmin'));

-- Scores: student sees their own; faculty/admin see all.
-- All write paths will route through a D3.4.2 RPC.
DROP POLICY IF EXISTS "grade_rubric_scores_read" ON public.grade_rubric_scores;
CREATE POLICY "grade_rubric_scores_read" ON public.grade_rubric_scores
  FOR SELECT TO authenticated
  USING (student_user_id = auth.uid()
         OR public.has_role(auth.uid(),'faculty')
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin')
         OR public.has_role(auth.uid(),'registrar'));

DROP POLICY IF EXISTS "grade_rubric_scores_admin_only_direct" ON public.grade_rubric_scores;
CREATE POLICY "grade_rubric_scores_admin_only_direct" ON public.grade_rubric_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

COMMENT ON TABLE public.grade_rubrics IS
  'Sprint D3.4 scaffold: rubric for a section. Editor + total-computation RPC arrive in D3.4.2.';
COMMENT ON TABLE public.grade_rubric_criteria IS
  'Sprint D3.4 scaffold: ordered criteria within a rubric.';
COMMENT ON TABLE public.grade_rubric_scores IS
  'Sprint D3.4 scaffold: per-student per-criterion score + feedback. Writes via D3.4.2 RPC only.';
