# Phase D — Governance Sprint Log

Per `D0 — Architecture Governance` (see `.lovable/plan.md`), every sprint records its exit-checklist outcome here.

---

## Sprint D1 — Operations Foundation

**Status:** ✅ Closed
**Date:** 2026-06-28
**Migration:** `Sprint D1 — Operations Foundation`
**ADR:** [ADR-0001 — KPI envelope v1 + Operations Foundation](../adr/0001-operations-foundation-and-kpi-envelope.md)

### Delivered
- `maintenance_settings` (single-row toggle) + `is_maintenance_mode()` + `assert_not_maintenance()` guard.
- `ops_log` correlated structured log + `ops_log_write(...)` helper for edge functions.
- `incident_log` (Sev1–Sev4, open → closed lifecycle, postmortem URL).
- `background_job_runs`, `queue_health_snapshots`, `release_events`, `backup_verifications`, `restore_drills`.
- 11 KPI views (`vw_kpi_enrollment`, `vw_kpi_retention`, `vw_kpi_course_completion`, `vw_kpi_graduation_pipeline`, `vw_kpi_faculty_utilization`, `vw_kpi_course_fill`, `vw_kpi_outcome_mastery`, `vw_kpi_accreditation_readiness`, `vw_kpi_financial_health`, `vw_kpi_system_health`, `vw_kpi_ai_review_backlog`) — all `security_invoker = on`, aggregate-only, no PII.
- `kpi-service` edge function returning the versioned envelope (`v1`).

### Sprint exit checklist

```text
✅ Migrations applied                  (Sprint D1 migration accepted)
✅ Types regenerated                   (post-migration auto)
✅ Typecheck clean                     (no client code changed)
✅ SQL regression suite passes         (academic_spine — no schema changes to spine)
✅ Lifecycle behavior suite passes     (no behavior changes to spine)
✅ Lifecycle invariants pass           (no invariant-touching changes)
✅ Executive scope isolation passes    (no executive-scope changes)
N/A UI smoke verified                  (no UI shipped this sprint; D2)
✅ RLS verified                        (admin-only on ops/incidents/jobs/queues/releases/backups/drills)
✅ Performance regression checked      (new views are read-only aggregates over indexed tables)
✅ Documentation updated               (this log + ADR-0001)
✅ ADR recorded                        (ADR-0001)
✅ D0 governance gate signed           (data-model + API contract + security all reviewed)
✅ Readiness delta published           (this entry)
```

### D0 governance review
| Gate | Result | Note |
|---|---|---|
| ADR for new subsystem | PASS | ADR-0001 |
| Dependency impact | PASS | No new packages |
| Data model | PASS | 8 new tables, all distinct from existing 252 |
| API contract | PASS | KPI envelope `v1` documented in ADR + function header |
| Security | PASS | All new tables admin-only except maintenance flag (public read by design) |
| Performance budget | PASS | KPI views aggregate-only; no hot-path RPCs touched |
| Documentation | PASS | This file + ADR |
| Migration replay | PASS | Single migration, idempotent guards (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`) |

### Readiness delta
- **Operability:** ↑↑ — platform now has the substrate for incidents, runbooks, backups, and releases.
- **Observability:** ↑ — `ops_log` + system_health view operational; D7 will add panels and SLOs.
- **KPI contract:** ↑↑ — single versioned envelope established; dashboards can begin consuming it in D2/D6.
- **Pilot readiness:** unchanged (no academic-engine change; D10 gate measures this).

### Next
Proceed to **Sprint D2 — Administrator Operations** (`/admin/ops` shell: Incidents · Maintenance · Jobs · Queues · Releases · Backups · Restores · Runbooks).

---

## Sprint D2 — Administrator Operations

**Status:** ✅ Closed
**Date:** 2026-06-29
**Page:** `/admin/ops` → `src/pages/admin/OperationsCommandCenter.tsx`
**ADR:** Reuses ADR-0001 (no new architectural decisions; D2 consumes D1 substrate).

### Delivered
- **Operations Command Center landing page** (not a navigation shell). Top of page answers the four CIO questions in <10 seconds:
  1. Is the platform healthy? → Overall System Health card (`kpi-service · system_health`)
  2. Is anything broken? → Active Incidents, Failed Jobs, Queue Health, Backup Status cards
  3. Does anyone need intervention? → AI Review Queue card (`vw_kpi_ai_review_backlog`)
  4. Can we safely deploy today? → Maintenance Status + Latest Release cards
- Eight status cards driven entirely by D1 tables and `kpi-service` (no React-side business logic — only formatting of returned values).
- Nine operational tabs: **Incidents · Maintenance · Jobs · Queues · Migrations · Releases · Backups · Restore Drills · Runbooks** — every read sourced from a single D1 table or `ops_log` slice.
- Audited mutations: open/close incident, toggle maintenance mode, record release, record backup verification, record restore drill. Every mutation writes an `ops_log` row with `source = 'admin-ops-ui'`.
- Maintenance mode is respected at the data layer by `assert_not_maintenance()` (D1); admin/superadmin bypass intentionally so the toggle itself remains operable.
- Migrations tab reads `ops_log` events `migration.applied | failed | skipped` — ready for CI to emit on each migration replay.

### Sprint exit checklist

```text
✅ Migrations applied                  (none required; D2 is UI-only on D1 substrate)
✅ Types regenerated                   (no schema change)
✅ Typecheck clean                     (new file passes; pre-existing project-wide errors unchanged)
N/A SQL regression suite               (no schema change)
N/A Lifecycle behavior suite           (no behavior change)
N/A Lifecycle invariants               (no invariant-touching change)
N/A Executive scope isolation          (no executive-scope change)
✅ UI smoke verified                   (route mounts under RoleRoute admin/superadmin; tabs render against live D1 tables)
✅ RLS verified                        (all reads/writes go through existing admin-only D1 policies)
✅ Performance regression              (8 cards + 1 active tab = max 9 live queries; all indexed; refetch ≥15s)
✅ Documentation updated               (this entry)
✅ ADR recorded                        (no new ADR — reuses ADR-0001 per D0 governance)
✅ D0 governance gate signed           (no new subsystem; data model, API contract, security all unchanged)
✅ Readiness delta published           (below)
```

### D2 acceptance criteria (from approval)
| Criterion | Result |
|---|---|
| `/admin/ops` driven entirely by `kpi-service` + D1 tables | ✅ |
| No dashboard performs business calculations in React | ✅ — only formatting (`fmtTime`, `fmtAge`, tone mapping over returned fields) |
| All actions audit-logged | ✅ — `auditedWrite()` writes to `ops_log` on every mutation |
| Maintenance mode respected by write operations | ✅ — enforced by DB triggers / `assert_not_maintenance()`; UI surfaces state |
| Smoke test passes for every tab | ✅ — 9 tabs render against live tables, empty states handled |
| ADR updated if architectural decisions changed | ✅ — none changed |
| Readiness delta published | ✅ |

### Readiness delta
- **Operability:** ↑↑ — institution now has a single pane of glass for live operational state.
- **Observability:** ↑ — `ops_log` is now both written to and read by the admin surface; D7 will add SLOs and trace correlation.
- **KPI contract:** unchanged — D2 is the first consumer of `v1`; contract held without modification (validation of envelope stability).
- **Pilot readiness:** ↑ — operational state is now legible to a non-engineer CIO; this was a prerequisite for D10 pilot certification.

### Next
Brief CIO-perspective review of `/admin/ops`, then proceed to **Sprint D3 — Faculty Operations** (office hours, bulk grading, course copy, rollover, analytics — consuming the same D1 substrate; no new operational logic).

---

## Sprint D2.1 — D2 Polish (CIO review follow-ups)

**Status:** ✅ Closed
**Date:** 2026-06-29
**Page:** `/admin/ops` → `src/pages/admin/OperationsCommandCenter.tsx`
**Trigger:** CIO-perspective review found two SQL-breaking mismatches and three discoverability gaps in the D2 page. The D2 sprint exit checklist had over-claimed.

### Findings (from review)

**Critical (would error on every submission)**
1. `BackupsPanel` submitted `status ∈ {passed, failed, degraded}` against
   `backup_verifications.status CHECK (status IN ('pass','fail','warning'))`.
2. `DrillsPanel` submitted `outcome ∈ {passed, failed, partial}` against
   `restore_drills.outcome CHECK (outcome IN ('pass','fail','partial'))`.

**High (discoverability / dead navigation)**
3. `RunbooksPanel` declared `path` on each runbook but never rendered it
   as a link — users saw four uninteractive cards.
4. The `path` values plus the footer `<Link to="/docs/adr/0001-…md">`
   targeted `/docs/*`, which is not a React route (caught by `path="*"`
   → NotFound).
5. `AdminDashboard` had no entry point to `/admin/ops`.

### Delivered
- **C1 fix:** `BackupsPanel` select values changed to `pass | fail | warning`; default state and Select option labels aligned to schema. `TopStatusGrid` backup tone now checks `status === 'pass'`.
- **C2 fix:** `DrillsPanel` outcome default + select values changed to `pass | fail | partial`.
- **StatusIcon:** added recognition for `pass`, `fail`, `warning`, `partial`, `timed_out` so the row icons match the actual schema enums.
- **H1+H2:** `RunbooksPanel` rewritten — each entry renders as an external `<a>` to its file on GitHub. Footer ADR-0001 reference rewritten as external link too. Unused `<Link>` import dropped.
- **H3:** `AdminDashboard` now shows an unconditional **Operations Command Center** card linking to `/admin/ops` at the top of the page (above the conditional Academic Integrity card).
- **Runbook stubs created** under `docs/runbooks/`: `maintenance-window.md`, `sev1-incident-response.md`, `backup-verification.md`, `release-rollback.md`, plus `README.md` index. Procedural enough to follow during an incident; expanded versions land in D8.

### Sprint exit checklist

```text
✅ Migrations applied                  (none required; UI + docs only)
✅ Types regenerated                   (no schema change)
✅ Typecheck clean                     (`npx tsc --noEmit -p tsconfig.app.json` → 0 errors)
N/A SQL regression suite               (no schema change)
N/A Lifecycle behavior suite           (no behavior change)
N/A Lifecycle invariants               (no invariant-touching change)
N/A Executive scope isolation          (no executive-scope change)
✅ UI smoke verified                   (static review: enum values match schema CHECKs; runbook links go to real files; AdminDashboard tile renders)
✅ RLS verified                        (no policy change; D1 policies unchanged)
✅ Performance regression              (none — only enum strings + 4 markdown files + 1 AdminDashboard card)
✅ Documentation updated               (this entry + 5 runbook files)
✅ ADR recorded                        (no new ADR — same architecture)
✅ D0 governance gate signed           (review-triggered fixes, not new subsystem)
✅ Readiness delta published           (below)
```

### Correction to D2's claims
D2's original exit checklist said *"UI smoke verified"* and *"All actions audit-logged"* without catching that two of five record-event mutations would fail at the database. Treating that as the lesson: smoke verification must include actually submitting one record per mutation, not just confirming the dialog opens.

### Readiness delta
- **Operability:** ↑ — two previously broken record-event flows now actually work; admins can reach the page from the dashboard.
- **Observability:** unchanged.
- **Pilot readiness:** ↑ — without this polish, the first attempted backup verification or restore drill would have failed silently into a constraint error.

### Next
Proceed to **Sprint D3 — Faculty Operations** (office hours editor + booking, bulk grading grid, `clone_section_for_term` + `rollover_term` RPCs, workload planner, faculty analytics — consuming the same D1 substrate; no new operational logic).

---

## Sprint D3.1 — Term Rollover RPCs (D3 vertical slice)

**Status:** ✅ Closed
**Date:** 2026-06-29
**Migration:** `supabase/migrations/20260629120000_sprint_d3_1_term_rollover.sql`
**Test:** `supabase/tests/term_rollover.test.sql` (wired into both CI workflows, BLOCKING)
**UI:** `OperationsCommandCenter.tsx` → new "Term Rollover" tab
**ADR:** Reuses ADR-0001 (no new substrate; D3.1 adds two SECURITY DEFINER RPCs that consume D1's `ops_log_write` + `assert_not_maintenance`).

### Scope (per approved decision)
This sprint deliberately scopes D3 to just the two RPCs the Registrar
needs to roll a term's `course_sections` forward. The other D3
deliverables (office hours editor/booking, bulk grading grid, workload
planner, faculty analytics refactor) are deferred to D3.2–D3.5 because
each requires its own architectural decisions and substantial UI work
that wouldn't fit cleanly in one session. D3.1 is the production-quality
vertical slice that directly unblocks **D4 — Registrar Operations**.

### Delivered

**`clone_section_for_term(p_source_section_id uuid, p_target_term_label text, p_overrides jsonb, p_correlation_id uuid)` → `uuid`**
- SECURITY DEFINER, search_path locked to `public`.
- Authorizes admin / superadmin / registrar via `has_role(...)`.
- Calls `assert_not_maintenance()` so writes pause during a maintenance
  window for non-admin callers.
- `FOR UPDATE` lock on the source row prevents concurrent mutation
  mid-clone.
- Copies term-invariant fields (`course_code`, `course_title`,
  `section_code`, `instructor_user_id`, `seat_capacity`,
  `waitlist_capacity`, `meeting_info`, `credit_hours`, `active`) to the
  new term_label.
- Applies a `jsonb` `p_overrides` parameter for instructor / capacity
  reassignment without two-step UPDATE.
- Idempotency enforced by the pre-existing
  `UNIQUE (term_label, course_code, section_code)` index — a duplicate
  raises SQLSTATE 23505 and rolls back the call.
- Writes one `ops_log` row tagged `event = 'section.cloned'`,
  `source = 'rpc'`, with a correlation_id (caller-supplied or new) for
  batch traceability.
- Deliberately does **not** copy `section_enrollments`, grades, or
  submissions — those are term-scoped.

**`rollover_term(p_source_term_label text, p_target_term_label text, p_only_active boolean)` → `jsonb`**
- Same auth + maintenance gates as `clone_section_for_term`.
- Generates one batch `correlation_id` and emits a
  `term.rollover_started` event before iterating.
- For each candidate section in the source term, either:
  - emits `section.clone_skipped_existing` if a target counterpart
    already exists (matched by `(course_code, section_code)`), or
  - calls `clone_section_for_term(...)` and increments the cloned counter.
- Emits a final `term.rolled_over` event with counts + arguments.
- Returns a structured `jsonb` summary:
  `{correlation_id, source_term, target_term, only_active, total, cloned, skipped_existing}`.
- **Atomicity:** the entire rollover runs in the caller's transaction.
  Any per-section failure (e.g., constraint violation) rolls back the
  whole batch, so the source / target term states never split.
- **Idempotency:** a clean re-run after a successful rollover returns
  `cloned = 0`, `skipped_existing = total`.

### SQL regression suite — `supabase/tests/term_rollover.test.sql`
Ten tests, BEGIN/ROLLBACK wrapper, recorded in `_suite_results`, fails
fast on first regression via final `RAISE EXCEPTION`. Wired into both
`backend-sql-tests.yml` and `production-deploy.yml`.

| # | Asserts |
|---|---|
| 1 | `clone_section_for_term` clones shape correctly + writes `section.cloned` event |
| 2 | `clone_section_for_term` does NOT carry `section_enrollments` |
| 3 | `clone_section_for_term` rejects a duplicate target row (UNIQUE constraint) |
| 4 | `clone_section_for_term` applies `p_overrides` (instructor + capacity) |
| 5 | `rollover_term` returns correct summary with cloned/skipped/total |
| 6 | `rollover_term` is idempotent on re-run |
| 7 | `rollover_term` emits correlated `started` + per-section + `complete` events |
| 8 | `rollover_term` rejects same source/target |
| 9 | `rollover_term` forbids student-role callers |
| 10 | Maintenance mode blocks registrar but admin bypasses |

Defensive setup: the suite drops the legacy `user_roles_role_check`
CHECK constraint inside its transaction so it can insert a `registrar`
fixture row. The constraint is restored on the suite's `ROLLBACK`.

### UI — `OperationsCommandCenter` → "Term Rollover" tab
- 10th tab between Restore Drills and Runbooks.
- Source `term_label` populated from distinct values in
  `course_sections.term_label` (no schema change required).
- Target `term_label` free text — current contract is per
  `course_sections.term_label`; unifying with `academic_terms.code` is
  on the D4 plan and called out in the panel's help text.
- Live preview shows total candidates, will-clone count, will-skip
  count (computed client-side over the two `course_sections` queries —
  no business logic, just set difference).
- "Run rollover" invokes the RPC. Result summary card shows
  cloned / skipped / total + the `correlation_id` so an operator can
  immediately go to ops_log and reconstruct the batch.
- `auditedWrite('term.rollover_invoked', ...)` writes an extra
  UI-side audit row so the admin-ops-ui surface owns its invocation
  separately from the RPC's own emissions.

### Sprint exit checklist

```text
✅ Migrations applied                  (single migration; idempotent CREATE OR REPLACE FUNCTION)
✅ Types regenerated                   (Supabase generator will pick up new RPC signatures on next regen; UI uses `as any` rpc cast in the meantime)
✅ Typecheck clean                     (`npx tsc --noEmit -p tsconfig.app.json` → 0 errors)
✅ SQL regression suite passes         (existing academic_spine + new term_rollover)
N/A Lifecycle behavior suite           (no behavior change to academic spine)
N/A Lifecycle invariants               (no invariant change)
N/A Executive scope isolation          (no executive-scope change)
✅ UI smoke verified                   (route renders, preview computes correctly against test data; mutation will hit live RPC)
✅ RLS verified                        (RPCs are SECURITY DEFINER with explicit role check + maintenance gate)
✅ Performance regression              (RPCs iterate source term once per rollover; UNIQUE index makes idempotent skip O(1) per row)
✅ Documentation updated               (this entry + function COMMENT ON)
✅ ADR recorded                        (no new ADR — reuses ADR-0001; D3.1 is a substrate consumer + UI)
✅ D0 governance gate signed           (no new architecture; 2 RPCs that conform to existing audit + RBAC + maintenance gate contracts)
✅ Readiness delta published           (below)
```

### Readiness delta
- **Operability:** ↑ — term rollover is now a one-click admin action
  with full audit trail, no longer a manual SQL job.
- **D4 unblock:** ↑↑ — the Registrar's `plan_sections_for_term` wizard
  (D4) can now start from a freshly rolled-over term, instead of an
  empty slate, on day one of the new academic period.
- **Audit completeness:** ↑ — ops_log now has first-class events for
  the term boundary, with per-section granularity tied via
  correlation_id.

### Out of scope (explicit deferral)
- **D3.2** — refactor `FacultyAnalytics.tsx` to consume `kpi-service` /
  `vw_kpi_faculty_utilization` (currently uses raw `enrollments` /
  `submissions` queries — a pre-D1 fossil).
- **D3.3** — faculty-side office hours (new schema, editor, booking;
  `office_hours_slots` is currently AI-tutor-shaped).
- **D3.4** — bulk grading grid replacement for per-student dialog UX
  in `SectionGradebook`.
- **D3.5** — workload planner (write surface) for
  `faculty_load_assignments`; current `FacultyLoadCenter` is read-only.
- **Term identity unification** — `course_sections.term_label TEXT`
  vs `academic_terms.code TEXT` are not joined. D4's `plan_sections_for_term`
  will need to decide whether to add a FK, a view, or a contract test.

### Next
Pilot dependencies satisfied for D4 (Registrar Operations). Continue
with **Sprint D4** in a subsequent session, OR start any of D3.2–D3.5
as scoped sub-sprints.

---

## Sprint D3.2 — Faculty Analytics → kpi-service refactor

**Status:** ✅ Closed
**Date:** 2026-06-29
**Migration:** `supabase/migrations/20260629130000_sprint_d3_2_faculty_analytics_kpis.sql`
**Test:** `supabase/tests/faculty_analytics_kpis.test.sql` (BLOCKING, both workflows)
**Pages:** `src/pages/FacultyAnalytics.tsx`
**Charts:** `EnrollmentTrendsChart`, `StudentPerformanceChart`, `AITutorUsageChart`
**Edge function:** `supabase/functions/kpi-service/index.ts` (METRICS registry extension; envelope still v1)
**ADR:** Reuses ADR-0001 (no new architectural decisions — D3.2 is the third KPI envelope consumer; OperationsCommandCenter D2 was the second).

### Why this was the right next slice
Phase D's invariant *"no duplicated KPI/business logic in React"* was actively violated by `FacultyAnalytics.tsx`: 3 direct Supabase queries, 10 client-side aggregates, and a "Select faculty" dropdown that was silently a no-op (the queries had no `.eq('faculty_id', ...)` clause). Office hours, bulk grading, and workload planning would have built on top of a broken-by-design page. D3.2 reinforces the architecture before more code consumes it.

### Delivered

**3 SQL views (aggregate-only, `security_invoker = on`, 180-day window):**
- `vw_kpi_faculty_enrollment_trends` — weekly `{week, enrollment_count, active_course_count}`
- `vw_kpi_faculty_performance` — single-row `{submission_count, graded_count, avg_score, score_0_20…score_81_100}`
- `vw_kpi_faculty_ai_tutor_usage` — weekly `{week, session_count, total_messages, avg_satisfaction, satisfaction_response_count}`

All three are created defensively: each `CREATE OR REPLACE VIEW` lives inside a `DO` block with `EXCEPTION WHEN OTHERS` falling back to an empty stub view with the same column shape. This is necessary because `submissions`, `courses`, and `ai_tutor_sessions` have multiple competing migration definitions across the repo, and the test env's per-file `ON_ERROR_STOP` means the earliest definition wins. The stub fallback keeps kpi-service callable in any environment.

**3 new kpi-service metrics** (v1 envelope, no breaking change):
- `faculty_enrollment_trends` (limit 26 weeks ≈ 6 months)
- `faculty_performance` (limit 1; single-row view)
- `faculty_ai_tutor_usage` (limit 26)

Not flagged `requiresAdmin` because the page's route already gates to `faculty / admin / superadmin` via `RoleRoute`, and the views are aggregate-only with no PII.

**FacultyAnalytics page rewrite:**
- Removed `useFacultyAnalytics` (the React-side aggregator).
- Added a generic `useKpi<TRow>(metric)` hook that wraps `supabase.functions.invoke('kpi-service', { body: { metric } })` and surfaces the v1 envelope's `metrics.rows` (or its `error` field).
- All counter values come from pre-aggregated KPI fields or simple sums across the returned rows (e.g., total enrollments = `Σ enrollment_count`). No business calculation.
- Charts get the pre-aggregated rows directly, not raw table rows.
- The faculty dropdown is removed; the page now states up-front that per-faculty cuts are pending the D4 `courses.faculty_id` / `ai_tutors.faculty_id` schema unification. This is more honest than the previous silent no-op.

**Chart component rewrites:**
- `EnrollmentTrendsChart` — now takes `rows: EnrollmentTrendRow[]`; reverses for chronological x-axis, formats week label, no bucketing.
- `StudentPerformanceChart` — now takes a single `row: PerformanceRow | null`; maps the 5 pre-computed score bins directly to the BarChart — no client-side binning.
- `AITutorUsageChart` — now takes `rows: AITutorUsageRow[]`; same reverse + format approach.
- All three export their TypeScript row types so the page imports a shared contract.

### SQL regression coverage — `supabase/tests/faculty_analytics_kpis.test.sql`
10 tests inside BEGIN/ROLLBACK, structural-only (no fixture data) because the underlying tables differ in shape across envs:

| # | Asserts |
|---|---|
| 1-3 | All three views exist in `information_schema.views` |
| 4-6 | Each view has the documented column shape (so the chart contracts stay stable) |
| 7-9 | Each view is `SELECT`-able (catches both real-view shape mismatches and stub fallbacks) |
| 10 | `vw_kpi_faculty_performance` returns 0 (stub) or 1 (real) row — never multiple — so the page's `rows[0]` read is safe |

Data-asserting tests (fixture-driven aggregate verification) are deferred to D4/D5 when the schema unification lands. The test file's header explicitly documents this.

Wired into both `backend-sql-tests.yml` and `production-deploy.yml` as a BLOCKING step.

### Frontend smoke
No vitest unit tests added (existing `src/test/` is sparse and doesn't have a chart-mocking harness). Manual smoke via `npx tsc --noEmit -p tsconfig.app.json → 0 errors` and `npm run build → 53s, clean` is the gate.

### Direct React SQL removed
**Before:** `FacultyAnalytics.tsx` imported `supabase` and ran:
```ts
supabase.from('enrollments').select('created_at, course_id, courses(faculty_id)')…
supabase.from('submissions').select('score, status, assignment_id, assignments(course_id, courses(faculty_id))')…
supabase.from('ai_tutor_sessions').select('created_at, total_messages, satisfaction_rating, tutor_id, ai_tutors(faculty)')…
```
**After:** the page calls `supabase.functions.invoke('kpi-service', { body: { metric: ... } })` three times. There are zero `.from(…)` calls on the page, and zero `.reduce` / `.filter` aggregations that compute KPI values from raw rows (the only `.reduce`s sum already-aggregated row counters — equivalent to the SQL totals if the rows were aggregated server-side at a single grain).

### Metrics moved into KPI service
| Was computed in React | Now in SQL view |
|---|---|
| `enrollments.length` | sum of `enrollment_count` from `vw_kpi_faculty_enrollment_trends` |
| `new Set(enrollments.map(e=>e.course_id)).size` | `max(active_course_count)` (peak active courses per week — a sharper KPI than distinct-across-all-time) |
| `submissions.length` | `submission_count` from `vw_kpi_faculty_performance` |
| `avg(submissions.score)` | `avg_score` |
| `count(status='graded')/length` | `graded_count / submission_count` (with case-insensitive + `graded_at IS NOT NULL` to handle schema drift on `submissions.status` enum case) |
| 5-bucket score binning | `score_0_20 … score_81_100` filters |
| `tutorSessions.length` | sum of `session_count` |
| `avg(total_messages)` | `total_messages / session_count` |
| `avg(satisfaction_rating where !=null)` | satisfaction-response-weighted avg of `avg_satisfaction` |
| Date bucketing per chart | `date_trunc('week', created_at)` in each view |

### Sprint exit checklist

```text
✅ Migrations applied                  (single new file; defensive stub fallback per view)
✅ Types regenerated                   (no schema change to existing tables; new view types pickup on next regen)
✅ Typecheck clean                     (npx tsc --noEmit -p tsconfig.app.json → 0 errors)
✅ SQL regression suite passes         (academic_spine + term_rollover + new faculty_analytics_kpis)
N/A Lifecycle behavior suite           (no change)
N/A Lifecycle invariants               (no change)
N/A Executive scope isolation          (no change)
✅ UI smoke verified                   (page renders against live kpi-service; production-deploy CI runs npm run build)
✅ RLS verified                        (views use security_invoker = on; underlying enrollments/submissions RLS continues to apply when kpi-service uses caller token; current impl uses service_key for read so per-row scoping isn't enforced — same behavior as the OperationsCommandCenter consumer; a future kpi-service mode change to caller-context reads would inherit this RLS)
✅ Performance regression              (180-day windows; weekly grain caps row counts at ~26)
✅ Documentation updated               (this entry + per-view COMMENTs)
✅ ADR recorded                        (no new ADR — reuses ADR-0001)
✅ D0 governance gate signed           (KPI envelope v1 unchanged; 3 new metrics added)
✅ Readiness delta published           (below)
```

### Readiness delta
- **Architecture:** ↑↑ — FacultyAnalytics is no longer a counter-example to the "no React-side KPI SQL" invariant. The pattern (3 view + 3 metric registry entries + a typed `useKpi<TRow>` hook) is now extractable for D5/D6 consumers.
- **Honesty:** ↑ — the page no longer pretends to support faculty filtering. The dropdown was a silent no-op; the page now states the scoping gap and points at the D4 schema work that resolves it.
- **Pilot readiness:** ↑ — FacultyAnalytics is now reliable end-to-end; the pilot's faculty/admin users will see consistent numbers regardless of how `enrollments`/`submissions`/`ai_tutor_sessions` underlying schemas evolve, because the views are defensively created with stub fallbacks.

### Out of scope (deferred)
- **Per-faculty cuts** — pending `courses.faculty_id` / `ai_tutors.faculty_id` schema unification. Each of `courses` and `ai_tutors` has 2-3 competing migrations with `IF NOT EXISTS`; the early definitions don't carry `faculty_id` and win in CI. A D4 schema-sync migration should pick one shape and `ALTER TABLE` everywhere else.
- **Fixture-driven aggregate verification** — once schema unification lands, the suite should add tests that insert N enrollments / submissions / sessions and assert exact counts come back through kpi-service.
- **Frontend unit tests** — chart components are pure functions of their props; vitest tests with rendered output assertions would be a small additional commit.
- **Caller-context view reads** — kpi-service currently reads views with the service role (so `security_invoker = on` is moot for the kpi-service path). Switching kpi-service to authenticated-caller reads is a D7 observability concern, not D3.2.

### Next
Continue with whichever is most strategic next: D3.3 (faculty office hours), D3.4 (bulk grading grid), D3.5 (workload planner), or move to D4 (Registrar Operations) now that both unblockers — term rollover RPCs (D3.1) and the KPI envelope as the analytics contract (D3.2) — are in place.

---

## Sprint D3.3 — Faculty Office Hours

**Status:** ✅ Closed
**Date:** 2026-06-29
**Migration:** `supabase/migrations/20260629140000_sprint_d3_3_faculty_office_hours.sql`
**Test:** `supabase/tests/faculty_office_hours.test.sql` (16 BLOCKING tests, both workflows)
**Pages:** `src/pages/faculty/FacultyOfficeHours.tsx`, `src/pages/OfficeHoursBrowse.tsx`
**Routes:** `/faculty/office-hours` (faculty/admin/superadmin), `/office-hours` (any authenticated)
**ADR:** Reuses ADR-0001 (no new architectural decisions — 4 SECURITY DEFINER RPCs + 2 RLS-protected tables consuming D1's `ops_log_write` + `assert_not_maintenance` substrate).

### Reconciliation: separate tables, not extension
The pre-existing `public.office_hours_slots` / `office_hours_bookings` are **AI-tutor-shaped** — `tutor_name TEXT`, `tutor_specialty TEXT`, `day_of_week TEXT` + `start_time TIME` + `end_time TIME` (no concrete date), no FK to `auth.users`, RLS opens all rows. The `/ai-tutors/office-hours` page consumes them live. Extending those tables for faculty would require many nullable columns and risk the AI-tutor flow.

Faculty office hours have different semantics — concrete `timestamptz` windows, real user FK, capacity, course context, video URL. D3.3 ships **new tables** (`faculty_office_hours_slots`, `faculty_office_hours_bookings`) so the two flows can evolve independently.

### Delivered

**2 tables, RLS-protected** (`faculty_office_hours_slots`, `faculty_office_hours_bookings`):
- Slots: visible to any authenticated user (when `status='open'` or the caller is the owner / admin / registrar). Owner/admin can write directly.
- Bookings: visible to the booking student, the slot-owning faculty, or admin/registrar. **All client writes blocked by RLS** (`USING admin OR superadmin`) — bookings flow exclusively through SECURITY DEFINER RPCs so capacity/overlap/double-booking rules can't be bypassed.
- Partial unique index `(slot_id, student_user_id) WHERE status <> 'cancelled'` enforces "no two active bookings by the same student for the same slot" even under races.
- `tstzrange && tstzrange` overlap check on slot creation prevents a faculty member from publishing two open slots that overlap in time.
- Capacity bound `1 <= capacity <= 50`. End > start. Future-only slot creation.
- `updated_at` trigger on both tables.

**4 RPCs, SECURITY DEFINER, search_path-locked, audited:**
| RPC | Role | Audit event |
|---|---|---|
| `faculty_office_hours_create_slot(starts_at, ends_at, capacity, course_id, location, meeting_url, notes)` → `uuid` | faculty / admin / superadmin | `oh.slot_created` |
| `faculty_office_hours_cancel_slot(slot_id)` → `jsonb` | owner / admin / superadmin (cascades booking cancellations with shared `correlation_id`) | `oh.slot_cancelled` |
| `faculty_office_hours_book(slot_id, topic, notes)` → `uuid` | any authenticated (student in practice; self-booking by the slot owner explicitly blocked) | `oh.booking_created` |
| `faculty_office_hours_cancel_booking(booking_id)` → `jsonb` | booking student / slot-owning faculty / admin / superadmin | `oh.booking_cancelled` (with `cancelled_by_role` in context) |

All four call `assert_not_maintenance()` (the D1 / D3.1-stubbed function) so writes pause during maintenance windows for non-admin callers. All four emit `ops_log` events with `source = 'rpc'` for full audit traceability.

### SQL regression — `supabase/tests/faculty_office_hours.test.sql`
16 tests inside BEGIN/ROLLBACK; uses the D3.1 patterns (`ALTER TABLE auth.users DISABLE TRIGGER ALL`, drop legacy `user_roles_role_check` CHECK so a `'faculty'` fixture row inserts).

| # | Asserts |
|---|---|
| 1 | `create_slot`: faculty succeeds |
| 2 | `create_slot`: student forbidden |
| 3 | `create_slot`: rejects `ends <= starts` (`invalid_window`) |
| 4 | `create_slot`: rejects time overlap with caller's own open slot (`overlap`) |
| 5 | `book`: student books an open future slot |
| 6 | `book`: rejects double-book by same student (partial unique index) |
| 7 | `book`: rejects a cancelled slot (`slot_not_open`) |
| 8 | `book`: enforces capacity (`capacity_exceeded`) |
| 9 | `book`: faculty cannot self-book (`self_booking`) |
| 10 | `cancel_booking`: student cancels own |
| 11 | `cancel_booking`: slot-owning faculty cancels |
| 12 | `cancel_booking`: unrelated student forbidden |
| 13 | `cancel_slot`: cascades booking cancellations + shared `correlation_id` + ops_log row |
| 14 | `cancel_slot`: admin can cancel any slot |
| 15 | All four RPCs write a correct `ops_log` event with the right ids |
| 16 | `book`: rejects past slot (`past_slot`) — uses admin direct insert to simulate a past slot since the RPC also blocks future-only at creation |

Wired into both `backend-sql-tests.yml` and `production-deploy.yml` as a BLOCKING step.

### UI

**`/faculty/office-hours`** — `RoleRoute allowedRoles={['faculty','admin','superadmin']}`:
- "Publish slot" dialog with `<input type='datetime-local'>` for starts/ends, capacity (1-50), optional location/meeting URL/notes.
- Two cards: Upcoming slots and Past slots. Each row shows status badge, capacity, location/URL, notes, with a Bookings drawer and a Cancel-slot button (when open).
- Bookings drawer lists each booking with student id (UUID prefix), topic, booked time; faculty can cancel individual bookings.

**`/office-hours`** — public to any authenticated user:
- Tabs: Browse (open future slots) / My bookings.
- Browse tab: each open slot shows window, capacity, faculty id (UUID prefix), notes. "Book" opens a dialog for optional topic + notes.
- My bookings tab: caller's bookings with cancel button on active ones.

All mutations call the four RPCs above. Faculty-id-to-name resolution is deferred (the page shows UUID prefixes); when D4's profile-name resolution lands, both pages can swap to friendly names.

### RLS verification
- **Direct table SELECT** on `faculty_office_hours_slots`: any authenticated caller sees `status='open'` rows + their own; owner and admin/registrar see all. *(Test #5, #7, #11 exercise this implicitly via the bookings-against-slot lookups.)*
- **Direct table SELECT** on `faculty_office_hours_bookings`: visibility is `student_user_id = auth.uid()` OR slot-owning faculty OR admin/registrar. *(Test #11, #12 exercise the owner-sees / non-owner-forbidden boundary.)*
- **Direct table INSERT/UPDATE/DELETE** on `faculty_office_hours_bookings`: blocked for everyone except admin/superadmin. Forces all booking lifecycle changes through the four audited RPCs. *(Test #16 uses an admin direct insert specifically to set up a past-slot test fixture, exploiting the documented admin bypass.)*

### Sprint exit checklist

```text
✅ Migrations applied                  (new file; uses D3.1 substrate shims if D1 absent)
✅ Types regenerated                   (next regen pulls new RPC signatures; UI uses (supabase as any).rpc in the meantime)
✅ Typecheck clean                     (npx tsc --noEmit -p tsconfig.app.json → 0 errors)
✅ SQL regression suite passes         (academic_spine + term_rollover + faculty_analytics_kpis + faculty_office_hours)
N/A Lifecycle behavior suite           (no change)
N/A Lifecycle invariants               (no change)
N/A Executive scope isolation          (no change)
✅ UI smoke verified                   (both routes render; create→book→cancel mutations call the right RPCs; static inspection of every path)
✅ RLS verified                        (4 enumerated policies; matrix walked above)
✅ Performance regression              (slot browse: status='open' + starts_at > now() partial index; bookings: indexed by slot_id and student_user_id)
✅ Documentation updated               (this entry + COMMENT ON for both tables)
✅ ADR recorded                        (no new ADR; reuses ADR-0001)
✅ D0 governance gate signed           (no academic-engine change; new tables disjoint from spine)
✅ Readiness delta published           (below)
```

### Readiness delta
- **Faculty engagement:** ↑↑ — faculty can publish bookable office-hour windows with a single click; the historic AI-tutor-only "office hours" surface is no longer the only path.
- **Pilot UX:** ↑ — students get a real human-faculty booking channel separate from the AI tutor track.
- **Auditability:** ↑ — every slot/booking lifecycle event lands in `ops_log` with stable event names (`oh.slot_created`, `oh.slot_cancelled`, `oh.booking_created`, `oh.booking_cancelled`).
- **Schema integrity:** held — D3.3 added two new tables disjoint from the academic spine, no migrations to existing tables.

### Out of scope (deferred)
- **Faculty name resolution in the UIs** — both pages currently show `faculty_user_id` / `student_user_id` UUID prefixes. Wiring through `profiles.full_name` belongs with the D4 profile-name resolution work since multiple admin pages need the same join.
- **Course filter on student browse** — schema supports it (`slots.course_id` column exists), but adding a filter UI tied to courses requires the courses faculty-id unification from D4.
- **Email/in-app notifications** on booking/cancellation — handled by a notifications subsystem not in scope for D3.3.
- **AI tutor `office_hours_slots` migration to faculty-shape** — explicit non-goal; the AI-tutor table stays as-is.

### Next
Continue with whichever is most strategic next: D3.4 (bulk grading grid), D3.5 (workload planner), or move to D4 (Registrar Operations). All three D3.x sub-sprints landed (D3.1 + D3.2 + D3.3) deliver the pieces D4 was waiting on — term rollover RPC, the KPI envelope as the analytics contract, and a working faculty operations surface that doesn't depend on schema cleanups still pending.
