# Migration Parity Verdict — 2026-09-08

Read-only forensic triage of the 34 repository migration files that sort after the
Lovable Cloud ledger's last recorded version (`20260725124701`).

## Ledger facts

- `supabase_migrations.schema_migrations`: 193 rows, `20251006060308` … `20260725124701`.
- Repository: 241 migration files; 34 sort after the ledger head.
- Zero ledger rows at or after `20260726`.

Ledger versions are assigned when this database actually executes SQL. Because much of the
project's SQL historically reached Cloud through chat migrations, ledger versions and
repository filenames diverge permanently. **This is expected and must not be "repaired".**
No row of `schema_migrations` is ever written or edited by hand.

## Verdict table

Legend: `PENDING` = apply, `APPLIED` = objects already present (re-run is a safe
`CREATE OR REPLACE` re-affirmation), `QUARANTINED` = never replay on Cloud.

| # | File | Verdict | Evidence |
|---|------|---------|----------|
| 1 | 20260726180000_sprint_d3_5_close_defects | APPLIED | `assert_not_maintenance`, `ops_log_write`, `workload_propose_assignment`, `workload_submit_proposals` all present |
| 2 | 20260726180100_sprint_d3_6_close_defects | PARTIAL | `can_attest_skill_for` absent; `record_skill_evidence`, `recompute_student_skill_mastery` present |
| 3 | 20260803090000_backfill_top_university_learning_standards | **QUARANTINED** | Pure DML that writes generated scaffold outcomes/objectives over live authored content. Later authority code (`is_generated_course_outcome_scaffold`) exists specifically to detect this pattern. Replaying it on the live 1,560-course corpus would manufacture false evidence of authored curriculum. |
| 4 | 20260803120000_enforce_enrolled_course_content_access | PENDING | RLS tightening on course content; fully guarded with `DROP POLICY IF EXISTS` |
| 5 | 20260823093000_lock_credential_issuance | PENDING | credential issuance lock |
| 6 | 20260823094000_verified_course_completion | PENDING | `get_verified_course_completion` absent |
| 7 | 20260823205500_verified_learning_truth_boundary | PENDING | mastery/activity RLS boundary |
| 8 | 20260823213000_verified_learning_reward_boundary | PENDING | `verified_learning_rewards` table absent |
| 9 | 20260823214500_quiz_question_bank_isolation | PENDING | question-bank read isolation |
| 10 | 20260823220000_learning_brain_v1 | PENDING | `get_student_learning_state` absent |
| 11 | 20260828150000_lock_scrollcoin_spending_identity | PENDING | hardens existing `spend_scrollcoin` |
| 12 | 20260828151500_retire_learning_currency | PENDING | currency retirement |
| 13 | 20260828160000_launch_academic_authority_boundary | APPLIED | `enforce_enrollment_progress_authority` present; re-affirm |
| 14 | 20260828163000_launch_financial_authority_boundary | PENDING | `stripe_webhook_events` absent |
| 15 | 20260828170500_signup_provisioning_without_learning_currency | PENDING | rewrites `handle_new_user` |
| 16 | 20260828193000_live_skill_evidence_authority_boundary | PENDING | hardens `record_skill_evidence` |
| 17 | 20260828201500_launch_role_authority_boundary | PENDING | hardens `has_role` / `user_roles` |
| 18 | 20260828203000_launch_maintenance_authority_boundary | APPLIED | both functions present; re-affirm |
| 19 | 20260828204500_launch_operational_invariants | APPLIED | `log_profile_creation` present; re-affirm |
| 20 | 20260828210000_launch_storage_authority_boundary | PENDING | storage/object ownership policies |
| 21 | 20260907100000_scrolluniversity_credit_truth | PENDING | `academic_workload_benchmarks` absent |
| 22 | 20260907101000_course_teaching_readiness_gate | PENDING | `course_teaching_readiness`, `v_course_teaching_readiness` absent |
| 23 | 20260907102000_module_quiz_attempt_authority | PENDING | `module_quiz_attempt_policy` absent |
| 24 | 20260907102500_module_ai_provenance_compatibility | PENDING | column compatibility shim |
| 25 | 20260907103000_module_content_review_authority | PENDING | `module_content_versions`, `content_quality_reviews` absent |
| 26 | 20260907104000_module_content_authority_hardening | PENDING | depends on 25 |
| 27 | 20260907104100_module_content_state_fail_closed | PENDING | depends on 26 |
| 28 | 20260907113000_course_curriculum_completeness_authority | PENDING | `course_curriculum_completeness` absent |
| 29 | 20260907113100_course_curriculum_completeness_hardening | PENDING | depends on 28 |
| 30 | 20260907113200_course_curriculum_invoker_privilege_fix | PENDING | depends on 29 |
| 31 | 20260907175900_suyas_calendar_substrate_reconciliation | PENDING | calendar tables exist; file is `IF NOT EXISTS`-guarded reconciliation |
| 32 | 20260907180000_suyas_academic_year_authority | PENDING | `rollover_suyas_term`, year-state triggers absent |
| 33 | 20260907180100_suyas_rollover_compatibility | PENDING | `rollover_term` alias absent |
| 34 | 20260908071000_canonical_student_lifecycle_authority | PENDING | `complete_student_matriculation` absent |

## Application batches

1. **B1** — 2, 4 (skill-evidence completion + content-access RLS)
2. **B2** — 5–12 (verified learning + currency truth)
3. **B3** — 13–20 (launch authority boundaries)
4. **B4** — 21–24 (credit truth, teaching readiness, quiz authority)
5. **B5** — 25–27 (module content authority chain)
6. **B6** — 28–30 (course curriculum completeness chain)
7. **B7** — 31–33 (SUYAS academic year authority)
8. **B8** — 34 (canonical student lifecycle authority)

File 1 is a no-op re-affirmation and is folded into B1. File 3 is never applied to Cloud;
it remains in the repository untouched so the CI replay chain stays complete.

## Verification after each batch

- object/function/view existence probe for that batch's objects
- RLS enabled + policy count on every touched table
- `SECURITY DEFINER` functions retain a pinned `search_path`
- database linter clean of new findings
- relevant `supabase/tests/*.test.sql` suites green

## Guardrails

No manual ledger edits, no file renames or backdating, no new database, no remix,
no RLS disabled, no CI gate weakened, no destructive backfill replay.
