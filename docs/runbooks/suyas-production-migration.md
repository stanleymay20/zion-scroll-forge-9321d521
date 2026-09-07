# SUYAS Production Migration and Rollback Runbook

## Purpose

Deploy the ScrollUniversity Year Automation System (SUYAS) academic-year authority migrations to the production Supabase project without treating CI replay as production evidence.

This runbook covers only the three SUYAS migrations introduced by the academic-year authority change:

1. `20260907175900_suyas_calendar_substrate_reconciliation.sql`
2. `20260907180000_suyas_academic_year_authority.sql`
3. `20260907180100_suyas_rollover_compatibility.sql`

The GitHub `Production Deployment` workflow validates these migrations against ephemeral PostgreSQL. A green workflow does **not** prove that the production Supabase database has received them.

## Production target

Expected Supabase project reference: `klbtvdqfsctrfdkilrmx`.

Do not apply any migration until the connected Supabase account, CLI session, or deployment credential has independently confirmed that this is the selected production project. If the project cannot be resolved or verified, stop. Do not substitute another project.

## Change window prerequisites

- Final PR/main commit containing the migrations has passed Backend SQL, Security Scan, TypeScript, frontend build, and Release Ready gates on the same SHA.
- A current production database backup or platform-managed recovery point has been verified and its timestamp recorded.
- The person executing the change has an authenticated, authorized production database session.
- Maintenance mode can be enabled if production writes need to be paused.
- No concurrent schema deployment is running.
- The exact migration files to be applied match the reviewed Git commit.
- A rollback owner and incident channel/contact path are known before execution.

## Preflight evidence

Record the following in the deployment ticket or release record:

- Git commit SHA:
- GitHub workflow run IDs:
- Production Supabase project ref:
- Production database host/project identity evidence:
- Backup/recovery-point timestamp:
- Executor:
- Start time (UTC):

Before modifying the database, capture read-only counts/state for:

```sql
select count(*) as academic_years from public.academic_years;
select count(*) as academic_terms from public.academic_terms;
select count(*) as course_sections from public.course_sections;
select count(*) as assignments from public.assignments;

select id, name, start_date, end_date, status, is_active
from public.academic_years
order by start_date;

select id, code, name, starts_on, ends_on, status, is_active, academic_year_id
from public.academic_terms
order by starts_on;
```

Also confirm the expected legacy/canonical assignment columns before migration:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'assignments'
  and column_name in ('is_published', 'published', 'section_id')
order by column_name;
```

If production schema differs materially from the reviewed assumptions, stop and investigate before applying DDL.

## Deployment procedure

### 1. Enter controlled change state

If production writes could race with the migration, enable the existing maintenance-mode mechanism and verify that protected writes are paused. Do not bypass the maintenance authority functions or triggers.

### 2. Apply migrations in order

Use the repository's approved Supabase/database deployment mechanism. Apply exactly:

```text
20260907175900_suyas_calendar_substrate_reconciliation.sql
20260907180000_suyas_academic_year_authority.sql
20260907180100_suyas_rollover_compatibility.sql
```

Do not reorder, skip, edit inline, or mark a migration as applied without executing it.

The deployment command must fail on the first SQL error. Do not use `continue-on-error`, ignore exit codes, or manually insert migration-history rows to force parity.

### 3. Verify migration parity

Confirm the production migration history records the three SUYAS migrations exactly once in the expected order. If repository tooling and production history disagree, keep the release blocked until reconciled.

## Post-deployment database verification

All checks below are blocking.

### Academic terms are parented

```sql
select count(*) as orphan_terms
from public.academic_terms
where academic_year_id is null;
```

Expected: `0`.

### Parent relationships are valid

```sql
select count(*) as invalid_parent_links
from public.academic_terms t
left join public.academic_years y on y.id = t.academic_year_id
where y.id is null;
```

Expected: `0`.

### Term dates remain within their academic year

```sql
select count(*) as out_of_bounds_terms
from public.academic_terms t
join public.academic_years y on y.id = t.academic_year_id
where coalesce(t.starts_on, t.start_date) < y.start_date
   or coalesce(t.ends_on, t.end_date) > y.end_date;
```

Expected: `0`.

### Single active academic year invariant

```sql
select count(*) as active_years
from public.academic_years
where is_active is true;
```

Expected: `0` or `1`; never more than `1`.

### Authority functions exist

```sql
select to_regprocedure('public.publish_academic_year(uuid)') as publish_year,
       to_regprocedure('public.archive_academic_year(uuid)') as archive_year,
       to_regprocedure('public.suyas_term_is_governed(uuid)') as governed_term,
       to_regprocedure('public.clone_section_for_suyas_term(uuid,uuid,jsonb,uuid)') as clone_section,
       to_regprocedure('public.rollover_suyas_term(uuid,uuid,boolean)') as rollover_term;
```

Expected: every value is non-null.

### Authority triggers exist

```sql
select tgname
from pg_trigger
where not tgisinternal
  and tgname in (
    'trg_suyas_academic_year_state_authority',
    'trg_suyas_academic_term_year_integrity',
    'trg_suyas_assignment_publication_scope'
  )
order by tgname;
```

Expected: all applicable SUYAS triggers are present. `trg_suyas_assignment_publication_scope` is required when `public.assignments` exists.

### Operational terms require published years

```sql
select t.id, t.code, t.name, t.status, y.id as academic_year_id, y.status as year_status
from public.academic_terms t
join public.academic_years y on y.id = t.academic_year_id
where t.status::text in ('open', 'in_session')
  and y.status <> 'published';
```

Expected: zero rows.

### Published assignments are not newly allowed outside governed scope

Do not rewrite legacy/template rows solely to make this query empty. The migration intentionally preserves historical unscoped published rows. Instead, verify the publication trigger exists and perform the role-based smoke test below against disposable test data or a controlled transaction that is rolled back.

## Role and fail-closed smoke tests

Run these only with authorized test identities and rollback-safe fixtures.

Verify that:

- a non-admin/non-superadmin/non-registrar identity cannot publish or archive an academic year;
- direct lifecycle-state mutation is rejected outside the authority path;
- an operational term cannot be attached to an unpublished/archived year;
- a newly published assignment without a governed `section -> term -> academic year` path is rejected;
- arbitrary free-text rollover input cannot create a term;
- `rollover_suyas_term(source_uuid, target_uuid, ...)` requires canonical existing term IDs;
- closed/archived target terms are rejected;
- duplicate target sections are skipped rather than duplicated;
- the Operations Command Center loads canonical `academic_terms` and submits UUIDs, not arbitrary term labels.

Prefer wrapping destructive smoke-test fixtures in an explicit transaction and `ROLLBACK` after assertions.

## Application smoke test

After database verification and after the application version containing the canonical consumer is deployed:

1. Sign in as an authorized registrar/admin test identity.
2. Open `/admin/ops` and the Term Rollover panel.
3. Confirm source and target choices are populated from canonical academic terms.
4. Confirm there is no free-text target-term field.
5. Select two non-identical, safe test terms.
6. Confirm the preview is derived from `course_sections.term_id` and shows clone/skip counts.
7. If an execution smoke test is approved, use disposable sections or a rollback-safe fixture and confirm the returned correlation ID and counts.
8. Confirm an audit/ops record is emitted for the governed action.

Do not perform a live rollover on real teaching sections merely to prove the UI works.

## Success criteria

The production change is successful only when all of the following are recorded:

- all three migrations applied successfully to the verified production project;
- production migration history is in parity with the repository;
- zero orphan canonical terms;
- no invalid term/year links;
- no operational term belongs to an unpublished year;
- SUYAS authority functions and triggers are present;
- role-based/fail-closed smoke tests pass;
- application canonical-term UI smoke test passes;
- monitoring shows no migration-related error spike;
- maintenance mode, if enabled, is safely disabled after verification.

Until these checks are complete, the change is **merged/tested**, not **production-verified**.

## Failure and rollback policy

### Before commit / within an atomic transaction

If the deployment mechanism executes the migration transactionally and any blocking SQL statement fails, allow the transaction to roll back. Do not force a partial commit.

### After a committed migration

Do **not** attempt an improvised reverse migration that drops authority columns, triggers, functions, or parent links. This change performs data reconciliation and lifecycle normalization; ad-hoc down-SQL can destroy or misclassify production academic state.

If a committed migration creates unsafe production behavior:

1. enable maintenance mode if writes must be stopped;
2. record the incident and exact production migration state;
3. stop further migration/application rollout;
4. if the issue is safely forward-fixable without weakening academic authority, prepare and review a new additive corrective migration and run the full release gates before applying it;
5. if data/schema integrity cannot be assured, restore the pre-deployment verified database recovery point using the approved backup/restore process;
6. redeploy the last known-good application version if application compatibility also requires rollback;
7. rerun production integrity checks before reopening writes.

A database restore must consider all writes made after the recovery point; coordinate the decision as a production incident rather than restoring unilaterally.

## Evidence after recovery or rollback

Record:

- reason for rollback/recovery;
- failing SQL/error or runtime symptom;
- migration state before and after recovery;
- restored recovery-point identifier/time, if used;
- application version before and after rollback;
- integrity/smoke-test results;
- incident/postmortem reference.

## Explicit boundary

This runbook is a deployment control document. Its existence does not mean the production Supabase project is accessible from the current operator session, that these migrations have been applied, or that ScrollUniversity is GA-ready. Production readiness still requires independent runtime, security, curriculum, operations, recovery, and scale evidence.
