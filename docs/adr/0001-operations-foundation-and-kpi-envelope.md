# ADR-0001 — Operations Foundation & KPI Envelope v1

- **Status:** Accepted
- **Date:** 2026-06-28
- **Sprint:** D1
- **Owners:** Platform Engineering

## Context

Phase D shifts Scroll University from "validated academic engine" to "operable institution." We need a single substrate every later sprint can build on:

1. A way to safely pause writes during deploys / incidents.
2. A correlated structured log to attribute every edge-function call.
3. A canonical place to track incidents, jobs, queues, releases, backups, and restore drills.
4. **One** authoritative source of institutional KPIs so dashboards never re-implement the same SQL.

Without this, D2–D11 would each invent their own conventions.

## Decision

### Maintenance mode
Single-row `maintenance_settings` table, public-readable so the UI can show a banner. Mutations gated by `assert_not_maintenance()` (admins/superadmins bypass).

### Structured logging
`ops_log` table carries `correlation_id`, `trace_id`, `span_id`, `severity`, `fingerprint`, `duration_ms`, `http_status`. `ops_log_write(...)` SECURITY DEFINER helper is the only sanctioned write path from edge functions.

### Operational tables
`incident_log`, `background_job_runs`, `queue_health_snapshots`, `release_events`, `backup_verifications`, `restore_drills` — all admin-only, all append-or-audit-friendly.

### KPI envelope `v1`
Every KPI response — regardless of underlying view — is wrapped in:

```json
{
  "version": "v1",
  "generated_at": "...",
  "scope": { "metric": "...", "params": {...}, "requester_role": "..." },
  "metrics": { "rows": [...], "row_count": N }
}
```

Implementation: `kpi-service` edge function reads 11 `vw_kpi_*` views via service role. Admin-only metrics (`financial_health`, `system_health`, `ai_review_backlog`) check `user_roles` before responding. Non-admin metrics return aggregate-only data already safe per the underlying view.

`KPI_CONTRACT_VERSION` constant is bumped only on breaking change; the previous version is retained for one sprint after a bump.

## Consequences

**Positive**
- D2 administrator console reads directly from these tables — no new schema.
- D5A/D5B finance dashboards consume `vw_kpi_financial_health` through the same KPI envelope.
- D6 executive personas all share one contract — no dashboard drift.
- D7 observability has `ops_log` as its source from day one.
- D10 pilot certification can assert KPI contract stability as a Go/No-Go criterion.

**Negative / accepted trade-offs**
- KPI views are read-only aggregates over live tables; very large tables may need materialization later (deferred to D7 perf pass).
- `kpi-service` runs with `verify_jwt = false` but performs its own role check by forwarding the Authorization header — necessary to support anonymous access to public metrics while still admin-gating sensitive ones.

## Alternatives considered

1. **Per-dashboard SQL.** Rejected — guarantees drift; the original problem we're solving.
2. **GraphQL aggregation layer.** Rejected as premature; PostgREST + service role + named views meet current need with zero infra.
3. **Materialized views from day one.** Rejected — premature optimization. Move specific views to materialized when D7 perf pass identifies hot ones.
4. **Generic `audit_log` instead of `ops_log` + `incident_log`.** Rejected — operations logs and audit logs have different retention, access, and shape requirements. Audit lives in the existing `*_audit_log` tables.

## References
- Migration: `Sprint D1 — Operations Foundation`
- Function: `supabase/functions/kpi-service/index.ts`
- Sprint log: `docs/governance/sprint-log.md`
