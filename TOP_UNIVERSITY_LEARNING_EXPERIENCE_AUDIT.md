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

## Remaining Recommendations

1. Backfill `learning_outcomes`, `reflective_prompt`, and `formative_checkpoints` for every published module.
2. Add faculty-owned syllabi with readings, assessments, grading policy, and academic integrity expectations.
3. Add regression tests for catalog contract cards, preview learning contract, and learning-room standard panels.
4. Replace generic instructor mock data in `CourseDetail.tsx` with real faculty records before production admissions scale.

