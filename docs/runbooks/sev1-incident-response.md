# Runbook: Sev1 incident response

Sev1 = customer-facing functionality broken, security incident, data
integrity at risk, or any other condition where minutes matter.

## Triage (first 5 minutes)
1. Open **`/admin/ops`**. The top row gives you the snapshot:
   - Overall System Health
   - Active Incidents
   - Failed Background Jobs
   - Queue Health
   - Backup Status
2. Decide: is this **caused** by a known cause, or are you discovering it?

## Declare
1. Click **Incidents → Open incident**.
2. Severity: `sev1`.
3. Title: one-line description ("Login broken for all users").
4. Summary: what's broken, what users see, what you suspect.
5. Submit. Confirm the new incident appears in the list and is
   recorded in `incident_log` and `ops_log` (event `incident.opened`).

## Mitigate
- If the failure is correlated with a recent release: **roll back**
  (see `release-rollback.md`).
- If writes are corrupting data: enable **maintenance mode** to halt
  further damage (see `maintenance-window.md`).
- If an external dependency is at fault: contact the vendor and document
  in the incident summary.

While mitigating:
- Coordinate in a single channel.
- Time-stamp every significant action in the incident summary (you'll
  thank yourself during postmortem).

## Resolve
1. Once the user-facing symptom is gone, leave the incident **open** and
   move it to status `mitigated`.
2. Verify with synthetic checks that the issue is actually fixed (not
   just masked).
3. Move to status `resolved`.

## Close
1. Click **Close** on the incident row.
2. This writes `incident.closed` to `ops_log` and sets `closed_at`.

## Postmortem (within 5 business days)
1. Write the postmortem doc.
2. Edit the incident row and set `postmortem_url` to the doc location.
3. File any follow-up tickets for permanent fixes (e.g., automation that
   would have caught this earlier).

## Required artifacts in the incident log
- `severity = 'sev1'`
- `summary` populated
- `closed_at` set
- `postmortem_url` populated (within SLA)
