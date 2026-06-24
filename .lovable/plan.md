# Fix Learning-Outcome E2E Flow — 5 Phases

Goal: make every module's stated outcomes **visible, measurable, recorded, rewarded, and reportable** end-to-end.

Schema verified live against the DB. Some audit findings were corrected (see notes).

---

## Phase 1 — Display fixes (frontend only, ~30 min)

Surface objectives where they actually matter and stop reading from wrong columns.

1. **`src/pages/CourseDetail.tsx`** — read `module.learning_objectives` (the real top-level column) with fallback to `module.content.learning_objectives`. Currently only the JSONB-blob path is checked, so seeded modules show nothing.
2. **`src/hooks/useLiveClassContext.ts`** — also fetch `course_modules.learning_objectives` and include them in `learningObjectives` (currently only course-level `learning_outcomes` is sent, often empty). Pass module-level first, fallback to course-level.
3. **`src/components/learning/ModuleLearningContent.tsx`** — add an "Outcomes for this Module" collapsible card above the reading area listing each objective with an unchecked circle (state filled in Phase 3).

## Phase 2 — Real quiz tied to outcomes (~½ day)

Replace mock quiz with DB-driven questions and tag every question to an outcome.

1. **Migration** — add `learning_objective_id UUID` and `bloom_level TEXT` to `quiz_questions`; add `course_id UUID` and `module_id UUID` so questions can be fetched per module (currently only `assignment_id`). Backfill nullable; no destructive change.
2. **`src/components/course/QuizInterface.tsx`** — replace hardcoded `mockQuestions` with a real `supabase.from('quiz_questions').select(...).eq('module_id', moduleId)` query. Keep `ExplainScoreDialog`. If zero questions exist, show "Assessment pending" (no silent mock).
3. **Seed helper** — small edge function `seed-module-quiz` that, given a module_id, generates 5–8 questions from the module objectives via Lovable AI Gateway (one question per objective minimum, Bloom level assigned). Admin-only.

## Phase 3 — Per-outcome mastery + student-visible report (~½ day)

Write mastery, show it, gate completion on it.

1. **`QuizInterface` submit** — compute per-objective score (correct/total grouped by `learning_objective_id`), write mastery to `student_module_progress.mastery_level` (overall) and to a new `student_outcome_mastery` table (per objective, with `attempts`, `last_score_pct`).
2. **Migration** — create `student_outcome_mastery` (user_id, course_id, module_id, learning_objective_id, score_pct, attempts, achieved_at) with RLS + GRANTs per project rules.
3. **`OutcomesAchievedPanel.tsx`** (new) — rendered on the quiz results screen and on `ModuleLearningContent`. For each module objective: ✅ Achieved (≥70%) / 🟡 Approaching (50–69%) / ⭕ Not yet. Pulled from `student_outcome_mastery`.
4. **Completion gating** — `useCompleteModule` checks that ≥70% of module objectives are "Achieved" OR the module has no quiz; otherwise blocks with a toast pointing the student to retry.

## Phase 4 — Real XP/ScrollGold on completion (~1 hr)

Stop lying in the toast.

1. **`CourseLearningPage.tsx`** — on `module_completions` insert, also call existing `earn_scrollcoin` RPC (or `award-scrollgold` edge function — whichever is canonical in this codebase) with `amount = module.rewards_amount`. Set `xp_awarded` to the same value so the row is auditable.
2. **`useCompleteModule`** in `useCourses.ts` — same treatment for the older path so both paths grant rewards consistently.

## Phase 5 — Certificate + consolidation (~1 hr + ½ day)

1. **`supabase/functions/generate-certificate/index.ts`** — append a "Demonstrated Learning Outcomes" section listing every course-level outcome the student achieved, derived from `student_outcome_mastery` aggregated by `course_learning_outcomes`.
2. **Table consolidation** — pick `module_completions` as canonical. Add a one-time backfill SQL from `module_progress` → `module_completions`, then mark `module_progress` deprecated in code comments; keep the table to avoid breaking older queries, but route all writes to `module_completions`.

---

## Technical details

- **Schema corrections vs. audit:**
  - `courses.learning_outcomes` **does exist** (audit G1 was partly wrong) — fix is to *also* include module-level objectives, not rename a column.
  - `quiz_questions` **does not** have `learning_objective` / `difficulty_level` columns — they need to be added (audit G3 overstated).
  - `course_learning_outcomes` table already exists with `bloom_level` — Phase 2 questions FK into it.
- **RLS pattern for `student_outcome_mastery`:** owner read/write via `auth.uid() = user_id`; faculty/admin read via `has_role`. GRANT to `authenticated` + `service_role` per project rule.
- **No breaking changes** to existing UI; new components are additive. Existing certificate keeps current layout, adds a section below it.
- **Order of execution:** Phase 1 (frontend, no migration) → Phase 2 (1 migration) → Phase 3 (1 migration) → Phase 4 (no migration) → Phase 5 (edge fn + 1 migration). Each phase is independently shippable.

---

## Out of scope (flagged but not in this plan)

- Full Bloom's-aligned outcome generation for all existing modules (would require regenerating course content; recommend a separate batch job).
- Replacing `module_progress` writes app-wide (Phase 5 backfills but leaves the table for backward compat).
- C2PA / content-credentials for video — already noted in earlier AI-law work.

Confirm and I'll execute Phase 1 immediately, then proceed phase-by-phase.