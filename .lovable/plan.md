# Phase D — Pilot Readiness & University Operations (v4 — FINAL)

## Guiding rule
**Academic engine is frozen.** Only defect fixes touch enrollment, GPA, standing, degree audit, graduation, CLO/PLO mastery, or grade lifecycle.

---

## D0 — Architecture Governance (Continuous)

Not a sprint. A gate every sprint must clear. Artifacts live under `/docs/governance/`.

Every sprint must produce/pass:
1. **ADR** for any new subsystem — `/docs/adr/NNNN-title.md` (Context · Decision · Consequences · Alternatives).
2. **Dependency impact review** — new/changed packages, license check, supply-chain note.
3. **Data model review** — no duplicate entities; new tables justified against the existing schema (252 tables — additions require explicit ADR).
4. **API contract review** — every new RPC/edge function documented with input/output, error codes, and KPI envelope version (if applicable).
5. **Security review** — RLS + GRANT on every public table; secret usage audit; `security--run_security_scan` clean of new highs.
6. **Performance budget review** — slow-query check; p95 budgets for new RPCs; no >100ms regressions on hot paths.
7. **Documentation update** — runbook, persona docs, API ref.
8. **Migration replay check** — clean replay + snapshot replay (full version in D9.75).

`/docs/governance/sprint-log.md` records each sprint's gate outcome.

---

## Sprint Exit Checklist (applied identically to every sprint)

```text
□ Migrations applied
□ Types regenerated
□ Typecheck clean
□ SQL regression suite passes        (academic_spine)
□ Lifecycle behavior suite passes    (lifecycle_behavior)
□ Lifecycle invariants pass          (lifecycle_invariants)
□ Executive scope isolation passes
□ UI smoke verified                  (Playwright, top routes)
□ RLS verified                       (security--get_scan_results delta = 0 new)
□ Performance regression checked     (slow_queries + p95 budgets)
□ Documentation updated
□ ADR recorded (if applicable)
□ D0 governance gate signed
□ Readiness delta published          (/docs/governance/sprint-log.md)
```

Any unchecked item blocks sprint close.

---

## Architectural invariants (apply to every sprint)
- **Single KPI source** — `vw_kpi_*` views → `kpi_service` edge function → every dashboard.
- **Versioned KPI envelope** from day one:
  ```json
  { "version": "v1", "generated_at": "...", "scope": "...", "metrics": { ... } }
  ```
  `KPI_CONTRACT_VERSION` constant; bump on breaking change; previous version retained one sprint.
- **Append-only or audit-triggered** operational tables.
- **Every new public table** ships GRANT + RLS + policies in the same migration.
- **Feature flags + maintenance mode** via `launch_settings` + `assert_not_maintenance()`.
- **Correlation IDs** through every edge function → `ops_log`.

---

## Sprints

### D1 — Operations Foundation
`maintenance_mode`, `assert_not_maintenance()`. Tables: `background_job_runs`, `queue_health_snapshots`, `release_events`, `backup_verifications`, `restore_drills`, `incident_log`, `ops_log` (correlation_id, trace_id, span_id, fingerprint). KPI views: enrollment, retention, completion, graduation_pipeline, faculty_utilization, course_fill, outcome_mastery, accreditation_readiness, financial_health, system_health, ai_review_backlog. `kpi_service` edge function returning the versioned envelope.

### D2 — Administrator Operations
`/admin/ops` shell: Incidents · Maintenance · Jobs · Queues · Migrations · Releases · Backups · Restores · Runbooks (`/docs/runbooks/*`).

### D3 — Faculty Operations completion
Office hours editor + booking, bulk grading grid, `clone_section_for_term` + `rollover_term` RPCs, workload planner, faculty analytics.

### D4 — Registrar Operations completion
`plan_sections_for_term` wizard, capacity/waitlist UI, timetable conflict resolver, registration analytics.

### D4.5 — Platform Core
Reusable services consumed by everything downstream:
- Feature flag SDK (`useFlag` + `flag_enabled(key, scope)`)
- Configuration service (`app_config` + `get_config(key)`)
- Secrets validation edge function → `ops_log`
- Health-check framework (`health_check_registry` + `/healthz`)
- Background job orchestration (`job_queue` + `claim/complete/fail`, retry + DLQ)
- Central notification service (`notify(channel, template, payload, recipient)`)
- File storage abstraction (`storage_service.upload/sign/delete` with policy enforcement)

### D5A — Student Accounts
`invoice_line_items`, `payment_attempts`, `ledger_entries` (immutable), extend `financial_holds`. RPCs: `generate_term_invoices`, `apply_payment`, `recompute_account_balance`. Wire financial holds into `evaluate_graduation_candidate`. Bursar console + student account statement.

### D5B — Stripe & Reconciliation
`refund_workflow_states`, `stripe_reconciliation_runs`, `settlement_reports`. RPCs: `request_refund`, `reconcile_stripe_batch`. Stripe webhook with idempotency + D4.5 replay; settlement export.

### D6 — Executive Portal expansion
Persona dashboards (VC, Registrar, Dean, HoD, QA) consuming `kpi_service` with persona scope. Operational alerts panel from `incident_log`.

### D7 — Observability (expanded)
Correlation IDs + replay IDs in every edge function. Error fingerprinting. `/admin/observability` panels: slow RPCs, cron, notifications, AI, DB health, queue health, workers, SLO/SLA dashboards with breach evaluator cron, audit timeline viewer, dashboard usage analytics, frontend web-vitals (LCP/INP/CLS) → `vw_kpi_frontend_perf`, edge-function latency histograms, DB connection-pool health, cache hit/miss ratio scaffolding.

### D8 — Documentation
`/docs/admin/`, `/docs/faculty/`, `/docs/registrar/`, `/docs/student/`, auto-generated API ref from RPC catalog, `architecture/`, `deployment.md`, `disaster-recovery.md`, `operational-handbook.md`, governance index. Public `/docs/*` route.

### D9 — Production Hardening
Security re-scan + fix, slow-query index audit, axe accessibility sweep (top 20 routes), i18n scaffolding, browser/mobile Playwright matrix, backup+restore drill into `restore_drills`, feature-flag + secrets audit.

### D9.5 — Data Governance & Compliance
FERPA + GDPR audits. `data_retention_policies` + cron evictor. `pii_inventory` + scanner. `data_classification` taxonomy. `consent_events` ledger. `request_data_export` + `request_data_deletion` RPCs with admin queue. Audit retention verification cron. AI governance report generator (consumes `ai_output_log`, `human_review_requests`). Record retention schedule.

### D9.75 — Migration Certification
Block release until all four pass; results recorded in `migration_certifications`.
1. **Clean replay** — scratch Postgres, apply all migrations, capture checksum.
2. **Snapshot replay** — restore latest production snapshot, apply pending migrations, run regression + lifecycle suites.
3. **Rollback strategy** — compensating-migration playbook for each destructive change, recorded under `/docs/runbooks/rollback-*.md`.
4. **Schema checksum validation** — `pg_dump --schema-only | sha256` of clean replay vs snapshot replay must match `supabase/migrations/.schema-checksum`.

### D10 — Pilot Telemetry + Certification

**Pilot Telemetry** (instrument before certifying) into `vw_kpi_pilot_telemetry`:
*Operational:* login success, registration completion, avg enrollment time, faculty grading turnaround, registrar processing time, notification delivery success, AI response latency, system uptime, page performance, support ticket volume.
*Institutional:* course completion rate, advisor response time, registration abandonment, avg degree-audit runtime, graduation-evaluation runtime, payment success rate (post-D5B).

**Certification runs:** 100- and 1,000-student cohort simulations through finance + notifications + KPIs + governance + manual persona walkthroughs (faculty, registrar, executive, bursar).

**Reports** under `/docs/certification/`: Pilot Certification · Production Readiness · Operational Readiness · Security Readiness · Performance · Accreditation Readiness · Compliance Readiness · Migration Certification · Deployment Checklist · Go/No-Go.

#### Evidence-based pilot recommendation rubric

```text
READY_PILOT — requires ALL:
  □ All 10 Go/No-Go domains PASS
  □ 100-student simulation PASS (0 exceptions, 0 integrity violations)
  □ 1,000-student simulation PASS (0 exceptions, 0 integrity violations)
  □ Zero critical security findings (security--get_scan_results)
  □ Zero data integrity violations (lifecycle_invariants)
  □ Zero unresolved Sev-1 bugs

READY_LIMITED_PRODUCTION — requires READY_PILOT plus:
  □ Finance (D5A + D5B) complete and reconciled
  □ Operational documentation complete (D8 + runbooks)
  □ Monitoring operational (D7 SLO dashboards green for 7 days)

NEEDS_STABILIZATION — any READY_PILOT criterion fails but no Sev-1 open
NOT_READY                — any Sev-1 open or integrity violation present
```

### D11 — Stabilization Freeze
Codebase frozen. Allowed: bug fixes · performance · documentation · pilot support. No new features until first live pilot completes.

### D12 — Pilot Review *(post-pilot)*
Under `/docs/post-pilot/`: lessons learned · production incidents (from `incident_log`) · user feedback · feature requests · technical debt introduced · Phase E roadmap reprioritization.

---

## Go/No-Go gate (objective)

| Domain | Verdict |
|---|---|
| Academic Engine | PASS / FAIL |
| Registrar | PASS / FAIL |
| Finance | PASS / FAIL |
| Security | PASS / FAIL |
| Performance | PASS / FAIL |
| Observability | PASS / FAIL |
| Documentation | PASS / FAIL |
| Operations | PASS / FAIL |
| Compliance | PASS / FAIL |
| Migration | PASS / FAIL |

Any single FAIL blocks `READY_PILOT`.

---

## Flow

```text
D0 governance gate ── runs every sprint ──► sprint exit checklist ──► /docs/governance/sprint-log.md

KPI
  vw_kpi_*  ──►  kpi_service (v1 envelope)  ──►  dashboards
                          │
                          ▼
                       ops_log ──► alert evaluator ──► incident_log ──► /admin/ops

Platform Core (D4.5)
  flags · config · secrets · health · jobs · notify · storage
        │
        ▼  consumed by D5A/D5B/D6/D7/D8/D9.5/D10

Finance
  generate_term_invoices ─► invoices + line_items
  apply_payment ─► ledger_entries (immutable)
  reconcile_stripe_batch ─► settlement_reports
  financial_holds ─► graduation gate
```

## Out of scope
New programs/CLOs/course content · avatar pipeline changes · landing redesign · full i18n translations.

## Cadence
One sprint per turn. Each turn ends with the Sprint Exit Checklist filled in plus a readiness delta. After D10 I deliver the Go/No-Go scorecard with the evidence-based pilot recommendation; D11 begins immediately; D12 runs after the live pilot.

**Approve to begin Sprint D1 — Operations Foundation.**
