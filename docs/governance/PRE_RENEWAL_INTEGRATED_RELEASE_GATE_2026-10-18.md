# ScrollUniversity integrated pre-renewal GA verification

This temporary branch combines exact source candidates:
- PR #14 (f58ce0bf12a69dda000b193c81208d2a8aa6e72b) degree audit ledger authority.
- PR #18 (fec9754b552d3339b55184d88581c9ae50eeadcb) privileged degree RPC execution.
- PR #20 (7ef763bdf32a339d78ea8c84e6bf81f440dc21c7) GPA / academic-standing / transcript authorization.
- PR #21 (05551e935821b87e634bf7f2e69513122ef4fbdb) legally cautious Trust Center and navigation.

Base main: 005b0ec55dbfd18688eb2235e5dabfe431210ede. Both workflow files were composed manually from base to run all three new migrations and security tests on one isolated PostgreSQL CI database.

## This is not GA or production proof
The branch and PRs remain unmerged and unapplied. Lovable Cloud database migration history diverges from repo versions (243 GitHub SQL files, 194 ledger rows, 54 matching versions). Do not blindly replay migrations. The Trust Center content is not an official legal or accreditation certification.

## Pending acceptance
- Green exact-head combined GitHub CI, including SQL, Trivy, frontend and browser tests.
- Human security review of principal/role identity, SECURITY DEFINER dependencies and service-run paths.
- Backup/restore dry-run and object-by-object schema reconciliation on Lovable-managed staging.
- Positive student self-service, registrar, faculty, grading triggers and authorized system-worker tests.
- Complete course review, real learner pilot, compliant operator and accreditation disclosures, financial checkout/refunds and public production verification.

No credential changes, production writes, app deployment, Lovable renewal, or merge to main are authorized by creating this verification branch.
