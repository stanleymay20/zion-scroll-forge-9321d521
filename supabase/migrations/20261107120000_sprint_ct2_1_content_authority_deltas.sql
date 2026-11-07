-- =====================================================================
-- Sprint CT2.1 — Content-authority deltas on top of PR #2 (abcfb59)
-- =====================================================================
-- The module content-authority system landed in PR #2 (migrations
-- 20260907102500 / 20260907103000 / 20260907104000 / 20260907104100)
-- and is the authoritative shape — do not add parallel tables or
-- parallel state machines.
--
-- This migration only closes two gaps surfaced by a delta audit of
-- that landed work vs. the CT2 sprint plan:
--
--   1. Student-visibility RLS on course_modules did not fold in the
--      new content_review_state. The existing "Course modules
--      readable only by enrolled course members" policy passes
--      draft/retired/faculty_reviewed modules through to enrolled
--      students as well, even though the readiness gate assumed
--      modules would only reach a classroom at content_review_state
--      = 'published'. This migration tightens the enrolled-student
--      branch to require 'published'; admin/superadmin and teaching
--      faculty retain full visibility so authoring + review still
--      work.
--
--   2. review_module_content and publish_module_content did not
--      call assert_not_maintenance(). Every other D-sprint mutation
--      RPC does, and the operational pattern is that content
--      publication must freeze during a maintenance window just
--      like grading and rollover. This migration wraps both RPCs
--      with the maintenance gate, preserving all other behavior.
--
-- No new tables, no new states, no parallel authority system.
-- =====================================================================

-- ---------- 0. Substrate shims (identical pattern to prior sprints)
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
-- Keep the existing policy name and overall shape; narrow the enrolled
-- branch so students only see modules that have cleared the full
-- independent-review + quality-verified publication pathway.
DROP POLICY IF EXISTS "Course modules readable only by enrolled course members"
  ON public.course_modules;

CREATE POLICY "Course modules readable only by enrolled course members"
ON public.course_modules
FOR SELECT
TO authenticated
USING (
  -- Admin/superadmin see everything regardless of state so they can
  -- drive authoring and publication from the Content Review Queue.
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  -- Teaching faculty assigned to the course see everything so they
  -- can draft and iterate before submitting for review.
  OR EXISTS (
    SELECT 1
    FROM public.teaching_assignments t
    WHERE t.course_id = course_modules.course_id
      AND t.faculty_user_id = auth.uid()
  )
  -- Enrolled students only see modules that have been independently
  -- reviewed AND passed the quality gate via publish_module_content.
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

-- ---------- 2. Maintenance-mode gate on review_module_content --------
-- Replace with the same body, prefixed by assert_not_maintenance.
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

  -- CT2.1: content publication pathway honours the maintenance window
  -- just like every other D-sprint mutation RPC.
  PERFORM public.assert_not_maintenance();

  IF p_decision NOT IN ('approve','reject','revision_needed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_review_decision';
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
    content_id, content_type, reviewer_id, review_type, quality_score,
    feedback, status, reviewed_at, module_version_id, reviewed_revision
  ) VALUES (
    p_module_id, 'module', v_actor, 'expert_review', p_quality_score,
    p_feedback, v_status, now(), v_version_id, v_module.content_revision
  );

  -- The trusted-RPC session flag allows the content-authority field guard
  -- trigger (added by 20260907104000) to accept this UPDATE of the
  -- otherwise-protected review-state fields. Keep this call signature
  -- byte-identical with what landed in PR #2.
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

-- ---------- 3. Maintenance-mode gate on publish_module_content -------
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

  -- CT2.1: publication must freeze during a maintenance window.
  PERFORM public.assert_not_maintenance();

  SELECT id, content_revision, content_changed_by, content_review_state
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

  SELECT EXISTS (
    SELECT 1
    FROM public.content_quality_reviews qr
    WHERE qr.module_version_id = v_version_id
      AND qr.content_type = 'module'
      AND qr.status = 'approved'
      AND (v_module.content_changed_by IS NULL OR qr.reviewer_id IS DISTINCT FROM v_module.content_changed_by)
  ) INTO v_has_independent_approval;

  IF NOT v_has_independent_approval THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'independent_module_review_required';
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

GRANT EXECUTE ON FUNCTION public.review_module_content(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_module_content(uuid) TO authenticated;

COMMENT ON FUNCTION public.review_module_content(uuid, text, text, numeric) IS
  'CT2.1: maintenance-gated review action on top of PR #2. Appends an '
  'expert_review row to content_quality_reviews; on approve, module advances '
  'to faculty_reviewed. Rejection or revision_needed resets to draft.';

COMMENT ON FUNCTION public.publish_module_content(uuid) IS
  'CT2.1: maintenance-gated publish action on top of PR #2. Requires an '
  'approved review by a reviewer OTHER THAN the content author plus a clean '
  'evaluate_module_quality() pass. Admin/superadmin only.';
