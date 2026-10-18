# P0 — Protected GPA, academic standing and transcripts

## Proof from live existing Lovable Cloud (read-only)
2026-10-18 `pg_proc` inspection:
- `compute_student_gpa(uuid,uuid)`: postgres-owned SECURITY DEFINER, `anon` and `authenticated` EXECUTE; reads grades and appends audit event without validating student ID.
- `evaluate_academic_standing(uuid,uuid)`: postgres-owned SECURITY DEFINER, `anon` and `authenticated` EXECUTE; recomputes student standing without validating caller.
- `generate_transcript(uuid)`: postgres-owned SECURITY DEFINER, `anon` and `authenticated` EXECUTE; its original `auth.uid() <> _student_id` guard is not NULL-safe for anonymous callers (PL/pgSQL IF NULL is not TRUE), potentially allowing unauthorized transcript reads.

## Changes
The candidate migration uses **the existing live Cloud definitions** returned by `pg_get_functiondef`, preserving SQL body and signatures except for a minimal early caller gate:
1. Student GPA: only same student, active faculty/registrar/admin/superadmin, or trusted service_role.
2. Academic-standing recalculation: only active faculty/registrar/admin/superadmin or service_role.
3. Transcript generation: same student, registrar/admin/superadmin, or service_role with a NULL-safe rejection condition, before any reads/writes.
4. Drop anonymous EXECUTE on all 3; preserve authenticated self-service functions and service_role.
5. Add transaction-scoped negative tests to both CI workflows using synthetic UUID/JWT identity, not real learner records.

## Deployment/staging restrictions
- No merge or production migration without exact-head CI, independent code review, matching live migration history, verified backup/restore, and owner approval.
- Do **not** silently apply to Lovable-managed production or overwrite academic content.
- High-priority staging verification: positive self GPA/transcript, permitted staff access, grade-finalization triggers, transcripts, registrar calendars, standing computations and authorized backend service calls.
- The repository's clean Postgres CI environment does not prove all client and trigger pathways work in the populated Cloud DB.
- Function ownership and service-role identity across PostgREST/edge calls must be verified. A hard denial from no-JWT context is intentional but may require staged treatment of internal batch jobs.
- Related draft PRs #14/#18 remain separate. Resolve migration order and tests together before controlled staging.

## Remaining risk
Broader SECURITY DEFINER inventory, client enrollment grants, data-parity, institutional legitimacy, academic readiness and payments still gate commercial launch.

**Commercial GA decision: NO-GO.**
