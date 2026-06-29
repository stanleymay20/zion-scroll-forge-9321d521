# Runbook: Release rollback

## When to use
A production release has caused or is suspected to cause customer-facing
breakage and you need to revert immediately.

## Decision (first 2 minutes)
- If the symptom is **clearly** correlated with the new release and is
  Sev1/Sev2: **roll back first, debug later**.
- If correlation is unclear: open an incident (see
  `sev1-incident-response.md`), continue investigating, and only roll
  back once you have evidence.

## Identify the target version
1. Go to **`/admin/ops` → Releases**.
2. The most recent row is what's currently live.
3. The row above it is your rollback target. Note its `version_tag` and
   `commit_sha`.

## Re-deploy the prior tag
1. In Lovable / your deploy system, redeploy the prior `commit_sha`.
2. Wait for the deploy to complete.
3. Verify the live site is on the old version (check a build hash or
   version string in the UI footer).
4. Smoke-test the user flow that was broken — the rollback worked when
   the symptom is gone.

## Record the rollback in ops
1. Click **Releases → Record release**.
2. Fill in:
   - **Version tag** — the tag you rolled back to (e.g., `v2026.06.28`).
   - **Environment** — `production`.
   - **Commit SHA** — same as the prior live row.
   - **Notes** — "Rollback of `v2026.06.29` — Sev1 login failure."
3. Submit. The new row appears with `released_at = now`.

*Future:* the `rollback_of` column on `release_events` will be wired
through the UI to link rollback rows to the release they superseded.
For now, capture this in the **Notes** field.

## Open the incident retrospectively if you haven't
- If you rolled back without opening an incident first, open one now
  (severity matching the impact).
- The postmortem covers: why the release was deployable, what the
  pre-deploy checks missed, what'll be added.

## After the dust settles
- Do not redeploy the bad tag without explicit fix + verification.
- Add a CI gate, test, or canary check that would have caught this.
