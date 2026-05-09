# Locked Academic Identity Model

Move ScrollUniversity from a "course marketplace" UX to a governed academic identity model. Students cannot self-mutate faculty, degree, cohort, or SUYAS track. All changes flow through an auditable Program Transfer Request workflow.

## What's already in place (no rebuild needed)
- Program-bound enrollment, matriculation, year gating, prereq enforcement, elective approvals, SUYAS audit logging.
- `students.degree_program_id`, `cohort_label`, `current_year`, `student_academic_profiles` view, `AcademicAssignmentCard`.
- `enforce_course_enrollment_gate` trigger and `admin_override_enrollment` RPC.

## What's missing (this plan adds it)

### 1. Lock the academic identity at the database layer
- Add a trigger `enforce_academic_identity_lock` on `public.students` that blocks any non-admin UPDATE to: `degree_program_id`, `faculty_id`, `suyas_track`, `cohort_label`, `current_year`, `academic_level`.
- Only `service_role` or users with `admin`/`superadmin`/`registrar` role may change these — and only through approved transfer RPCs.
- Mirror lock on `profiles.lifecycle_status` (already governed by `transition_student_status` — add explicit trigger to block direct UPDATE).

### 2. Program Transfer Request system (new)

**Tables**
- `program_transfer_requests`
  - `student_user_id`, `from_program_id`, `to_program_id`, `from_faculty_id`, `to_faculty_id`
  - `reason` (text, required), `academic_justification` (text), `supporting_docs` (jsonb)
  - `status`: `submitted | advisor_review | faculty_review | registrar_review | approved | denied | withdrawn | archived`
  - `submitted_at`, `decided_at`, `effective_term_id`
- `transfer_review_notes` — append-only reviewer notes (advisor / faculty / registrar)
- `transfer_decisions` — final immutable decision record with credit-remap snapshot

**RPCs (SECURITY DEFINER, audit-logged)**
- `submit_transfer_request(to_program_id, reason, justification)` — student-callable; one open request at a time.
- `advance_transfer_request(request_id, next_status, note)` — role-gated by stage (advisor → faculty → registrar).
- `decide_transfer_request(request_id, decision, credit_remap)` — registrar/admin only; on approve, atomically:
  - snapshot old `students` row,
  - update `students.degree_program_id` / faculty / track,
  - mark transferable enrollments (`enrollments.transfer_status = 'transferred' | 'non_transferable'`),
  - log `program_transfer` action in `suyas_audit_logs`.
- `withdraw_transfer_request(request_id)` — student can withdraw while still pre-decision.

**RLS**
- Students: read own requests, insert via RPC only.
- Advisors/faculty: read assigned-cohort requests, no direct write (RPC only).
- Registrar/admin: full read, decisions via RPC only.

### 3. Transcript integrity
- Add `enrollments.transfer_status` (`active | transferred | non_transferable | archived`) and `transferred_from_program_id`.
- Approval RPC takes a `credit_remap` JSON: `[{ enrollment_id, action: 'transfer'|'archive' }]`.
- Old enrollments are never deleted — preserved for transcript history.

### 4. UX shift (frontend)

**Remove / demote**
- "Browse all programs and enroll" framing on the student dashboard. Catalog stays accessible read-only as `/catalog` (already public_preview), but the dashboard stops surfacing cross-program enroll CTAs.

**Promote (in `AcademicAssignmentCard` and a new `MyAcademicIdentity` page)**
- Locked identity panel: Faculty / Degree / Cohort / SUYAS Track / Advisor / Year — all read-only with a lock icon.
- "Recommended next course" + "Locked upcoming" (already wired via `get_assigned_next_course`).
- "Request a Program Transfer" button → opens `TransferRequestDialog`.

**New pages / components**
- `src/pages/student/TransferRequest.tsx` — submit + view own request status timeline.
- `src/pages/admin/TransferRequestsAdmin.tsx` — registrar queue with stage actions.
- `src/components/identity/LockedIdentityPanel.tsx`
- `src/components/transfer/TransferRequestDialog.tsx`
- `src/components/transfer/TransferStatusTimeline.tsx`
- `src/hooks/useProgramTransfer.ts`

### 5. SUYAS audit coverage
Every transition emits `log_suyas_action` with action types: `transfer_submitted`, `transfer_advanced`, `transfer_approved`, `transfer_denied`, `transfer_withdrawn`, `identity_lock_violation_attempt`.

## Out of scope (call out, not built now)
- Advisor assignment workflow (assumes `students.advisor_id` exists or is added later).
- Email notifications for stage changes (queue infra exists; can wire after).
- Cohort sequencing changes / leave-of-absence flows.

## Technical summary

```text
Student ──submit──▶ program_transfer_requests (submitted)
            │
            ▼
   advisor_review ──▶ faculty_review ──▶ registrar_review
            │                                  │
            ▼                                  ▼
        denied/withdrawn               approved (atomic)
                                        ├─ students.* updated (via RPC only)
                                        ├─ enrollments remapped
                                        ├─ transfer_decisions row
                                        └─ suyas_audit_logs entry

Direct UPDATE on students.degree_program_id by non-admin
    └─▶ enforce_academic_identity_lock trigger raises exception
```

**Migration order:** (1) identity lock trigger, (2) transfer tables + RLS, (3) RPCs, (4) `enrollments.transfer_status` columns, (5) frontend.

Approve to proceed, or tell me which sections to trim/expand (e.g. skip advisor stage, ship registrar-only first).
