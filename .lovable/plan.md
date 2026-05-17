
# Institutional Hardening Phase — Implementation Plan

This is a multi-week, multi-domain initiative. To keep each change auditable and shippable, I'll implement it in **7 sequenced PRs (one per Phase A–G)**. Each PR is independently verifiable. Below is the full scope and the ordering I recommend.

Per your standing rule — *no fake academic depth, no fabricated curriculum, no placeholder modules* — every gate below **blocks publication rather than synthesising content**. Where a program is incomplete it will be honestly marked, never auto-filled.

---

## PR1 — Phase A: Curriculum Depth Gates (database + admin surface)

Migrations:
- `curriculum_depth_scores` (program_id, modules, outcomes, references, assessment_diversity, practicum, research, faculty_review, instructional_hours, sequencing, total_score, computed_at)
- `module_authoring_requirements` extension to `course_modules`: `learning_objectives jsonb`, `estimated_duration_min int`, `references jsonb`, `activities jsonb`, `prerequisites jsonb`, `tutor_context text`, `assessment_id uuid`
- DB functions: `module_depth_score(course_id)`, `assessment_rigor_score(course_id)`, `curriculum_depth_score(program_id)` — pure scoring, no content generation
- Trigger on `degree_programs`: block `lifecycle_status='active_public'` unless tier-specific gate passes (Cert / Bachelor / Master / Doctoral thresholds from your spec)
- Trigger on `course_modules` publish: require non-null objectives, duration, references, activities

Admin UI:
- `/admin/curriculum-depth` page listing every program with score, missing gates, and a "Cannot publish — reason" badge
- No content authored automatically — incomplete programs simply stay `internal_development`

## PR2 — Phase B: AI Tutor Pedagogy Engine

Files:
- `supabase/functions/_shared/tutor-persona.ts` — extend with `teachingMode: 'lecture'|'socratic'|'coaching'|'revision'|'assessment_prep'|'practicum_reflection'`
- `supabase/functions/_shared/tutor-pedagogy.ts` (new) — mode-specific instruction blocks, scaffolding rules, intervention triggers
- `useLiveClassContext.ts` — enrich payload with: prior modules completed, assessment status, weak topics (from `tutor_student_memory` table), pacing percentile, PLO targets for current module
- New table `tutor_student_memory` (user_id, course_id, misconceptions jsonb, strengths jsonb, weak_areas jsonb, preferred_pace, last_topics jsonb, intervention_flag bool)
- Edge functions `ai-tutor-chat` & `ai-avatar-stream` — read+write memory each turn, switch mode based on `intent` param + recent assessment failures
- Auto-intervention: 3 consecutive low scores → tutor switches to revision mode + creates `student_intervention_alert` row for faculty

## PR3 — Phase C: Assessment & Integrity

Migrations:
- `assessment_question_pools` (assessment_id, questions jsonb, draw_count int)
- `assessment_attempts` (user_id, assessment_id, attempt_no, drawn_question_ids, score, integrity_flags jsonb, started_at, submitted_at)
- `assessment_audit_logs` (attempt_id, event_type, payload, created_at)
- `learning_outcome_mappings` (entity_type, entity_id, plo_id) — module/assessment/course ↔ PLO
- `program_learning_outcomes` (program_id, code, statement, bloom_level)
- `faculty_curriculum_reviews` (course_id, reviewer_id, state enum approved/changes_requested/rejected, comments, reviewed_at)
- Function `transcript_with_attainment(user_id)` returning credits + PLO attainment + practicum/thesis status + accreditation track

UI:
- Faculty review queue at `/faculty/curriculum-reviews`
- Student transcript view extended with PLO attainment matrix

## PR4 — Phase D: Progression & Standing Engine

Migrations:
- Extend `enforce_course_enrollment_gate` to also check: practicum_completed, thesis_state, gpa >= threshold, no integrity hold
- New table `academic_standing` (user_id, term_id, standing enum good/probation/intervention/honors/eligible_to_graduate, gpa, computed_at)
- Function `recompute_academic_standing(user_id, term_id)` — runs nightly + on grade insert
- Strengthen `check_graduation_eligibility` to require: PLO attainment ≥ threshold, capstone/thesis approved, faculty signoff row exists, no integrity holds

UI:
- Student dashboard "Academic Standing" card
- Registrar dashboard standing distribution

## PR5 — Phase E: Accreditation Evidence Layer

Migrations:
- `accreditation_evidence` (standard_code, program_id, evidence_type, document_url, status, reviewer_id, reviewed_at)
- `curriculum_review_cycles` (program_id, cycle_year, status, started_at, completed_at, summary)
- `learning_outcome_attainment` (program_id, plo_id, cohort_year, students_assessed, students_attained, attainment_rate)
- `faculty_credential_reviews` (faculty_id, credential_type, document_url, verified_by, verified_at)
- `assessment_effectiveness_reviews` (assessment_id, cycle_year, validity_score, reliability_score, notes)

Admin dashboard `/admin/accreditation-readiness`:
- Per-program readiness score (weighted depth + faculty review + PLO attainment + evidence completeness)
- Gap report: missing evidence, weak programs, faculty review gaps, integrity issues

## PR6 — Phase F: Public Catalog Truthfulness

- `CourseCatalog` + `ProgramDetail` pages: surface `curriculum_maturity` (Accreditation Ready / Pilot / In Development / Internal Distinction / Curriculum Pending) as a visible chip
- Hide accreditation/thesis/practicum claims when not present in DB
- Add disclosure block per program: delivery status, practicum availability, thesis availability, accreditation track
- Catalog query filters out programs that fail depth gate from default listing; advanced filter can show "In Development"

## PR7 — Phase G: Live Classroom Hardening

`LiveAvatarLecture.tsx`:
- Persistent status row: Avatar ●  Audio ●  Mic ●  Provider (D-ID/ElevenLabs/Text-only)
- Auto-reconnect on stream drop (3 retries, exponential backoff), then degrade to text tutor with banner "Avatar provider unavailable — continuing in text mode"
- Latency warning chip when avg RTT > 1500 ms
- Session recovery: store last `session_id` in localStorage, resume on refresh
- Never render avatar `<video>` element when provider unavailable — replace with explicit "Text tutor mode" panel

---

## Technical Notes

- All gates are **enforcement triggers** in Postgres, not application-layer checks, so they cannot be bypassed by direct API calls.
- All scoring functions return raw numbers + reasons; no automatic content creation.
- Tutor memory is per `(user_id, course_id)`, RLS-locked to the student + their faculty + admins.
- Faculty review workflow integrates with the existing `quality_audit_logs` so SUYAS continues to be the single source of governance truth.
- Public catalog change is read-only; no data is rewritten — programs already demoted in last migration stay demoted.

## Out of Scope (explicit)

- Writing actual curriculum content. Empty programs stay empty + honestly labelled.
- Replacing the existing tutor persona file — only extending it.
- Changing the existing economy (SG), auth, or institution model.

---

## Ask Before I Start

PR1 alone is ~6 tables + 3 functions + 2 triggers + 1 admin page. The full 7-PR sequence is roughly 25+ migrations and ~40 edited/created files. I'd like to ship them **one PR at a time, in order A→G**, pausing after each for you to review the migration before I move on. 

**Reply "go" and I'll start with PR1 (Phase A: Curriculum Depth Gates).** Or tell me to reorder / drop phases.
