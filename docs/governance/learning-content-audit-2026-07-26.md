# ScrollUniversity — Learning Content & Experience Audit

**Date:** 2026-07-26
**Baseline commit:** `57b00d03` on `main` (CI green)
**Scope:** Can a real student *actually learn something* here today?
**Sibling report:** `docs/governance/school-readiness-audit-2026-07-26.md` (operational readiness)

---

## Verdict in one sentence

The *shell* for a learning experience is real and well-built — video player, quiz interface, discussion component, AI tutor with Socratic guardrails, progress tracking — but the **content itself is almost entirely empty**, and what content exists is either sparse seed data, LLM-templated boilerplate that reads the same across every course, or generated on-demand by an unverified AI pipeline. **A student who logs in today cannot complete a real course, because there isn't one.**

Traffic-light summary:

| Domain | State | The problem in one line |
|---|:---:|---|
| Study-experience UI (`CourseLearn`, `VideoPlayer`, `QuizInterface`) | 🟢 | Well-built, real component depth |
| AI Tutor pedagogy layer (persona + Socratic mode + "don't give graded answers") | 🟢 | Real, thoughtful guardrails |
| **Seeded course content** | 🔴 | 3–9 real course rows, 2 real lectures, 1 real assignment across the whole platform |
| **Course modules** | 🔴 | ~66 courses × 8 modules = 528 modules, but every one is the same templated boilerplate with title interpolated |
| **Quiz banks** | 🔴 | One real 3-question quiz seeded; everything else is LLM-generated on demand |
| **Videos** | 🔴 | No seeded video assets; VideoPlayer expects `${videoUrl}.vtt` captions that don't exist |
| **Prerequisite / scaffolding enforcement** | 🔴 | No "unlock next module when previous passed" gate anywhere |
| **Feedback loop (rubric → student)** | 🟡 | Rubric scaffold in D3.4; not yet consumed by student view (D3.4.4 deferred) |
| **AI content-generation pipeline** | 🟡 | Exists, but no factuality / plagiarism / faculty-approval gate before it becomes student-facing |
| **Accessibility (WCAG)** | 🔴 | Zero `aria-*` attributes in the whole learning UI |
| **Real content review workflow** | 🔴 | No visible "faculty reviewed and approved this module" state |
| **Curriculum credibility (accreditation angle)** | 🟡 | Curriculum is fully branded/theological; not mapped to any standard framework |

---

## 1. The shell is real

These are genuinely built and, in isolation, work:

- **`src/pages/CourseLearn.tsx`** (347 lines) — tabs for video / notes / quiz / assignment / discussion, driven by enrollment + module data.
- **`src/components/course/VideoPlayer.tsx`** (362 lines) — play, pause, volume, playback rate, fullscreen, captions toggle, watched-percentage tracking, mutation-based progress writes.
- **`src/components/course/QuizInterface.tsx`** (435 lines) — pulls `quiz_questions` tagged by `module_id` + `learning_objective_id`, radio-group per question, immediate feedback + explanation, per-outcome mastery tracking, `ExplainScoreDialog` for AI-assisted score explanation.
- **`src/components/course/AssignmentSubmission.tsx`** (363 lines) — upload + submission.
- **`src/components/course/LectureDiscussion.tsx`** (373 lines) — threaded discussion.
- **`src/components/course/CourseProgressSidebar.tsx`** (146 lines) — module list + progress indicators.
- **`supabase/functions/_shared/tutor-persona.ts` + `tutor-pedagogy.ts`** — Real, thoughtful teaching modes: `warm`, `pastoral`, `socratic`, `practical`, `reflective`, `concise`; teaching modes (`assessment_prep`, `practicum_reflection`, etc.) with an explicit rule: **"Do not give the answer to a graded item directly; teach the method."**

This is not a Potemkin UI. The plumbing to run a lesson is here.

## 2. The content is not

### 2.1 Real seeded rows across the whole content system

| Table | Real seeded rows | Where |
|---|---:|---|
| `faculties` | 5 (branded, fictional) | `20251213000002_sample_course_data.sql` |
| `courses` | 3 in one seed + 6 in another = **9 total** | Two migrations |
| `course_modules` (as static data) | 3 | `20251213000002` |
| `course_modules` (via `20251109214844` for one course) | 2 | Biblical Aesthetics course |
| `lectures` | **2** | `20251213000002` |
| `lecture_notes` | **1** | ↑ |
| `assessments` (real Q + A) | **1** | ↑ — a 3-question quiz |
| `assignments` (real rubric) | **1** | ↑ — a reflection paper |
| `discussion_forums` | 2 | ↑ |
| `course_resources` | 3 | ↑ |
| `quiz_questions` | 0 explicit seeds — everything routes through the LLM `seed-quiz-questions` function | — |

**One quiz. One assignment. Two lectures. That is the entire hand-authored curriculum.**

### 2.2 The templated-module trap

`20260106052552_ec0dd603...sql` runs a PL/pgSQL function that iterates every course with no modules and inserts eight identical modules:

- "Week 1: Foundational Principles & Biblical Framework"
- "Week 2: Historical Context & Theological Foundations"
- … through "Week 8: Capstone Project & Final Assessment"

Each module gets the **same content_md** with only the course title and faculty name interpolated. Every module contains:

- The same Proverbs 9:10 opening quote
- The same three-item learning-objective list
- The same "theoretical framework" filler paragraph
- The same three scripture citations (Colossians 1:16-17, Proverbs 2:6, Romans 12:2)
- The same generic practical-application list
- The same "study resources" placeholder ("Primary course textbook chapters" — no textbook is named)
- The same closing prayer

A student clicking through five different modules — in five different courses — reads **the same page five times**. This is worse than an empty module, because it *looks* filled but conveys no information specific to the subject.

### 2.3 The AI-generation escape hatch

Two edge functions try to compensate:

- **`expand-thin-modules`** — finds modules with `content_char_count < 8000` and calls Lovable/Gemini or DeepSeek with a strong prompt ("senior endowed-chair professor… no placeholders… no filler… real authors, real works"). Generates 2500–3500 words per module.
- **`seed-quiz-questions`** — 5 MCQs per module via LLM, tool-called JSON, 4 options + correct + explanation.

Both are **admin-triggered, on-demand**. They don't run automatically. Even when they do run:

- **No factuality check.** "Real authors, real works" is a prompt request, not a verification. LLMs hallucinate citations.
- **No plagiarism check.** No integration with any similarity service; content could unintentionally mirror published sources.
- **No faculty-review gate.** A generated module is immediately student-visible. The rubric-scaffold tables from D3.4 could carry a review state, but nothing enforces one.
- **No provenance stored on the module row.** No "this content was AI-generated at timestamp T by model M with prompt hash P" audit — even though the `ai_output_log` contract exists for AI *decisions* (grading assist), it's not applied here.
- **Scripture-quote correctness is unverified.** For a Christian-rooted university, a wrong reference is not a minor content bug — it's a credibility failure.

### 2.4 Videos are aspirational

- `lectures.video_url` exists in the schema; the two seeded lectures have `video_url` set but there is no evidence the URLs resolve to hosted assets in this repo.
- `VideoPlayer.tsx:199` loads captions from `${videoUrl}.vtt`. There is **no captions table, no captions column, no captions upload path**. If a student toggles captions on, the `<track>` element points at a URL that will 404.
- No `generate-video` output storage schema, no signed-URL flow visible in the seeded data. `generate-video` edge function exists (310 lines) — presumably a future path.

## 3. Learning-experience defects

### 3.1 No prerequisite enforcement
`course_modules.prerequisites` exists as a column but nothing gates module N+1 on completion of module N. A student could click into "Capstone Project & Final Assessment" before opening "Foundational Principles." A grep for `prerequisites`, `blocking`, `gated`, `unlock` in `CourseLearn.tsx` and `CourseProgressSidebar.tsx` returns zero hits.

### 3.2 Quiz retake policy is a hard-coded string
`QuizInterface.tsx:281` says `{score >= 70 ? 'Congratulations!' : 'Keep studying and try again!'}`. There's no `attempts_used` state read, no `attempts_allowed` enforcement, no cool-down between attempts. Assessments have an `attempts_allowed` column (the seeded quiz has `attempts_allowed=3`) but the UI does not honor it.

### 3.3 No visible per-student feedback surface
`AssignmentSubmission.tsx` lets a student upload. Nothing on the student side reads back the rubric score + comments after grading. D3.4.4 (student feedback view) is explicitly deferred — this is a documented gap, not a hidden one, but it's the single most important post-submission touchpoint and it's absent.

### 3.4 Accessibility is unaddressed
Zero `aria-*` attributes in `CourseLearn.tsx`, `QuizInterface.tsx`, `VideoPlayer.tsx`, `AssignmentSubmission.tsx`. No keyboard-only walkthrough test. No color-contrast audit. No axe / Lighthouse step in CI. For a university claiming to serve real students, this is a compliance issue (ADA §508, WCAG 2.1 AA) and a real usability issue for students who need it.

### 3.5 AI Tutor is well-designed but its context is thin
The persona/pedagogy layer is genuinely thoughtful — mode-switching, memory summary, "don't answer graded items." But the tutor's context is the module's `content_md`. If that content is templated boilerplate (§2.2), the tutor has nothing subject-specific to teach from and will fall back to LLM general knowledge unlabeled as such. A student asking "explain module 4 of Kingdom Economics" gets a plausible-sounding answer that is not tied to any specific instructional design.

## 4. Governance gaps unique to content

### 4.1 No content-review workflow
`grade_rubrics` from D3.4 exists for grading; there is no parallel `content_review` state for course material. There should be a `module_review_state ∈ {draft, faculty_reviewed, published, retired}` and modules in state ≠ `published` should be invisible to students. Nothing in the current schema enforces this.

### 4.2 No content lineage
Once a module is regenerated by `expand-thin-modules`, the old content is overwritten. There's no `module_content_versions` table capturing "who changed what when." For a document a student learns from and might dispute a grade about, this is unacceptable.

### 4.3 No pedagogical scaffolding assertions
`vw_kpi_outcome_mastery` exists (D1 KPI view), and the D3.6 skill layer maps skills to courses/modules/assessments. But no test asserts that each course has:

- at least N modules,
- at least one assessment per module,
- learning outcomes covered by at least one quiz question,
- a graduation criteria that actually terminates.

Without these invariants, a course can technically pass CI while being pedagogically incoherent.

### 4.4 Curriculum credibility
The seeded curriculum ("Prophetic Intelligence", "Kingdom Economics", "Scroll Medicine", "ScrollBiotech") is heavily branded and theological. For a real school pursuing external legitimacy — accreditation, transfer credits, employer recognition — some pipeline needs to map these to a recognized framework (regional accreditor CIP codes, credit-hour equivalents, standard-degree-mapping documents). None of that mapping infrastructure is visible.

## 5. What "content-ready" would look like

For a pilot cohort in one course (not a whole university), the minimum:

1. **One real course, hand-authored, end-to-end.** 8–10 modules, each with:
   - 1,500+ words of subject-specific content (no template).
   - 1 lecture (video or written-only is fine, both need transcripts).
   - 1 formative quiz (5+ questions, hand-authored answer key).
   - 1 assignment with a real rubric.
   - Named required readings that exist.
2. **A faculty-review workflow** — content stays `draft` until a `faculty` role marks it `published`. `student_module_access` blocks non-published modules.
3. **Module unlock gating** — student sees module N only if module N-1 is completed OR they hold an override role.
4. **Quiz attempts enforced** — read `attempts_allowed`, block after exhaustion, show `attempts_used` in UI.
5. **Assignment feedback view** — student sees grade + rubric levels + free-form comment. (This is D3.4.4.)
6. **AI-generated content requires a faculty signoff row** before student visibility, and the module row carries provenance (model, prompt hash, generated_at, reviewed_by, reviewed_at).
7. **Videos have real captions.** Either uploaded `.vtt` files or a Whisper-generated caption row per video, and the player should not point at a URL that 404s.
8. **Baseline accessibility.** ARIA labels on all interactive elements in the study UI; axe-core in CI as advisory.

Estimated scope: **1 full course, faculty-authored, ~40–80 hours of subject-expert work**, plus **~1 sprint of engineering** to add the review workflow, unlock gating, attempt enforcement, feedback view, and accessibility pass. Videos + captions add another sprint if produced in-house.

## 6. Recommended next sprints (content track, parallel to D4)

- **CT1 — Golden Path Course.** Pick one course. Have a faculty author 8 modules end-to-end. This becomes the reference other courses are compared against.
- **CT2 — Content-review workflow.** `module_review_state` + admin UI + student-visibility gate + `ai_output_log`-style provenance row on regenerate.
- **CT3 — Progression enforcement.** Module unlock + quiz attempts + assignment feedback view (rolls up D3.4.4).
- **CT4 — Accessibility baseline.** ARIA + axe advisory in CI + keyboard-walkthrough Playwright smoke of the golden path.
- **CT5 — Video + captions pipeline.** Upload + Whisper-generated `.vtt` + storage bucket wiring. Only after CT1 has actual video source material.

These should run **in parallel with D4 (Registrar)**. Registrar is what lets a student *sign up*; content is what makes signing up worth it.

## 7. Verdict recap

- ✅ **Learning experience shell**: production-quality, thoughtful pedagogy layer, real components.
- 🔴 **Learning content**: not enough exists for a single real cohort to complete a single real course.
- 🟡 **AI content pipeline**: exists but is unaudited; must not be the primary source of student-facing material without a faculty-review gate.
- 🔴 **Accessibility**: unaddressed; blocks any real institutional launch.

**A student cannot really learn here today. They can log in, browse a catalog, and use the shell — but the content behind the shell is a template with the course title swapped in.** The gap is not code — it's authored curriculum and the review workflow that gates it.

This is fixable and the estimate is bounded. But it's the single biggest gap between "the platform is well-built" and "students are learning."
