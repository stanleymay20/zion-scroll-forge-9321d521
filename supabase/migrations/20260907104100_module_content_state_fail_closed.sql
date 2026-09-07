-- Final fail-closed state guard for ScrollUniversity module-content authority.
-- SECURITY DEFINER functions execute with the owner as current_user, so the
-- authority boundary must not infer trust from current_user. The only trusted
-- state-write path is the transaction-local marker set inside the review and
-- publication RPCs. Controlled DBA maintenance can set the same LOCAL marker
-- explicitly inside its transaction.

CREATE OR REPLACE FUNCTION public.guard_module_content_authority_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted boolean := COALESCE(
    current_setting('scrolluniversity.content_authority_rpc', true),
    'off'
  ) = 'on';
BEGIN
  IF v_trusted THEN
    RETURN NEW;
  END IF;

  IF NEW.content_md IS DISTINCT FROM OLD.content_md THEN
    -- A body edit may arrive with attempted state changes. Neutralize those
    -- values here; the later content-change trigger calculates the new
    -- revision and forces draft/unverified state.
    NEW.content_revision := OLD.content_revision;
    NEW.content_review_state := OLD.content_review_state;
    NEW.quality_verified := OLD.quality_verified;
    NEW.quality_issues := OLD.quality_issues;
    NEW.content_reviewed_by := OLD.content_reviewed_by;
    NEW.content_reviewed_at := OLD.content_reviewed_at;
    RETURN NEW;
  END IF;

  IF NEW.content_revision IS DISTINCT FROM OLD.content_revision
     OR NEW.content_review_state IS DISTINCT FROM OLD.content_review_state
     OR NEW.quality_verified IS DISTINCT FROM OLD.quality_verified
     OR NEW.quality_issues IS DISTINCT FROM OLD.quality_issues
     OR NEW.content_reviewed_by IS DISTINCT FROM OLD.content_reviewed_by
     OR NEW.content_reviewed_at IS DISTINCT FROM OLD.content_reviewed_at
     OR NEW.content_source IS DISTINCT FROM OLD.content_source
     OR NEW.content_model IS DISTINCT FROM OLD.content_model
     OR NEW.content_prompt_hash IS DISTINCT FROM OLD.content_prompt_hash
     OR NEW.content_generated_by IS DISTINCT FROM OLD.content_generated_by
     OR NEW.content_generated_at IS DISTINCT FROM OLD.content_generated_at
     OR NEW.content_changed_by IS DISTINCT FROM OLD.content_changed_by
     OR NEW.ai_generated IS DISTINCT FROM OLD.ai_generated THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'module_content_authority_state_write_forbidden';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_module_content_authority_fields() IS
  'Fail-closed publication/provenance state guard. Only transactions carrying the explicit ScrollUniversity content-authority LOCAL marker may perform state-only writes.';
