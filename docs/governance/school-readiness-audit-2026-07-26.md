# ScrollUniversity — School-Readiness Audit

**Date:** 2026-07-26
**Baseline commit:** `86ebd94` on `main`
**CI:** Backend SQL Test Suite ✅ · Production Deployment ✅
**Reviewer:** Governance / operational readiness pass, structural (not staff-shadowed)

---

## Verdict in one sentence

The **operational spine** (D1–D3.4 + Lovable's D3.5/D3.6 schemas) is production-grade and CI-defended; the **student, registrar, finance, and admissions workflows** that a real school needs to *run day-to-day* are still mostly UI stubs or unwired surfaces. The system is ready for a **narrow faculty pilot** (grade a section, hold office hours, roll a term) but **not yet ready to enroll a real cohort end-to-end**.

Traffic-light summary:

| Domain                          | State | Blocking gap |
|--------------------------------|:----:|--------------|
| Operations foundation (D1)      | 🟢 | — |
| Admin ops center (D2 + D2.1)    | 🟢 | — |
| Faculty term rollover (D3.1)    | 🟢 | — |
| Faculty analytics (D3.2)        | 🟢 | — |
| Faculty office hours (D3.3)     | 🟢 | — |
| Faculty gradebook spine (D3.4.1)| 🟢 | Rubric editor + AI grade-assist still deferred |
| Workload planner (D3.5)         | 🟡 | Shipped without SQL regression suite |
| Skill taxonomy (D3.6)           | 🟡 | Shipped without SQL regression suite |
| **Student enrollment loop**     | 🔴 | No verified end-to-end wired to Supabase |
| **Registrar operations (D4)**   | 🔴 | Never delivered as a vertical slice |
| **Bursar / finance**            | 🔴 | UI stub; no receivables engine |
| **Admissions decisions**        | 🔴 | Applicant flow exists; decisioning + letters unverified |
| **Transcript integrity**        | 🟡 | RPC exists; no admin-facing freeze/unfreeze workflow |
| **AI governance**               | 🟢 | `ai_output_log` contract enforced across quiz, prescreen, remediation |
| **Data protection / FERPA**     | 🟡 | RLS strong; retention policy + DSAR flow missing |
| **Backup / DR**                 | 🟢 | Runbook + drill tables + CI advisory |
| **Compliance documentation**    | 🟡 | Runbooks exist; ADRs are one; no accessibility audit |

---

## 1. What is genuinely ready

### 1.1 Academic spine + operational substrate
- **207 migrations, 8 blocking SQL suites** covering academic spine, lifecycle behavior, lifecycle invariants, executive scope isolation, term rollover, faculty analytics KPIs, faculty office hours, faculty gradebook — every merge to `main` gates on all of them.
- **`ops_log` + `incident_log` + `background_job_runs` + `queue_health_snapshots` + `release_events` + `backup_verifications` + `restore_drills`** — the plumbing for a real ops team is in place.
- **11 versioned KPI views** exposed through a single `kpi-service` edge function (envelope v1). Views are `security_invoker=on`, aggregate-only, no PII.
- **Maintenance mode** with `assert_not_maintenance()` guard threaded through every write-side RPC in D3.1–D3.6.
- **Correlated audit** (`correlation_id`) across bulk operations, verified in tests.

### 1.2 Admin operations center (`/admin/ops`)
- Incidents (Sev1–Sev4 lifecycle with postmortem URL), Maintenance banner, Background jobs, Queues, Releases, Backups, Restores, Runbooks, Term Rollover — all live and wired.
- Runbook set: maintenance-window, sev1-incident-response, backup-verification, release-rollback.
- ADR-0001 written. No ADR-0002 yet — every subsequent sprint has been logged in `docs/governance/sprint-log.md` and Lovable's `sprint-d3.5-*.md` / `sprint-d3.6-*.md`.

### 1.3 Faculty core loop
- **Term rollover**: `clone_section_for_term`, `rollover_term` — transactional, audited, admin UI in the Ops Center.
- **Analytics**: `FacultyAnalytics` consumes `kpi-service` (`vw_kpi_*` views), no client-side aggregation.
- **Office hours**: separate `faculty_office_hours` + `faculty_office_hour_slots` tables (not conflated with AI-tutor), full RLS, 4 RPCs (book, cancel-by-student, cancel-by-faculty, walk-in), 16 blocking tests.
- **Gradebook spine (D3.4.1)**: `gradebook_publish_grades` wrapper RPC preserves the "single grade-write path" invariant (every row still routes through the existing `submit_course_grade`), atomic-per-batch with a shared correlation_id in `ops_log`. 12 blocking tests.

### 1.4 Frontend deploy path
- Vite build ≤ 45 s; tsc clean at `86ebd94`; type generation from Supabase up to date.
- Lovable deploys `main` on push. Production deploy workflow gates on tsc + build + Trivy + advisory Snyk.

### 1.5 Secret hygiene
- `.env` untracked; `supabase.exe` untracked; ebooks untracked (Phase 1). CVE-2024-55565 nanoid patched via npm override.

---

## 2. What is shipped but not yet fully load-bearing

### 2.1 D3.5 — Faculty Workload Planner (Lovable, `20260630100943_ef27d904...sql`)
Ships a six-dimensional workload model, `faculty_workload_policies`, and a 507-line `FacultyWorkloadPlanner.tsx`. **Missing:**
- No `supabase/tests/faculty_workload_planner.test.sql` — nothing gates a schema regression on it.
- Neither `backend-sql-tests.yml` nor `production-deploy.yml` runs a blocking test step for it.
- Not linked in `sprint-log.md`; the sprint spec `sprint-d3.5-workload-planner.md` exists but there is no exit checklist entry.
- Every other D-sprint added a matching test file. This one didn't.

**Risk:** a future migration silently regresses the workload constraints.
**Action:** write a minimum blocking suite (function signatures + policy CHECK expressions + basic append-only-proposal invariant) before treating D3.5 as closed.

### 2.2 D3.6 — Skill Taxonomy (Lovable, `20260725124701_3d14a237...sql`)
Adds versioning to `skills_catalog`, five new mapping/attestation tables, and skill-profile frontend (`useSkillProfile`, `skillEvidence`). **Missing:**
- Same as D3.5: no test suite, no CI step, no exit checklist entry in `sprint-log.md`.
- `is_current` versioning is enforced by a partial unique index (good), but the transition RPC (deprecate one version, activate next) is not visible — needs at minimum a documented mutation path.

**Risk:** dual "current" skill versions could slip through if the transition is done outside a single transaction.
**Action:** write the migration path RPC + a 6-test suite before student-facing skill attestation goes live.

### 2.3 D3.4 deferrals still open
- **D3.4.2** — rubric editor UI + `AssessmentEditor` CRUD + `rubric_compute_total` RPC.
- **D3.4.3** — AI grade-assist suggestions writing to `ai_output_log` with `human_review_required=true` (faculty approval before any grade write).
- **D3.4.4** — student-facing feedback view.

Rubric tables ship with an intentionally-restrictive `admin_only_direct` write policy; nothing regresses if these deferrals stay open, but faculty cannot yet score with rubrics from the UI.

---

## 3. Blocking gaps for a real school

These are what would prevent a real institution from actually operating on the system today.

### 3.1 🔴 Student enrollment loop is not verified end-to-end
Pages exist (`Apply.tsx`, `AdmissionsReview.tsx`, `Matriculation.tsx`, `CourseRegistration.tsx`) and edge functions exist (`admissions-automation`, `applicant-ai-prescreen`, `generate-admission-letter`, `cohort-onboard`). What is **not** verified anywhere in the SQL test suite:
- Application → decision → admit letter → matriculation → active-student → course-registration is a single covered pathway.
- The transition from `applicants` → `students` and role assignment is not gated by a blocking test.
- No integration test proves a registered student can actually see their course sections after registration.

A real cohort walk-through by staff — enrolling 5 test students end-to-end, in the deployed environment, screen-recorded — is the missing piece. Everything downstream (grading, transcripts, alumni) assumes this loop works.

### 3.2 🔴 Registrar operations (D4) never delivered
`RegistrarStandingDashboard.tsx` is 67 lines. `RegistrationAdmin.tsx` is 150. No sprint slice was ever taken for registrar workflows:
- Add/drop with deadline enforcement.
- Course-repeat / withdrawal policy application (repeat replaces vs. averages).
- Advisor holds / registration blocks.
- Graduation clearance workflow (D3 sprint spec mentioned it; no delivery).
- Transcript request + delivery (`generate-transcript` edge fn exists but is not linked to a queued-request table with SLA).

### 3.3 🔴 Bursar / receivables engine is a stub
`BursarAdmin.tsx` (202 lines) and `BillingDashboard.tsx` (211 lines) render but the underlying tables/RPCs to produce a tuition statement, apply a scholarship, record a payment, or issue a refund are not visible in the tested surface. `stripe-webhook` edge fn exists (JWT-off by design) — the reconciliation logic on the DB side isn't covered by any test suite. Without this, a real school cannot **charge tuition and reconcile it**.

### 3.4 🔴 Admissions decisioning is unverified
`applicant-ai-prescreen` writes to `ai_output_log` with `human_review_required=true` (good). `admissions-automation` exists. But no test covers:
- A prescreen result cannot be promoted to an admit decision without a human reviewer sign-off.
- Rejection letters produce identical audit rows.
- Decision reversal is possible before matriculation.

### 3.5 🟡 Transcript integrity — RPC without UI
`freeze_transcript` / grade-immutability logic exists in the academic engine (`submit_course_grade` respects the "finalized" flag). No admin-facing UI to freeze/unfreeze a specific term's transcripts. Without it, the "finalize a term" ceremony after the rollover has no button attached to it.

### 3.6 🟡 Real-time messaging + moderation
`RealTimeMessaging.tsx`, `Messaging.tsx`, `CommunityFeed.tsx`, `StudyGroups.tsx` exist. `ModerationQueue` was fixed for TS in Phase 2. There is no test that a reported message actually reaches the moderation queue, and no runbook for handling a reported case. For a school with under-18 users (many divinity-school programs are joint-enrolled with high-school seniors), this is a real gap.

### 3.7 🟡 FERPA/GDPR readiness
- ✅ RLS is enforced pervasively; `has_role` is the single source of truth; JWT is verified on 29/34 edge functions.
- ❌ No documented retention policy (how long do we keep `ops_log`, `ai_output_log`, `messaging` rows?).
- ❌ No DSAR (data-subject access request) flow — a student cannot today ask for a copy of everything the platform has about them via a UI.
- ❌ No documented lawful basis for AI outputs used in admissions/grading (D3.4.3 will need this when it lands).

### 3.8 🟡 Accessibility
No visible axe or Lighthouse CI step; no ARIA regression tests. For a public-facing university with anti-discrimination obligations, this is table stakes and unmet.

---

## 4. Governance hygiene

- ✅ 8 blocking SQL suites, one advisory (program-transfer governance).
- ✅ Every D-sprint has an exit checklist in `sprint-log.md` — **except D3.5 and D3.6**, which Lovable added directly without going through the checklist gate.
- ✅ Runbook set covers the critical incident types.
- ⚠️ Only one ADR (`0001-operations-foundation-and-kpi-envelope`) — D3.1's transactional term-rollover model and D3.4's "single grade-write path" invariant deserve their own ADRs so the invariant survives contributor turnover.
- ⚠️ No `CODEOWNERS`; no branch protection rules visible; direct pushes to `main` happen (Lovable does this by design; humans should not).
- ⚠️ 5 edge functions skip JWT verification. 3 are legitimately webhook/cron (`auth-email-hook`, `stripe-webhook`, `daily-analytics-rollup`, `notification-worker`, `assignment-notifier`). 2 warrant a second look: **`kpi-service`** (read-only aggregate KPIs — probably fine, but should confirm) and **`lecturer-session-patch`** (writes to session state — this needs JWT verification on).

---

## 5. Surface area risk

- **233 pages, 301 routes, 49 edge functions.** 30 admin/faculty/registrar/executive pages contain a `TODO` / `FIXME` / `placeholder` marker.
- The system has been **breadth-first for a long time**. The D2/D3 sprints have been **depth-first** on specific verticals. This is the right correction, but the residual breadth still costs: every stub page is a maintenance surface and a support-ticket vector.
- Recommendation: **retire (route to a "not yet available" screen) every page that isn't in the D-sprint delivery matrix**, rather than leaving them navigable. A user finding a half-built page is worse for trust than not finding it at all.

---

## 6. Recommended next 4 sprints (in order)

1. **D3.5-close + D3.6-close** (small): write the missing test suites and CI steps, then log the exit checklists in `sprint-log.md`. Non-negotiable before anything else — otherwise this becomes a norm.
2. **D4.1 — Registrar core**: add/drop deadlines, advisor holds, withdrawal/repeat policy, graduation clearance. This is the biggest single gap.
3. **D4.2 — Student enrollment E2E**: one covered pathway from application → admit → matriculate → register. Ends with a Playwright smoke of the full path in CI.
4. **D5.1 — Bursar receivables**: tuition statement, scholarship application, payment record, refund, Stripe reconciliation. Only after this is a real charge-and-collect possible.

D3.4.2/.3/.4 (rubrics + AI grade-assist + student feedback view) can slot in parallel with D4 — they don't block a pilot.

---

## 7. Verdict

- **Faculty pilot with a friendly cohort**: **ready today** (D3.1–D3.4 spine + Ops Center + Analytics).
- **Full-institution enrollment/registrar/finance**: **not ready** — D4 and D5 have not begun, and the enrollment loop is unverified end-to-end.
- **AI-in-grading (D3.4.3)**: architecturally set up correctly (`ai_output_log` with `human_review_required`) but the UI has not yet been shipped.
- **Deploy plumbing, tests, runbooks, RLS, audit**: **strong** — this is the most defensible part of the codebase and the reason a narrow pilot is safe.

The path to "complete school readiness" is well-scoped, small in count, and clearly ordered above. The invariants that make a live pilot safe are already in place. The remaining work is workflow depth, not architectural refactor.
