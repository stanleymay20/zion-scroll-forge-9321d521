
# Student Study Experience — Audit & Fix Plan

## Audit: what actually exists vs. what's broken

I queried the live database and walked the learning UI. The student experience is **mostly built but disconnected** — content, modules, lectures and tutors all exist, but key foreign keys are NULL so the UI shows empty states.

### ✅ Already built and populated

| Asset | Count | Quality |
|---|---|---|
| Courses | 225 | Distributed across 16 faculties |
| Course modules | 1,381 | Avg 6.5/course, **1,380 have 2,000+ chars of markdown** content, all have video scripts, audio scripts, study guides |
| Learning materials | 1,576 | videos (255), PDFs (252), study guides, slides, infographics, scripts |
| Assignments | 502 | linked to modules |
| Quizzes | 172 | linked to modules |
| Divine assessments | 213 | rubric-based |
| AI tutors | 10 | one per scroll faculty domain (Sophia, Ariel, Zadok…) |

### ✅ UI is wired and routed
- `/courses/:id/learn` → `CourseLearningPage` with 4 tabs: **Learn / Modules / Live Avatar / AI Tutor**
- Module reader, curriculum browser, live avatar lecture, AI tutor chat, auto-certificate on 100%, sticky progress header, confetti graduation.

### ❌ The real blockers (why students see "nothing to study")

1. **`ai_tutors.faculty_id` is NULL for all 10 tutors.** The Live Avatar tab in `useLiveClassContext` matches by `faculty_id` first, then falls back to `ilike specialty`. The specialties ("Systematic Theology", "Kingdom Finance") don't match the course faculty names ("Scroll Theology", "Scroll Economy"), so **every Live Avatar tab shows "No AI faculty assigned"**.
2. **67 of 225 courses have NULL `faculty_id`.** Their `faculty` text column has a value (e.g. "Scroll Theology") but the FK was never backfilled. This breaks tutor matching, faculty filters, and faculty dashboards.
3. **`live_sessions` table has 0 rows.** No scheduled live lectures appear anywhere even though the table, RLS, and UI exist.
4. **`assessment_question_pools` has 0 rows.** Quizzes (172) and assignments (502) exist as titles but no playable questions → student attempts return empty.
5. **`course_modules.learning_objectives` is `[]` on all 1,381 modules.** Module pages and Live Avatar prompts have no objectives to show.
6. **`course_modules.quality_verified` is `false` on all 1,381 modules.** If the QualityGates publishing check is enforced anywhere, modules are silently filtered out.

## Fix plan (data + thin code, no UI rebuild)

The UI is fine — this is a data wiring + seeding job, then small guardrails so it can't regress.

### Step 1 — Backfill foreign keys (migration)
- `UPDATE courses SET faculty_id = f.id FROM faculties f WHERE courses.faculty_id IS NULL AND lower(trim(courses.faculty)) = lower(trim(f.name));`
- Map the 10 tutor specialties to faculty IDs explicitly (Sophia→Scroll Theology, Ariel→Scroll Technology / Prophetic Intelligence, Zadok→Scroll Justice, Chloe→Scroll Economy, Rapha→Scroll Medicine, Boaz→Scroll Economy, Priscilla→Scroll Education, Ezra→Scroll Theology, Hadassah→Scroll Arts, Caleb→Scroll Governance).
- Make `useLiveClassContext` also fall back by `course.faculty` text → `faculties.name` → tutor's mapped faculty so future inserts don't repeat the gap.

### Step 2 — Backfill module learning objectives
- For modules missing objectives, extract 3–5 bullet learning objectives from `content_md` using a `string_to_array` of the first `## Learning Objectives` block, or fall back to deriving from the first paragraph headings. No AI call needed — content already contains structured headings.

### Step 3 — Verify & unlock modules
- Flip `quality_verified = true` for any module with `content_char_count >= 2000` AND `has_video_script` AND `has_study_guide` (1,380/1,381 today). Set `verified_at = now()`.
- This is the single switch that opens the curriculum to enrolled students.

### Step 4 — Seed `live_sessions`
- For each course with at least one module and a matched tutor, insert one upcoming live session per module for the next 8 weeks (one per week per course). Status `scheduled`, `module_id` set so the tab links cleanly.
- Adds a real timetable students can join.

### Step 5 — Seed quiz question pools
- For every assignment of `kind = 'quiz'` (or every quiz row) that has no `assessment_question_pools` row, derive 5 questions from the parent module's `content_md` using the existing `kiro-generate` edge function in batch mode. Persist `{questions, draw_count: 5, shuffle: true}`.
- This makes the assessment pipeline render real questions.

### Step 6 — Smoke-test pipeline (post-deploy checks)
A short SQL audit view + a `/admin/learning-readiness` page that shows live counts:
- courses with `faculty_id` set
- modules with `quality_verified = true`
- tutors with `faculty_id` set
- courses with ≥1 upcoming `live_session`
- quizzes with question pools

Numbers must be 100% before onboarding opens. This is the gate.

## What I will NOT do in this PR
- Re-design the learning UI (it's already complete and good).
- Touch the certificate / graduation / SUYAS pipelines (those work).
- Generate new course content (we have 225 courses with rich content — sufficient for launch).

## Files I'll change
- `supabase/migrations/<ts>_learning_pipeline_backfill.sql` — steps 1, 2, 3, 4 in one transaction
- `src/hooks/useLiveClassContext.ts` — add faculty-name fallback for tutor matching
- `src/pages/admin/LearningReadiness.tsx` (new) — readiness dashboard
- `src/App.tsx` — route for the readiness page
- Step 5 runs as a one-shot script (`scripts/seed-quiz-pools.ts`) invoking the existing `kiro-generate` function, not a migration, because it streams AI calls.

Reply **approve** to ship Steps 1–4 + the readiness dashboard in one go, then **go quizzes** to run Step 5.
