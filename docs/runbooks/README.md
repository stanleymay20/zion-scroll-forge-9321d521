# Runbooks

Short, procedural docs for operational scenarios. Each one is meant to be
opened during an incident, release, or maintenance window and followed step-by-step.

The core operational runbooks below are live control documents. Some broader
post-incident and service-specific documentation remains scheduled for Sprint D8.

| Runbook | When to use |
|---|---|
| [maintenance-window.md](./maintenance-window.md) | Planned maintenance — enable mode, announce, verify, restore. |
| [sev1-incident-response.md](./sev1-incident-response.md) | Critical incident triage and postmortem. |
| [backup-verification.md](./backup-verification.md) | Periodic verification of a backup snapshot. |
| [release-rollback.md](./release-rollback.md) | Roll back a production release. |
| [suyas-production-migration.md](./suyas-production-migration.md) | Deploy and verify SUYAS academic-year authority migrations in production, with fail-closed rollback/recovery controls. |
