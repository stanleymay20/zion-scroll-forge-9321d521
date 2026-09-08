# Migration Parity Recovery — Repo `main` vs Lovable Cloud

Forensic analysis only. No schema, data, or gate changes are proposed in this document; it defines the safe method and the order of work for a later approved sprint.

## What the evidence shows

Verified read-only against the live Cloud database and the repository working tree:

- Cloud ledger `supabase_migrations.schema_migrations`: 193 rows, first `20251006060308`, last `20260725124701`, zero rows at or after `20260726`.
- Repository: 241 migration files; 34 files sort after the ledger's last version.
- Object probes confirm the gap is **real, not cosmetic**. Absent from Cloud: `academic_workload_benchmarks`, `course_teaching_readiness`, `content_quality_reviews`, `module_content_versions`, `course_curriculum_completeness`, `verified_learning_rewards`, `stripe_webhook_events`, `v_course_teaching_readiness`, `v_course_curriculum_completeness`.
- Some objects named in the same window **do** exist (`assert_not_maintenance`, `ops_log_write`, `workload_propose_assignment`, `workload_submit_proposals`, `record_skill_evidence`, `recompute_student_skill_mastery`, `quiz_submissions`, `academic_terms`, `academic_years`, `v_learning_readiness`). So the window is partially applied: some SQL reached Cloud through chat migrations recorded under different version numbers, while the file that also contains it never ran as a file.

Conclusion: filename timestamps are not a reliable applied/pending signal for this project. Pending status must be decided per object, not per filename.

## Answers to the three questions

**1. Can a normal Lovable build/chat execute existing repo migration files and record them correctly?**

Yes, with one caveat. The migration tool is the only supported write path to this database; there is no `supabase db push` and no automatic replay of `supabase/migrations/*.sql` on Cloud. Passing a repository file's SQL **byte-for-byte** to the migration tool executes it and appends a ledger row, so history is preserved and auditable. The caveat: the tool assigns its own version timestamp at execution time, so the ledger version will not equal the filename timestamp. That drift is expected and correct — the ledger records *when this database actually ran it*. We will not rename files or write ledger rows to hide it.

**2. Which migrations are historical/bootstrap-only rather than pending?**

Treat as historical (do not re-run) any file whose entire effect is already present in Cloud, and any file that is a bootstrap of an object that later migrations already superseded. From the probe, the whole D3.5/D3.6 defect-close pair and the skill-evidence and calendar-substrate files fall largely in this bucket, while the Aug 23–Sep 8 authority/governance chain (`credit_truth`, `teaching_readiness_gate`, the `module_content_*` chain, the `course_curriculum_completeness` chain, `suyas_academic_year_authority`, `canonical_student_lifecycle_authority`, `verified_learning_reward_boundary`, `financial_authority_boundary`) is genuinely pending. Also historical-only: pure data-backfill files (`backfill_top_university_learning_standards`) — these must be re-evaluated against current data before any replay, because replaying a backfill against a live corpus can overwrite authored content. Backfills are quarantined, not auto-applied.

**3. How do we verify exact post-deployment parity?**

Parity is asserted on the *schema and authority surface*, never on ledger version equality (which cannot match, see above). Gate on: object-existence probe, function signature and `prosecdef`/`search_path` probe, RLS-enabled and policy-count probe per touched table, the database linter, and the existing `supabase/tests/*.test.sql` regression suites plus the CI SQL replay workflow.

## Method (proposed sprint, to run after approval)

**M0 — Freeze and snapshot.** Announce a maintenance window per `docs/runbooks/maintenance-window.md`. Capture a full pre-state inventory (tables, views, functions with signatures, policies, triggers, grants) as a committed baseline artifact.

**M1 — Per-file triage.** For each of the 34 files, classify as `already-applied`, `pending`, `partially-applied`, or `data-backfill/quarantined`, using object probes and body comparison (`pg_get_functiondef` vs file text) rather than filename order. Record the verdict table in `docs/governance/`.

**M2 — Idempotency review.** Every file marked pending is read line by line before execution. Anything that would fail or destroy state on a partially-applied database (bare `CREATE TABLE`, `CREATE POLICY` without a drop, `ALTER TYPE ... ADD VALUE`, unguarded `UPDATE`) is wrapped defensively. Where a wrap changes the SQL text, the applied variant is committed as a **new, forward-only** migration file that cites the original — the original file is never edited, and the ledger is never hand-edited.

**M3 — Ordered application in dependency batches.** Apply through the migration tool, one batch per approval, in this order: (a) financial/credit truth substrate, (b) teaching-readiness and module-content authority chain, (c) course-curriculum completeness chain, (d) SUYAS academic-year authority and rollover compatibility, (e) canonical student lifecycle authority. Each batch stops on first failure; no batch proceeds while the prior batch's verification is red.

**M4 — Verification after each batch.** Re-run the object/function/RLS probes, the linter, and the relevant SQL regression suites. Confirm every new public table has GRANTs, RLS enabled, and at least one policy. Confirm no policy was dropped without replacement and no `SECURITY DEFINER` function lost its pinned `search_path`.

**M5 — Release gates.** Run the full CI suite against the exact SHA, then exit maintenance mode and log a release entry in the operations command center.

## Guardrails (non-negotiable)

- No manual writes to `supabase_migrations.schema_migrations`; no renaming or backdating of historical files.
- No new database, no remix, no destructive replay of data backfills.
- No RLS disabled, no policy weakened, no security definer left unpinned, no CI gate skipped or set to `continue-on-error` to get green.
- Every executed statement lands through the migration tool so it is recorded and auditable.

## Technical notes

- Ledger/filename divergence is permanent for this project and should be documented once in `docs/governance/` so future audits do not read it as corruption.
- The CI SQL replay workflow builds from files, so it will exercise the full 241-file chain on an empty database while Cloud runs the reconciled subset. Both must stay green; if a file is quarantined as backfill-only on Cloud, CI must still replay it cleanly, which is the reason quarantined files stay in the repo untouched.
- Recommended immediate read-only deliverable before any write: the M1 verdict table for all 34 files, so the pending set is agreed before a single statement executes.
