# Scroll University — Launch Readiness Truth Ledger

Date: 2026-08-28

This file is a launch truth ledger, not a marketing checklist. A subsystem is considered launch-ready only when the repository and production evidence support that conclusion.

## Launch principle

Scroll University may begin operating learning, admissions, faculty, advising, community, and course delivery only where those paths are backed by real data and governed authority. Unknown or incomplete credential evidence must abstain rather than manufacture progress, credits, GPA, degrees, or awards.

## P0 academic authority closed in this checkpoint

- Learner-visible quiz answer keys are isolated from browser access.
- Quiz grading and module mastery are server-derived.
- Direct student mutation of verified mastery and skill evidence is restricted.
- Course completion has a canonical projection derived from verified module mastery.
- Learning currency is retired from the academic chain.
- Legacy browser `module_completions` writes are blocked.
- Browser mutation of enrollment progress is blocked by a database authority trigger.
- The generic `issue_certificate()` function is retired pending a dedicated Credential Authority.
- Course certificate generation authenticates the caller and verifies every module has trusted mastery >= 70.
- Degree certificate generation fails closed.
- Mock/hardcoded degree audits have been removed from the active student UI and Edge Function.

## Launch modes

### Operationally launchable after production verification

- Account registration/login (subject to production Auth configuration verification)
- Catalog/course preview
- Enrollment/access control
- Course learning content
- Trusted module quizzes and verified module mastery
- AI tutoring where provider secrets and rate limits are configured
- Student/faculty portals backed by existing governed tables
- Advising, office hours, gradebook, workload and academic lifecycle paths covered by blocking SQL suites
- Course certificates after verified course completion

### Must remain non-authoritative / unavailable until evidence exists

- Degree conferral and degree certificates
- Official programme completion percentages unless the programme requirement graph is authoritative
- Any claim that XP, badges, streaks or course count proves degree eligibility
- Any accreditation claim not backed by the relevant jurisdiction/accreditor
- Any faculty identity/qualification claim without a verified faculty record

## Remaining launch evidence to obtain outside repository-only review

1. Production Supabase project identity and migration parity.
2. Auth production URLs, email confirmation policy and recovery flow.
3. Production secrets/provider connectivity for AI, email and payments.
4. Stripe webhook end-to-end verification if tuition is charged at launch.
5. Storage bucket policies and upload/download smoke tests.
6. Backup/restore test and recovery objective evidence.
7. Monitoring/error alert destination and on-call ownership.
8. Accessibility/manual device testing on the deployed build.
9. Verified faculty assignments for every published course.
10. Programme-specific degree requirement graph before any degree is conferred.

A green CI run is necessary but is not by itself proof that these external production dependencies are configured.
