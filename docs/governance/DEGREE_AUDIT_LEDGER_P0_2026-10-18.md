# ScrollUniversity P0 — Degree-audit ledger authority (2026-10-18)

## Verified finding (read-only production)
- Project: existing Lovable Cloud / Supabase project, NOT a replacement environment.
- `public.degree_audit_log` has RLS enabled.
- Live policy `System insert degree audit` was `FOR INSERT TO authenticated WITH CHECK (true)`.
- `authenticated` had table `INSERT` privilege; therefore RLS and table ACL together did not restrict INSERT to trusted school authority.
- Direct table privileges and `pg_policies` metadata verify the exposure. Actual exploit attempts and trigger/definer inspection against production have NOT been performed.
- The table also has a self/staff SELECT policy, which must remain operational.

## Change in this PR
1. Require the table to exist; never silently pass on a missing academic authority prerequisite.
2. Revoke INSERT/UPDATE/DELETE from PUBLIC, anon and authenticated.
3. Drop the permissive historical INSERT policy, without deleting or modifying stored audit events.
4. Preserve service_role and SECURITY DEFINER function ownership/behavior.
5. Run a blocking SQL regression check in both existing CI pipelines.

## Deployment boundary
**Repository-only change.** A passing CI build does not make this migration active in the current Lovable-managed production database. The production migration ledger is not in parity with repo, and no blanket replay of historical migrations is approved. Do not execute the migration or merge this PR without exact-head CI and review.

Rollout must first inventory:
- live triggers, all policies and grants for degree_audit_log;
- the owners/security/EXECUTE grants of `generate_degree_plan`, `run_degree_audit`, `evaluate_graduation_candidate`;
- known staff/student flows writing degree audit entries;
- how the relevant migration is admitted into Lovable Cloud under the existing platform;
- prior backup restore test and staging rollback dry run.

Apply to staging in a controlled window, prove (a) authenticated direct INSERT denied, (b) student/staff authorised reads work, (c) trusted grade and degree-plan functions still append audit entries, then deploy via an audited production change approval.

## Separate, unresolved P0/P1 items
- SECURITY DEFINER degree/audit RPC authorization, especially arbitrary student-id inputs, needs independent review.
- Live `enrollments` and `student_degree_enrollments` client write grants must be reconciled with canonical server-owned enrollment authority, without bypassing application onboarding.
- Production migration parity; course content governance; credential authority; misleading hard-coded institutional claims; online tuition settlement; paid student journey; backups/restores; actual browser preview and production.
- Accreditation/degree-awarding authority is outside software and must be legally evidenced.

## Release decision
**NO-GO** for commercial degrees or enrollment at current production evidence level. This PR is an isolated remediation candidate, not commercial certification.
