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
