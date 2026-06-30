# Sprint D3.5 — Faculty Workload Planner (Spec)

Status: **Drafted, awaiting approval to build.** Builds after D3.4 review closes.

## Goal

Give every faculty member (and their dean) a single page that answers:

1. What am I teaching this term, and is it within policy load caps?
2. Do any of my sections conflict in time, room, or supervision load?
3. Where do I stand on the term-over-term workload curve?

No new grading semantics. No new academic-engine writes. Workload Planner is a **read-and-plan** surface plus one append-only assignment-intent log.

## Frozen Academic Engine — what we do NOT touch

- `submit_course_grade`, `gradebook_publish_grades`, `enroll_student_in_section`,
  `compute_student_gpa`, `evaluate_academic_standing`, `graduation_*` — untouched.
- `faculty_teaching_assignments` rows are still the source of truth for who teaches
  what. D3.5 only **reads** them and writes **proposed** assignments to a new
  staging table (`faculty_workload_proposals`) that an admin/registrar promotes
  via an existing teaching-assignment flow (D4 will harden the promotion RPC).

## D0 Architecture Governance gate

| Check                                           | Verdict required |
|-------------------------------------------------|------------------|
| No duplication of teaching-assignment writes    | Single owner: existing flow |
| New tables follow public-schema GRANT pattern   | Yes              |
| All UI mutations route through `auditedWrite`   | Yes              |
| KPI reads go through `kpi-service` v1 envelope  | Yes (new view)   |
| Maintenance-mode honored at data layer          | Inherits D1 guard|

## Scope

### 1. Schema (one migration)

- `faculty_workload_policies` — per-rank caps (max sections, max credit hours,
  max distinct preps, max advisees). Seeded with a default `'standard'` row;
  per-faculty overrides via `policy_overrides jsonb`.
- `faculty_workload_proposals` — staging table the planner writes to. Columns:
  `id`, `faculty_user_id`, `term_id`, `section_id`, `role` (`primary` /
  `co_instructor` / `ta`), `proposed_by`, `status` (`draft` / `submitted` /
  `accepted` / `rejected`), `notes`, `created_at`, `decided_at`, `decided_by`.
- `vw_faculty_workload_term` — aggregate view: per-faculty per-term section
  count, credit hours, distinct preps, advisee count, conflict count. Read by
  the new KPI endpoint.
- `vw_faculty_workload_conflicts` — pairs of sections taught by the same
  faculty whose `meeting_pattern` time windows overlap. Pure SQL, no
  application logic.

All four objects: GRANT, RLS, `service_role` ALL, `authenticated` SELECT;
proposals additionally allow `INSERT/UPDATE` to the owning faculty + admins.

### 2. RPC (one function, append-only)

`workload_propose_assignment(_section_id uuid, _role text, _notes text)`
→ inserts a `draft` row in `faculty_workload_proposals` for `auth.uid()`.
Validates that:
- caller has `faculty` / `admin` / `superadmin` role
- the section's `term_id` is open
- no duplicate `(faculty_user_id, section_id, role)` in non-rejected state

Single `ops_log` event: `workload.proposal_created` (`source='rpc'`).

`workload_submit_proposals(_term_id uuid)` flips all caller's `draft` rows
for that term to `submitted` in one transaction; logs once with correlation_id.

**No acceptance RPC in D3.5.** Acceptance flows through the existing
teaching-assignment write path; D4 will add `workload_accept_proposal`.

### 3. KPI extension

Add `vw_faculty_workload_term` → `kpi-service` under `kpi.workload.term`:
- envelope: existing `v1` shape
- scope: faculty sees own rows; admins/registrars/deans see all; everyone
  else gets `403`
- no service-role read for non-aggregate rows

### 4. UI

Route: `/faculty/workload` (faculty + admin), `/admin/workload` (admin lens).

Components:
- **Term summary card** — current term load vs policy cap, with a bar per
  metric (sections / credit hours / preps / advisees). Red when over cap.
- **Schedule grid** — week × hour table of caller's section meeting times.
  Conflicts highlighted using `vw_faculty_workload_conflicts`.
- **Proposal drawer** — search sections in the upcoming term, propose to
  teach (primary / co / TA), add notes, save as draft, submit batch.
- **History strip** — last 4 terms' load (read-only chart from the KPI view).

No bulk import. No drag-to-reassign (drag would imply a write the planner
isn't authorized for). All mutations: `auditedWrite` → RPC.

### 5. Tests

- `supabase/tests/workload_planner.test.sql`:
  - cap enforcement is advisory, not blocking (planner shows red but lets
    you submit — dean adjudicates)
  - duplicate proposal prevention
  - conflict-view correctness on overlapping meeting patterns
  - RLS isolation: faculty A cannot read faculty B's drafts
- Added to `.github/workflows/backend-sql-tests.yml` matrix.

## Sprint Exit Checklist

- [ ] D0 gate signed (this doc + ADR-0002)
- [ ] Migration applied, all GRANTs present
- [ ] `kpi.workload.term` returns v1 envelope for faculty + admin scopes
- [ ] `/faculty/workload` renders for a faculty user with seeded data
- [ ] `workload_planner.test.sql` green in CI
- [ ] `docs/adr/0002-workload-planner.md` written
- [ ] `docs/governance/sprint-log.md` updated with exit verdict

## Out of scope (deferred to D4 Registrar)

- Auto-acceptance / promotion RPC
- Cross-departmental load balancing dashboard
- Adjunct contracting workflow
- Compensation calculations
