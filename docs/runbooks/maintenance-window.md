# Runbook: Maintenance window

## When to use
A planned maintenance window where the platform should refuse writes from
non-admin users (e.g., during a schema migration, large backfill, or
Supabase upgrade).

## Pre-flight
1. **Announce** at least 24h in advance via the usual channels.
2. Confirm the change owner is on-call.
3. Confirm a rollback path exists.

## Enable maintenance mode
1. Go to **`/admin/ops` → Maintenance**.
2. Fill in:
   - **Banner message** — short, user-facing (e.g., "Scheduled maintenance
     in progress. Back at 14:00 UTC.").
   - **Internal reason** — audit-only (e.g., "D1.2 migration replay").
3. Toggle the switch ON.
4. Confirm the **Maintenance Status** card on the top row flips to **ON**.

What this does:
- Writes `maintenance.enabled` to `ops_log` (source `admin-ops-ui`).
- `assert_not_maintenance()` now blocks all non-admin write paths.
- Admin/superadmin users are intentionally bypassed so the operator can
  continue the work.

## Verify writes are paused
- Have a non-admin test account attempt any write. Expected: error
  `maintenance_mode_active`.
- Check **Jobs** tab — long-running background jobs should not be
  starting new write batches.

## Perform the change
Do the work (migration, backfill, etc.). Record any noteworthy events
through `ops_log_write(...)` from your scripts.

## Disable maintenance mode
1. Back at **`/admin/ops` → Maintenance**, toggle the switch OFF.
2. Confirm the top-row card flips to **OFF**.
3. Have the same non-admin test account try the same write. Expected:
   success.

## Post-window
1. Record a **Release** entry under the Releases tab if the window
   shipped a version-tagged change.
2. If anything went wrong, open an **Incident** (Sev3+) so the postmortem
   gets tracked.
3. Update this runbook with any drift you noticed.
