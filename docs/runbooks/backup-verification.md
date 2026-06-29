# Runbook: Backup verification

Backups that are never restored are not backups. This runbook covers the
periodic verification cadence (target: weekly).

## Identify the snapshot to verify
1. From the Supabase dashboard or your backup tooling, pick the most
   recent snapshot you haven't yet verified.
2. Note its **snapshot ID** and **storage location** (e.g., the bucket
   path).

## Restore into staging
1. Spin up a throwaway Postgres instance (local or staging cluster).
2. Restore the snapshot into it.
3. Run the standard integrity checks:
   - Row counts on the top 5 tables match production within tolerance.
   - `supabase/tests/academic_spine.test.sql` passes.
   - A sample user can log in and read their dashboard data.

## Record the verification
1. Go to **`/admin/ops` → Backups → Record verification**.
2. Fill in:
   - **Snapshot ID** — the ID from the snapshot you restored.
   - **Storage location** — bucket path or URI.
   - **Status** — one of:
     - `pass` — every check passed
     - `warning` — non-blocking issues (e.g., minor row-count drift)
     - `fail` — the restore broke or a blocking check failed
   - **Notes** — anything operationally relevant.
3. Submit. The row appears under Backups; the top-row **Backup Status**
   card updates within ~60s.

## Failure protocol
A `fail` result is itself a Sev1 incident.
1. Immediately open an incident (see `sev1-incident-response.md`).
2. Do not delete the failed snapshot.
3. Triage the cause and re-run with an alternate snapshot before the
   week is out.

## Cadence and ownership
- Target: at least one verification per calendar week.
- A `Backup Status` card showing **No verification on record** or
  showing **fail** is a Sev3+ on its own.
