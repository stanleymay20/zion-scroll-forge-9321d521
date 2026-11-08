-- =====================================================================
-- Phase 2A — Pilot Institution Tier
-- =====================================================================
-- Context: ScrollUniversity currently operates as a pilot institution.
-- The engineering substrate is solid; curriculum + accreditation
-- posture is not yet. Phase 2A makes that distinction explicit and
-- enforceable:
--
--   1. Adds institutions.lifecycle_status with a CHECK constraint
--      pinned to ('pilot','operational','archived').
--   2. Defaults new institutions to 'pilot' (safe default — a fresh
--      institution has not yet demonstrated it can issue anything).
--   3. Backfills existing institutions to 'operational' so previously
--      created rows keep behaving.
--   4. Adds public.institution_is_pilot(id) -> boolean primitive.
--   5. Adds public.assert_institution_not_pilot(id, action text) that
--      raises 'pilot_institution_blocks_<action>' if the institution
--      is pilot — intended to be called by any RPC that mints
--      verifiable credentials, confers degrees, or signs transcripts.
--   6. Adds public.vw_institution_banner — one row per institution
--      with name, slug (or domain fallback), lifecycle_status,
--      is_pilot — the canonical surface the UI watermark reads.
--
-- Phase 2A ships the primitive. The specific RPCs it gates
-- (confer_degree, issue_credential, sign_transcript) are wired up
-- as they're created; nothing ambient is retroactively rewritten
-- in this sprint, so no behavioral surprises for existing callers.
-- =====================================================================

-- ---------- 1. institutions.lifecycle_status column ----------------
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'pilot';

-- Backfill existing rows to 'operational' BEFORE adding the CHECK
-- constraint (otherwise freshly-defaulted 'pilot' rows would pass
-- but existing rows that pre-date the column would be NULL during
-- the backfill moment on older Postgres versions).
UPDATE public.institutions
   SET lifecycle_status = COALESCE(NULLIF(lifecycle_status, ''), 'operational')
 WHERE lifecycle_status IS NULL OR lifecycle_status = '' OR lifecycle_status = 'pilot';

-- Idempotent CHECK: drop any pre-existing one by the same name first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conname = 'institutions_lifecycle_status_chk'
                AND conrelid = 'public.institutions'::regclass) THEN
    ALTER TABLE public.institutions
      DROP CONSTRAINT institutions_lifecycle_status_chk;
  END IF;
END$$;

ALTER TABLE public.institutions
  ADD CONSTRAINT institutions_lifecycle_status_chk
  CHECK (lifecycle_status IN ('pilot','operational','archived'));

CREATE INDEX IF NOT EXISTS institutions_lifecycle_status_idx
  ON public.institutions(lifecycle_status);

COMMENT ON COLUMN public.institutions.lifecycle_status IS
  'P2A: pilot | operational | archived. Pilot institutions cannot issue verifiable credentials, confer degrees or sign transcripts. New institutions default to pilot.';

-- ---------- 2. institution_is_pilot primitive ----------------------
CREATE OR REPLACE FUNCTION public.institution_is_pilot(_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT lifecycle_status = 'pilot'
       FROM public.institutions
      WHERE id = _institution_id),
    true  -- unknown institution treated as pilot (fail-closed)
  );
$$;

REVOKE ALL ON FUNCTION public.institution_is_pilot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.institution_is_pilot(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.institution_is_pilot(uuid) IS
  'P2A: returns true if the institution is pilot-tier, or NULL/unknown (fail-closed). UI watermark + server guards consult this.';

-- ---------- 3. assert_institution_not_pilot guard -------------------
CREATE OR REPLACE FUNCTION public.assert_institution_not_pilot(
  _institution_id uuid,
  _action text
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _institution_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'institution_required_for_' || COALESCE(_action, 'action');
  END IF;

  IF public.institution_is_pilot(_institution_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'pilot_institution_blocks_' || COALESCE(_action, 'action'),
      DETAIL  = 'Institution ' || _institution_id::text
                || ' is in pilot lifecycle; this action requires lifecycle_status = operational.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_institution_not_pilot(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_institution_not_pilot(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.assert_institution_not_pilot(uuid, text) IS
  'P2A: raises pilot_institution_blocks_<action> if the institution is pilot. Intended to be PERFORM-called by confer_degree, issue_credential, sign_transcript and similar irreversible-issuance RPCs.';

-- ---------- 4. vw_institution_banner --------------------------------
-- Minimal canonical UI surface: id, name, lifecycle_status, is_pilot.
-- Slug/domain variations across the two historical institutions shapes
-- are not exposed here; UI code queries institutions directly for
-- those when needed.
CREATE OR REPLACE VIEW public.vw_institution_banner AS
SELECT
  i.id,
  i.name,
  i.lifecycle_status,
  (i.lifecycle_status = 'pilot') AS is_pilot
FROM public.institutions i;

GRANT SELECT ON public.vw_institution_banner TO authenticated, anon;

COMMENT ON VIEW public.vw_institution_banner IS
  'P2A: canonical UI banner surface. is_pilot drives the "pilot institution" watermark on every student-facing page.';
