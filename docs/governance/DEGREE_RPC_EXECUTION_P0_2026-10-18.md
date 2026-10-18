# ScrollUniversity P0 — Academic definer RPC execution (2026-10-18)

## Verified live Cloud evidence (read-only)
Existing Lovable-controlled project: `426c315d-4873-4b87-b6dc-8687eb5fe15b`.
Live `pg_proc` confirms these postgres-owned, `SECURITY DEFINER` functions
grant `EXECUTE` to both `anon` and `authenticated`:

- `generate_degree_plan(uuid,uuid)`: accepts caller-supplied student and program IDs, creates/updates plan rows, inserts audit events; no caller authorization in current body.
- `run_degree_audit(uuid,uuid)`: accepts target student ID, recomputes/writes degree-plan and enrollment summaries, inserts audit events; no caller authorization in current body.
- `evaluate_graduation_candidate(uuid)`: accepts target student ID, recomputes/records graduation candidates and outcomes; no caller authorization in current body.
- `check_credential_eligibility(uuid,issued_credential_kind)`: computes credit/GPA eligibility for an arbitrary target student; no caller authorization in current body.

This verifies unsafe privilege boundaries; it does **not** claim confirmed malicious use or data exfiltration. No real user records were queried.

## Candidate mitigation (separate PR)
- Revoke `PUBLIC`/`anon`/`authenticated` EXECUTE on the three state-writing internal RPCs. Grant `service_role` explicitly; postgres-owned trusted definer routines retain normal owner access.
- Reimplement `check_credential_eligibility` with exactly its existing eligibility calculations, adding a **mandatory active registrar/admin/superadmin identity gate** (or service role). Keep `authenticated` EXECUTE for the existing registrar web interface but reject ordinary users before querying grades.
- Preserve existing tables, data, signature, course registration RPC, backend credential issuance and application routes.
- Add a blocking SQL regression test to both existing GitHub workflows. Negative eligibility test uses a fabricated non-staff JWT identity, not a student record.

## Important limitations and release discipline
- **Not deployed.** Live database is behind current repository migrations; Lovable controls its migrations.
- The migration deliberately fails if prerequisite functions are missing. Reconcile them in staging, never blindly replay historic migrations or unreviewed content backfills.
- Test actual staff/browser eligibility checks and internal triggered writes in a staging copy before production. The SQL suite tests privilege boundaries and non-staff rejection, but not every staff end-to-end path.
- Inventory other SQL SECURITY DEFINER RPCs (particularly `compute_student_gpa` and any simulation RPC with student-ID arrays), default PUBLIC grants, privilege escalation paths, trigger ownership and search_path. Do not claim full authorization assurance from this isolated fix.
- Related candidate: PR #14 (degree audit log direct write protections), Issue #16 (production migration parity), Issue #17 (flagship course).
- No merge before exact-head green CI and code review. No production change without explicit user authorization, backups, staging acceptance and Lovable Cloud parity verification.

## Current release verdict
Commercial GA remains **NO-GO**; prerelease security fix under review only.
