-- =====================================================================
-- Sprint CT2.1 — Content-authority deltas on top of PR #2
-- =====================================================================
-- Two additive gaps on top of PR #2's authoritative shape:
--
--   1. Student-visibility RLS on course_modules did not fold in
--      content_review_state + quality_verified for enrolled students.
--      Tighten so only 'published' + quality-verified modules reach
--      them. Admin/superadmin and teaching faculty keep full visibility.
--
--   2. review_module_content + publish_module_content did not call
--      assert_not_maintenance(). Add it so content publication honors
--      the maintenance window like every other D-sprint mutation RPC.
--
-- CRITICAL: the RPC bodies here must be based on the hardening
-- migration (20260907104000), NOT the original (20260907103000).
-- The hardening migration added invalid_quality_score, faculty_
-- review_required, module_version_id, trusted-RPC session flag.
-- PR #2's test suite verifies those tokens exist, so the body copied
-- here preserves them verbatim and adds ONLY assert_not_maintenance.
-- =====================================================================

-- ---------- 0. Substrate shims ---------------------------------------
DO $shim$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='assert_not_maintenance'
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.assert_not_maintenance() RETURNS void
      LANGUAGE plpgsql AS $f$ BEGIN RETURN; END $f$;
    $body$;
  END IF;
END$shim$;

-- ---------- 1. Student-visibility RLS gate on course_modules ---------
DROP POLICY IF EXISTS "Course modules readable only by enrolled course members"
  ON public.course_modules;

CREATE POLICY "Course modules readable only by enrolled course members"
ON public.course_modules
FOR SELECT
TO authenticated
USING (
  -- Admin/superadmin see everything regardless of state.
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  -- Teaching-assigned faculty see everything so authoring+review work.
  OR EXISTS (
    SELECT 1
    FROM public.teaching_assignments t
    WHERE t.course_id = course_modules.course_id
      AND t.faculty_user_id = auth.uid()
  )
  -- Enrolled students only see published + quality-verified modules.
  OR (
    content_review_state = 'published'
    AND COALESCE(quality_verified, false)
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.course_id = course_modules.course_id
        AND e.user_id = auth.uid()
    )
  )
);

COMMENT ON POLICY "Course modules readable only by enrolled course members"
  ON public.course_modules IS
  'CT2.1: enrolled students see modules only when content_review_state = ''published'' '
  'AND quality_verified = true. Admin, superadmin and teaching-assigned faculty retain '
  'full visibility so authoring and the independent-review path still work.';

-- ---------- 2. review_module_content: body of 20260907104000
--             PLUS assert_not_maintenance() after the auth check.
CREATE OR REPLACE FUNCTION public.review_module_content(
  p_module_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL,
  p_quality_score numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_module record;
  v_version_id uuid;
  v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  -- CT2.1: content publication honours the maintenance window.
  PERFORM public.assert_not_maintenance();

  IF p_decision NOT IN ('approve','reject','revision_needed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_review_decision';
  END IF;

  IF p_quality_score IS NOT NULL AND (p_quality_score < 0 OR p_quality_score > 10) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_quality_score';
  END IF;

  IF NOT public.can_author_module_content(v_actor, p_module_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'module_review_forbidden';
  END IF;

  SELECT id, content_revision, content_changed_by
  INTO v_module
  FROM public.course_modules
  WHERE id = p_module_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'module_not_found';
  END IF;

  SELECT id INTO v_version_id
  FROM public.module_content_versions
  WHERE module_id = p_module_id
    AND revision = v_module.content_revision;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'current_module_version_missing';
  END IF;

  v_status := CASE p_decision
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    ELSE 'revision_needed'
  END;

  INSERT INTO public.content_quality_reviews (
    content_id,
    content_type,
    reviewer_id,
    review_type,
    quality_score,
    feedback,
    status,
    reviewed_at,
    module_version_id,
    reviewed_revision
  ) VALUES (
    p_module_id,
    'module',
    v_actor,
    'expert_review',
    p_quality_score,
    p_feedback,
    v_status,
    now(),
    v_version_id,
    v_module.content_revision
  );

  PERFORM set_config('scrolluniversity.content_authority_rpc', 'on', true);
  UPDATE public.course_modules
  SET content_review_state = CASE
        WHEN p_decision = 'approve' THEN 'faculty_reviewed'
        ELSE 'draft'
      END,
      content_reviewed_by = CASE WHEN p_decision = 'approve' THEN v_actor ELSE NULL END,
      content_reviewed_at = CASE WHEN p_decision = 'approve' THEN now() ELSE NULL END,
      quality_verified = false
  WHERE id = p_module_id;
  PERFORM set_config('scrolluniversity.content_authority_rpc', 'off', true);

  RETURN jsonb_build_object(
    'module_id', p_module_id,
    'revision', v_module.content_revision,
    'decision', p_decision,
    'review_state', CASE WHEN p_decision = 'approve' THEN 'faculty_reviewed' ELSE 'draft' END
  );
END;
$$;

-- ---------- 3. publish_module_content: body of 20260907104000
--             PLUS assert_not_maintenance() after the auth check.
CREATE OR REPLACE FUNCTION public.publish_module_content(p_module_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_module record;
  v_version_id uuid;
  v_has_independent_approval boolean := false;
  v_issues text[] := ARRAY[]::text[];
BEGIN
  IF v_actor IS NULL OR NOT public.can_publish_module_content(v_actor) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'module_publish_forbidden';
  END IF;

  -- CT2.1: publication freezes during a maintenance window.
  PERFORM public.assert_not_maintenance();

  SELECT id, content_revision, content_changed_by, content_review_state
  INTO v_module
  FROM public.course_modules
  WHERE id = p_module_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'module_not_found';
  END IF;

  IF v_module.content_review_state <> 'faculty_reviewed' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'faculty_review_required';
  END IF;

  SELECT id INTO v_version_id
  FROM public.module_content_versions
  WHERE module_id = p_module_id
    AND revision = v_module.content_revision;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'current_module_version_missing';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.content_quality_reviews qr
    WHERE qr.module_version_id = v_version_id
      AND qr.content_type = 'module'
      AND qr.status = 'approved'
      AND (v_module.content_changed_by IS NULL
           OR qr.reviewer_id IS DISTINCT FROM v_module.content_changed_by)
  ) INTO v_has_independent_approval;

  IF NOT v_has_independent_approval THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'independent_module_review_required';
  END IF;

  IF to_regprocedure('public.evaluate_module_quality(uuid)') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'module_quality_evaluator_missing';
  END IF;

  v_issues := public.evaluate_module_quality(p_module_id);
  IF COALESCE(cardinality(v_issues), 0) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'module_quality_gate_failed',
      DETAIL = to_jsonb(v_issues)::text;
  END IF;

  PERFORM set_config('scrolluniversity.content_authority_rpc', 'on', true);
  UPDATE public.course_modules
  SET content_review_state = 'published',
      content_reviewed_by = v_actor,
      content_reviewed_at = now(),
      quality_issues = v_issues,
      quality_verified = true
  WHERE id = p_module_id;
  PERFORM set_config('scrolluniversity.content_authority_rpc', 'off', true);

  RETURN jsonb_build_object(
    'module_id', p_module_id,
    'revision', v_module.content_revision,
    'review_state', 'published',
    'quality_verified', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_module_content(uuid, text, text, numeric)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_module_content(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_module_content(uuid, text, text, numeric)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_module_content(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.review_module_content(uuid, text, text, numeric) IS
  'CT2.1: maintenance-gated review on top of PR #2 hardening '
  '(20260907104000). Preserves all PR #2 invariants: invalid_quality_score, '
  'module_version_id, trusted-RPC session flag.';

COMMENT ON FUNCTION public.publish_module_content(uuid) IS
  'CT2.1: maintenance-gated publish on top of PR #2 hardening '
  '(20260907104000). Preserves all PR #2 invariants: faculty_review_required, '
  'independent_module_review_required, evaluate_module_quality, '
  'trusted-RPC session flag.';
