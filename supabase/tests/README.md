# Governance Test Suites

Pure-SQL test suites that simulate authenticated users via
`request.jwt.claims` and assert the behavior of triggers, RPCs, and RLS
policies. They run inside a single `BEGIN ... ROLLBACK` so the database
is never mutated.

## Run

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/program_transfer_governance.test.sql
```

The suite exits non-zero on any FAIL (CI-friendly) and prints a summary
table at the end.

## Suites

| File | Coverage |
|---|---|
| `program_transfer_governance.test.sql` | Identity-lock trigger, lifecycle-lock trigger, `submit_transfer_request`, `withdraw_transfer_request`, `advance_transfer_request`, `decide_transfer_request`, partial unique index on open requests, atomic program update + enrollment remap, SUYAS audit logging, role gating on the decide RPC. |

## Fixtures

Each suite picks an existing accepted/enrolled student plus a privileged
reviewer (admin/superadmin/registrar) from live data. Add at least one
of each (and 3 active degree programs) to your test database before
running.
