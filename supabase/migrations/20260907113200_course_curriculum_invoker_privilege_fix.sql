-- Fix the course-curriculum authority trigger's invoker privilege chain.
--
-- The previous hardening correctly changed this trigger to SECURITY INVOKER so
-- current_user reflects the browser/authenticated caller. However, the trigger
-- still called the internal helpers can_author_course_curriculum(...) and
-- can_administer_course_curriculum(...), whose EXECUTE privilege is deliberately
-- revoked from authenticated. Legitimate authenticated DML could therefore fail
-- with a function-permission error before the intended authority decision ran.
--
-- Keep the internal helpers private. The invoker trigger must use the existing
-- authenticated-safe current-user wrappers, which are SECURITY DEFINER and
-- expose only boolean authority decisions.

CREATE OR REPLACE FUNCTION public.enforce_course_curriculum_state_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_internal boolean := COALESCE(current_setting('app.course_curriculum_internal', true), '') = 'on';
  v_privileged_session boolean := current_user IN ('postgres', 'service_role', 'supabase_admin');
  v_metadata_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_internal AND NOT v_privileged_session THEN
      IF NOT public.can_current_user_administer_course_curriculum() THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_creation_requires_institution_admin';
      END IF;

      IF COALESCE(NEW.curriculum_status::text, 'pending_authorship') NOT IN ('pending_authorship', 'authored') THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'direct_course_review_state_change_forbidden';
      END IF;

      NEW.faculty_author_id := COALESCE(NEW.faculty_author_id, v_actor);
      NEW.reviewed_by := NULL;
      NEW.last_reviewed_at := NULL;
      NEW.course_curriculum_changed_at := now();
      NEW.course_curriculum_changed_by := v_actor;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT v_internal AND NOT v_privileged_session THEN
    IF NOT public.can_current_user_author_course_curriculum(OLD.id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_curriculum_authority_required';
    END IF;

    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at
       OR NEW.course_curriculum_changed_at IS DISTINCT FROM OLD.course_curriculum_changed_at
       OR NEW.course_curriculum_changed_by IS DISTINCT FROM OLD.course_curriculum_changed_by THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_review_projection_is_guarded';
    END IF;

    IF NEW.curriculum_status IS DISTINCT FROM OLD.curriculum_status
       AND NEW.curriculum_status::text IN ('faculty_review', 'accreditation_review', 'approved') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'direct_course_review_state_change_forbidden';
    END IF;

    IF NEW.faculty_author_id IS DISTINCT FROM OLD.faculty_author_id
       AND NOT public.can_current_user_administer_course_curriculum() THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'course_author_assignment_requires_institution_admin';
    END IF;
  END IF;

  v_metadata_changed :=
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.syllabus IS DISTINCT FROM OLD.syllabus
    OR NEW.faculty_author_id IS DISTINCT FROM OLD.faculty_author_id;

  IF v_metadata_changed AND NOT v_internal THEN
    NEW.curriculum_status := 'authored';
    NEW.faculty_author_id := COALESCE(NEW.faculty_author_id, OLD.faculty_author_id, v_actor);
    NEW.reviewed_by := NULL;
    NEW.last_reviewed_at := NULL;
    NEW.course_curriculum_changed_at := now();
    NEW.course_curriculum_changed_by := v_actor;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_course_curriculum_state_authority() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.enforce_course_curriculum_state_authority() IS
  'Invoker-rights trigger that uses authenticated-safe current-user authority wrappers; browser callers cannot forge course review or approval state.';
