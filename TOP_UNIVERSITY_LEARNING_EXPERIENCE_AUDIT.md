# Top University Learning Experience Audit

Audit date: 2026-08-03
Branch: `main`

## Finding

ScrollUniversity has strong learning primitives: catalog browsing, course preview, enrolled learning room, module reflections, formative checkpoints, outcome mastery, AI tutor support, student portal, degree audit, advising, and credentials.

The experience needed a stronger university-grade framing. Learners should understand the course contract before enrollment and see the same standard inside the learning room: workload, credit value, assessment evidence, weekly rhythm, support model, and mastery expectations.

## Fix Implemented

Added a reusable academic rigor profile in `src/lib/academicRigor.ts` and surfaced it across:

- `src/pages/AcademicCatalog.tsx`
- `src/pages/CoursePreview.tsx`
- `src/pages/CourseLearningPage.tsx`
- `src/components/learning/CourseCurriculumBrowser.tsx`

## Course Experience Standard

Every course should communicate:

1. Outcomes: what the learner will be able to do.
2. Workload: weekly expected effort and course duration.
3. Credit: credit hours or credential pathway.
4. Evidence: formative checks, portfolio work, and final synthesis.
5. Support: AI tutor, advising, peer discussion, and remediation.
6. Mastery: completion depends on reflection, checkpoint attempts, and outcome evidence.

## Recommendations Closed

1. Backfilled missing `learning_outcomes`, `reflective_prompt`, and `formative_checkpoints` through `supabase/migrations/20260803090000_backfill_top_university_learning_standards.sql`.
2. Added syllabus-grade standards to course metadata via `learning_progression` and to the learner-facing course detail standard.
3. Added regression coverage for the reusable academic rigor profile in `src/lib/academicRigor.test.ts`.
4. Replaced the generic instructor mock in `CourseDetail.tsx` with verified `teaching_assignments` + `faculty_profiles` data and an explicit pending-publication fallback.

## Remaining Operational Work

1. Apply the new Supabase migration in the production project.
2. Publish verified faculty profiles for courses that currently have no `teaching_assignments` record.
