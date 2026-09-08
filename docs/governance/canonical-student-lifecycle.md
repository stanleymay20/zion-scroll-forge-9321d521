# ScrollUniversity Canonical Student Lifecycle

## Purpose

ScrollUniversity uses one controlled student journey for new students:

Visitor → Account → Applicant → Admissions Review → Admitted Student → Orientation → Matriculation → Learning Profile → Registration → Active Learning → Assessment → Academic Record → Graduation Readiness → Alumni

The client state machine keeps routes, onboarding CTAs, and tests aligned. It is **not** an authorization engine.

## Governing authority

Academic/security authority remains server-side:

- `transition_student_status()` governs lifecycle status changes and rejects unauthorised cross-user transitions.
- admissions acceptance stops at `admitted`; it does not create academic enrollment or active status.
- admitted → enrolled self-progression requires completed orientation plus a matriculation record.
- enrolled → active self-progression requires orientation, matriculation, learning profile, and at least one governed `section_enrollments` row with `status='enrolled'`.
- the lifecycle lock prevents ordinary direct profile-status mutation.
- RLS governs row access.
- role-authority RPCs/policies govern staff privileges.
- `enroll_student_in_section()` is the canonical new registration RPC and enforces term/window/degree/standing/prerequisite/credit/timetable/capacity rules.
- `can_access_course()` recognises enrolled section registrations. Historical `enrollments` rows remain compatibility evidence for pre-section students; they are not the canonical new registration path.

The frontend fails closed when it cannot read enough lifecycle evidence to decide whether the student portal should render.

## Governed status graph

- applicant → admitted | withdrawn
- admitted → enrolled | withdrawn
- enrolled → active | withdrawn
- active → on_leave | withdrawn | graduated
- on_leave → active | withdrawn
- graduated → alumni
- alumni → alumni
- withdrawn → terminal unless a separately governed institutional process changes policy

## Canonical onboarding gate

For a new admitted student, milestones are enforced in this order:

1. orientation completion
2. matriculation record and admitted → enrolled transition
3. learning profile
4. governed section registration
5. enrolled → active transition
6. student portal / active learning

A client redirect never substitutes for the corresponding database/RPC authority.

## Parallel operating lanes

**Student experience:** Applicant → Student → Graduate/Alumni

**Academic delivery:** Faculty → Teaching → Assessment → Advising → Review

**University operations:** Admissions → Registrar → Academic Governance → Finance → Credentials → Operations

These lanes share governed records but do not confer each other's privileges.

## Institutional truth boundary

Software support for applications, transcripts, degree audits, graduation readiness, credentials, credit/ECTS-like fields, or academic records does **not** establish legal accreditation, recognised degree-awarding authority, or authority to award ECTS. Those claims require separate institutional/regulatory evidence and remain governed by the repository's public-claims/accreditation controls.

## Release boundary

Passing lifecycle, frontend, SQL, security, and browser gates does not prove that the live production Supabase migration ledger matches repository migration history. **Production migration parity remains a separate release blocker** until live migration history is independently compared against the deployed `main` SHA and exact parity is demonstrated.
