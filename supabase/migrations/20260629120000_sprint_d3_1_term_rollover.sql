-- =====================================================================
-- Sprint D3.1 — Term Rollover RPCs
-- =====================================================================
-- Adds two SECURITY DEFINER RPCs that the Registrar / Admin uses to
-- propagate `course_sections` from one academic term to the next:
--
--   clone_section_for_term(p_source_section_id uuid,
--                          p_target_term_label text,
--                          p_overrides jsonb DEFAULT '{}')
--      → uuid (new section id)
--
--   rollover_term(p_source_term_label text,
--                 p_target_term_label text,
--                 p_only_active boolean DEFAULT true)
--      → jsonb {correlation_id, source_term, target_term, total, cloned,
--               skipped_existing, only_active}
--
-- Contract guarantees:
--   1. Atomic: both RPCs run inside the caller's transaction. Any error
--      raises and rolls back the whole call. `rollover_term` is "all or
--      nothing" — if any single section fails to clone, the entire
--      rollover is aborted.
--   2. Idempotent: `rollover_term` skips sections that already have a
--      counterpart in the target term (matched by
--      `(target_term_label, course_code, section_code)`). Safe to re-run
--      after a partial failure was triangulated and resolved.
--   3. Audited: every action writes to `public.ops_log` via the D1
--      helper `ops_log_write(...)`. Per-section events share a
--      correlation_id with the batch summary event so the batch can be
--      reconstructed from ops_log alone.
--   4. Maintenance-mode aware: both RPCs call
--      `public.assert_not_maintenance()`, which blocks non-admin callers
--      during a maintenance window.
--   5. Authorized: only admin / superadmin / registrar may invoke.
--      EXECUTE privilege is granted only to `authenticated`; the
--      function itself re-checks the role inside SECURITY DEFINER.
--
-- Non-goals (by design):
--   - Does NOT copy `section_enrollments` (students re-enroll each term)
--   - Does NOT copy grades / assignments / submissions (term-scoped)
--   - Does NOT validate that `p_target_term_label` exists in
--     `academic_terms` (sections currently use a free-text term_label;
--     unifying that contract is out of scope for D3.1 — see D4 plan).
-- =====================================================================

-- ---------- clone_section_for_term ----------------------------------
CREATE OR REPLACE FUNCTION public.clone_section_for_term(
  p_source_section_id uuid,
  p_target_term_label text,
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
  v_new_id uuid;
  v_corr   uuid := COALESCE(p_correlation_id, gen_random_uuid());
BEGIN
  -- 1. AuthZ — admin / superadmin / registrar only
  IF NOT (public.has_role(v_actor,'admin'::public.app_role)
          OR public.has_role(v_actor,'superadmin'::public.app_role)
          OR public.has_role(v_actor,'registrar'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden'
      USING HINT = 'clone_section_for_term requires admin, superadmin, or registrar.';
  END IF;

  -- 2. Maintenance gate (admins bypass; checked inside the helper)
  PERFORM public.assert_not_maintenance();

  -- 3. Validate target label
  IF p_target_term_label IS NULL OR length(trim(p_target_term_label)) = 0 THEN
    RAISE EXCEPTION 'invalid_target_term_label'
      USING HINT = 'p_target_term_label must be a non-empty text label.';
  END IF;

  -- 4. Load source — locks the row to prevent concurrent mutation mid-clone
  SELECT * INTO v_source
  FROM public.course_sections
  WHERE id = p_source_section_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'source_section_not_found'
      USING HINT = format('No course_sections row with id=%s', p_source_section_id);
  END IF;

  IF v_source.term_label = p_target_term_label THEN
    RAISE EXCEPTION 'same_term'
      USING HINT = 'Source and target term_label must differ.';
  END IF;

  -- 5. Build the new row, applying overrides
  INSERT INTO public.course_sections (
    term_label, course_code, course_title, section_code,
    instructor_user_id, seat_capacity, waitlist_capacity,
    meeting_info, credit_hours, active
  )
  VALUES (
    p_target_term_label,
    v_source.course_code,
    v_source.course_title,
    v_source.section_code,
    COALESCE( (p_overrides->>'instructor_user_id')::uuid, v_source.instructor_user_id),
    COALESCE( (p_overrides->>'seat_capacity')::int,        v_source.seat_capacity),
    COALESCE( (p_overrides->>'waitlist_capacity')::int,    v_source.waitlist_capacity),
    COALESCE(  p_overrides->>'meeting_info',               v_source.meeting_info),
    COALESCE( (p_overrides->>'credit_hours')::numeric,     v_source.credit_hours),
    COALESCE( (p_overrides->>'active')::boolean,           v_source.active)
  )
  RETURNING id INTO v_new_id;
  -- Note: the (term_label, course_code, section_code) UNIQUE constraint
  -- enforces idempotency. A duplicate raises SQLSTATE 23505 which
  -- rolls back the whole call — caller treats that as "already exists".

  -- 6. Audit
  PERFORM public.ops_log_write(
    'rpc', 'section.cloned', 'info',
    format('Cloned section %s/%s/%s → %s', v_source.term_label, v_source.course_code,
           v_source.section_code, p_target_term_label),
    jsonb_build_object(
      'source_section_id', p_source_section_id,
      'new_section_id',    v_new_id,
      'source_term',       v_source.term_label,
      'target_term',       p_target_term_label,
      'course_code',       v_source.course_code,
      'section_code',      v_source.section_code,
      'overrides',         p_overrides
    ),
    v_corr
  );

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_section_for_term(uuid, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_section_for_term(uuid, text, jsonb, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.clone_section_for_term(uuid, text, jsonb, uuid) IS
  'Sprint D3.1: Clone a course_section into another term_label. Atomic, '
  'audited via ops_log, idempotent through UNIQUE(term_label,course_code,section_code), '
  'maintenance-mode-aware, admin/superadmin/registrar only.';

-- ---------- rollover_term -------------------------------------------
CREATE OR REPLACE FUNCTION public.rollover_term(
  p_source_term_label text,
  p_target_term_label text,
  p_only_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_corr  uuid := gen_random_uuid();
  v_row   public.course_sections%ROWTYPE;
  v_total int := 0;
  v_cloned int := 0;
  v_skipped int := 0;
  v_new_id uuid;
BEGIN
  -- 1. AuthZ
  IF NOT (public.has_role(v_actor,'admin'::public.app_role)
          OR public.has_role(v_actor,'superadmin'::public.app_role)
          OR public.has_role(v_actor,'registrar'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden'
      USING HINT = 'rollover_term requires admin, superadmin, or registrar.';
  END IF;

  -- 2. Maintenance gate
  PERFORM public.assert_not_maintenance();

  -- 3. Argument validation
  IF p_source_term_label IS NULL OR length(trim(p_source_term_label)) = 0 THEN
    RAISE EXCEPTION 'invalid_source_term_label';
  END IF;
  IF p_target_term_label IS NULL OR length(trim(p_target_term_label)) = 0 THEN
    RAISE EXCEPTION 'invalid_target_term_label';
  END IF;
  IF p_source_term_label = p_target_term_label THEN
    RAISE EXCEPTION 'same_term'
      USING HINT = 'Source and target term_label must differ.';
  END IF;

  -- 4. Batch-start audit (so the correlation_id appears in ops_log even
  --    if the batch aborts before completing).
  PERFORM public.ops_log_write(
    'rpc', 'term.rollover_started', 'info',
    format('Rollover begin: %s → %s (only_active=%s)',
           p_source_term_label, p_target_term_label, p_only_active),
    jsonb_build_object(
      'source_term', p_source_term_label,
      'target_term', p_target_term_label,
      'only_active', p_only_active
    ),
    v_corr
  );

  -- 5. Iterate, clone idempotently
  FOR v_row IN
    SELECT *
      FROM public.course_sections
     WHERE term_label = p_source_term_label
       AND (NOT p_only_active OR active = true)
  LOOP
    v_total := v_total + 1;

    -- Idempotency: if a counterpart already exists, skip + audit.
    IF EXISTS (
      SELECT 1 FROM public.course_sections
       WHERE term_label  = p_target_term_label
         AND course_code = v_row.course_code
         AND section_code = v_row.section_code
    ) THEN
      v_skipped := v_skipped + 1;
      PERFORM public.ops_log_write(
        'rpc', 'section.clone_skipped_existing', 'info',
        format('Skipped %s/%s (already in %s)',
               v_row.course_code, v_row.section_code, p_target_term_label),
        jsonb_build_object(
          'source_section_id', v_row.id,
          'source_term',       p_source_term_label,
          'target_term',       p_target_term_label,
          'course_code',       v_row.course_code,
          'section_code',      v_row.section_code
        ),
        v_corr
      );
      CONTINUE;
    END IF;

    -- Clone the row; share correlation_id so per-section audit ties to batch.
    v_new_id := public.clone_section_for_term(
      v_row.id, p_target_term_label, '{}'::jsonb, v_corr
    );
    v_cloned := v_cloned + 1;
  END LOOP;

  -- 6. Batch-complete audit
  PERFORM public.ops_log_write(
    'rpc', 'term.rolled_over', 'info',
    format('Rollover complete: %s → %s (cloned=%s, skipped=%s, total=%s)',
           p_source_term_label, p_target_term_label, v_cloned, v_skipped, v_total),
    jsonb_build_object(
      'source_term',      p_source_term_label,
      'target_term',      p_target_term_label,
      'only_active',      p_only_active,
      'total',            v_total,
      'cloned',           v_cloned,
      'skipped_existing', v_skipped
    ),
    v_corr
  );

  RETURN jsonb_build_object(
    'correlation_id',   v_corr,
    'source_term',      p_source_term_label,
    'target_term',      p_target_term_label,
    'only_active',      p_only_active,
    'total',            v_total,
    'cloned',           v_cloned,
    'skipped_existing', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_term(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollover_term(text, text, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.rollover_term(text, text, boolean) IS
  'Sprint D3.1: Bulk-clone all course_sections from one term_label to '
  'another. Atomic (all-or-nothing on error), idempotent (skips '
  'existing counterparts), audited (correlation_id ties per-section + '
  'batch ops_log rows), maintenance-mode-aware, admin/superadmin/'
  'registrar only.';
