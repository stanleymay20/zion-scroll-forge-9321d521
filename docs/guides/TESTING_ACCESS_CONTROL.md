# Access Control & Catalog Governance — Test Checklist

This document verifies the role-gated catalog and SUYAS-aware access flow shipped in this change set.

## Database

- [ ] `public.departments` table exists with RLS (public read, admin write).
- [ ] `public.degree_program_courses` link table exists.
- [ ] `public.courses` has new columns: `department_id`, `visibility`, `career_track`, `estimated_duration_hours`.
- [ ] `public.can_access_course(_user_id, _course_id)` returns `{ allowed, access_level, reason, missing[] }`.
- [ ] No existing courses were deleted; default `visibility = public_preview`.

## RPC sanity (SQL editor)
```
select public.can_access_course(null, '<some-course-id>');         -- preview / authentication_required
select public.can_access_course('<student-id>', '<course-id>');    -- enrolled / preview / hold
```

## Public visitor (signed out)

- [ ] `/catalog` loads grouped catalog (Faculty / Degree / Level / Track tabs).
- [ ] `/course/:id/preview` shows overview, outcomes, first module preview, admission CTA.
- [ ] Visiting `/courses/:id/learn` redirects to login then renders `LockedCourseCard`.
- [ ] Visiting `/admin`, `/admin/admissions`, `/faculty/gradebook` redirects to `/auth/login`.

## Applicant (`lifecycle_status=applicant`)

- [ ] `/dashboard` accessible.
- [ ] `/courses/:id/learn` shows locked card (reason: `not_enrolled`).
- [ ] Catalog Preview button opens `/course/:id/preview`.

## Active student, not enrolled in target course

- [ ] Locked card reason: `not_enrolled_preview` with "Enroll" CTA.

## Active student, enrolled but missing prerequisite

- [ ] Locked card reason: `prerequisites_unmet`.
- [ ] "Continue prerequisite" button links to the missing course.

## Active student, enrolled, prereqs complete

- [ ] `/courses/:id/learn` renders the course learning page (no lock).

## Student with blocking hold

- [ ] All course-learning routes show `student_hold` reason and link to `/dashboard`.

## Faculty role

- [ ] `/faculty`, `/faculty/admin`, `/faculty/gradebook` accessible.
- [ ] `/admin/launch-ops` denied with "Access denied" page.
- [ ] Course learning routes accessible regardless of enrollment.

## Admin / superadmin

- [ ] All `/admin/*` routes accessible.
- [ ] Course learning routes accessible regardless of enrollment.

## Catalog UX

- [ ] Search filters across faculty/title/description.
- [ ] Tabs: By Faculty, By Degree Program, By Level, By Career Track all populate.
- [ ] Course card shows preview/locked badge based on `visibility`.

## Regression

- [ ] Existing `/courses` and `/courses-catalog` pages still render.
- [ ] No course content was reseeded.
- [ ] Existing enrollments still work.
