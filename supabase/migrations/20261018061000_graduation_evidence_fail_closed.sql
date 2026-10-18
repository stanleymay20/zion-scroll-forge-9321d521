-- ScrollUniversity P0: never certify graduation using unverified requirements.
-- Historical graduate-evaluation implementations manufactured TRUE for
-- capstone_approved, thesis_approved, faculty_signoff, and (in the newer
-- version) spiritual_formation_met/capstone_completed. The latest version
-- assesses PLO mastery, but still treats the other gates as automatically met.
-- Academic records and original candidate rows are intentionally preserved.
-- This pre-launch freeze stays until documented, evidence-backed institutional
-- graduation and credential authority exists. Do not apply without the
-- existing Lovable Cloud parity/staging/backup release process.

DO $preflight$
BEGIN
  IF to_regprocedure('public.evaluate_graduation_candidate(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P0: graduation evaluator missing; do not silently qualify';
  END IF;
END
$preflight$;

-- Fail before reading or writing grade, progress, audit, candidate,
-- eligibility, credential or graduation tables. Even trusted service callers
-- receive an explicit, auditable denial rather than a fabricated approval.
CREATE OR REPLACE FUNCTION public.evaluate_graduation_candidate(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $freeze$
BEGIN
  RAISE EXCEPTION 'graduation_evidence_unverified: verified capstone, thesis, faculty, formation and academic recognition gates unavailable'
    USING ERRCODE = '55000',
          HINT = 'Remain in non-degree learning mode. Require real reviewed evidence and formally approved graduation authority before replacing this gate.';
END
$freeze$;

REVOKE ALL ON FUNCTION public.evaluate_graduation_candidate(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_graduation_candidate(uuid)
  TO service_role;

COMMENT ON FUNCTION public.evaluate_graduation_candidate(uuid)
IS 'Commercial GA freeze: no automatic graduation approval or candidate mutation until all academic, human-review and legal evidence gates are independently qualified.';
