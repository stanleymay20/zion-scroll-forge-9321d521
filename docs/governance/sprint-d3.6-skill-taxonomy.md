# Sprint D3.6 — Skill Taxonomy & Skill-Attested Learning

**Status:** Approved with revisions (2026-07-04) — ready to build
**Depends on:** D3.4 (Faculty Gradebook), D3.5 (Workload Planner)
**Blocks:** D4 (Registrar Operations) — mastery-gated unlock + skill-attested transcripts
**Size:** Small (1 sprint slot, pre-D4)

---

## 1. Goal

Add a lightweight, **versioned** skill taxonomy that connects courses, modules, assessments, and student progress to concrete skills — **without changing the academic engine**. Skills complement CLO/PLO mastery, GPA, standing, and graduation; they do not override them.

The output is a queryable, auditable answer to:

- *What skills does this course/module/assessment teach, at what taxonomy version?*
- *What skills has this student demonstrated (evidence) vs. inferred (soft signals), at what level, from what source, and how fresh is it?*
- *Where are the gaps between a student's skill profile and their program's declared skills?*

---

## 2. Existing surface (audit)

Already in the database:

| Table | Purpose | Status |
|---|---|---|
| `skills_catalog` | Canonical skill list | ✅ reuse as taxonomy root — extend with versioning |
| `student_skills` | Per-student skill records | ⚠️ read-only legacy — superseded by `student_skill_events` projection |
| `skill_endorsements` | Peer/faculty endorsement | ✅ becomes an evidence emitter |
| `course_learning_outcomes` / `program_learning_outcomes` / `clo_plo_mapping` / `assessment_outcome_alignment` / `learning_outcome_mappings` | Outcome graph | ✅ evidence source — do NOT modify |
| `student_module_progress.mastery_level` | Module mastery 0-100 | ✅ evidence source |
| `SkillsAssessment.tsx` + `skills-assessment` edge function | Aggregates by *faculty* today | 🔧 extend to aggregate by *skill* |

Everything above stays. This sprint only *adds* versioning, mapping tables, an append-only evidence ledger, and read-side RPCs.

---

## 3. Schema changes

### 3.1 Skill taxonomy versioning (Edit #1)

Universities evolve curricula; skills must too. A transcript should be able to say *"demonstrated AI Governance v2.1"* five years from now.

Add to `skills_catalog`:

```sql
ALTER TABLE public.skills_catalog
  ADD COLUMN skill_version    text        NOT NULL DEFAULT '1.0',
  ADD COLUMN effective_from   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN effective_to     timestamptz,
  ADD COLUMN is_current       boolean     NOT NULL DEFAULT true,
  ADD COLUMN external_ids     jsonb       NOT NULL DEFAULT '{}'::jsonb;
-- external_ids reserved for future employer mapping (Edit #5): { "esco": "...", "onet": "...", "sfia": "..." }

CREATE UNIQUE INDEX skills_catalog_current_name_uidx
  ON public.skills_catalog (lower(name)) WHERE is_current = true;
```

Retiring a skill = set `is_current=false`, stamp `effective_to`, insert successor row. Evidence keeps pointing at the historical `skill_id`.

### 3.2 Mapping tables

Same shape: `(entity_id, skill_id, weight, source, created_by, created_at)`.

```sql
CREATE TABLE public.course_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  skill_id  uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  weight    numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source    text NOT NULL DEFAULT 'manual', -- manual | backfill | clo_derived
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, skill_id)
);

CREATE TABLE public.module_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  skill_id  uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, skill_id)
);

CREATE TABLE public.assessment_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type text NOT NULL CHECK (assessment_type IN ('assignment','divine_assessment','quiz','exam')),
  assessment_id   uuid NOT NULL,
  skill_id  uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_type, assessment_id, skill_id)
);
```

### 3.3 Append-only evidence ledger (Edit #2 + #3)

Renamed to `student_skill_events` and treated as immutable — no UPDATE, no DELETE. The current profile is a **projection**, mirroring how `ops_log` and other audit trails work.

`evidence_kind` cleanly separates **demonstrated** (Edit #3) from **inferred** signals so the transcript can render them separately.

```sql
CREATE TABLE public.student_skill_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,

  evidence_kind text NOT NULL CHECK (evidence_kind IN ('demonstrated','inferred')),
  source_type   text NOT NULL,     -- module_progress | assessment | endorsement | ai_tutor | manual
  source_id     uuid,              -- polymorphic pointer to the evidence row
  mastery_score numeric NOT NULL CHECK (mastery_score BETWEEN 0 AND 100),
  confidence    numeric NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),

  occurred_at timestamptz NOT NULL DEFAULT now(),  -- when the evidence was earned
  recorded_at timestamptz NOT NULL DEFAULT now(),  -- when we wrote the row

  UNIQUE (user_id, skill_id, source_type, source_id)
);

-- Immutability: block UPDATE/DELETE at the DB level.
CREATE OR REPLACE FUNCTION public.reject_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'student_skill_events is append-only'; END $$;

CREATE TRIGGER student_skill_events_no_update
  BEFORE UPDATE OR DELETE ON public.student_skill_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_mutation();
```

### 3.4 Aggregate view — profile projection with decay (Edit #4)

Confidence decays with time (half-life 24 months for demonstrated, 12 months for inferred). Decay is computed in the view — no batch job needed.

```sql
CREATE OR REPLACE VIEW public.vw_student_skill_profile AS
WITH decayed AS (
  SELECT
    e.user_id,
    e.skill_id,
    e.evidence_kind,
    e.mastery_score,
    -- exponential decay: confidence * 0.5^(months_elapsed / half_life)
    e.confidence * power(
      0.5,
      EXTRACT(EPOCH FROM (now() - e.occurred_at)) / (60*60*24*30) /
      CASE WHEN e.evidence_kind = 'demonstrated' THEN 24 ELSE 12 END
    ) AS current_confidence,
    e.confidence AS original_confidence,
    e.occurred_at
  FROM public.student_skill_events e
)
SELECT
  d.user_id,
  d.skill_id,
  sc.name AS skill_name,
  sc.category,
  sc.faculty_id,
  sc.skill_version,
  d.evidence_kind,
  ROUND(SUM(d.mastery_score * d.current_confidence) / NULLIF(SUM(d.current_confidence),0), 1) AS weighted_mastery,
  ROUND(AVG(d.current_confidence)::numeric, 3) AS avg_current_confidence,
  ROUND(AVG(d.original_confidence)::numeric, 3) AS avg_original_confidence,
  COUNT(*) AS evidence_count,
  MAX(d.occurred_at) AS last_evidence_at
FROM decayed d
JOIN public.skills_catalog sc ON sc.id = d.skill_id
GROUP BY d.user_id, d.skill_id, sc.name, sc.category, sc.faculty_id, sc.skill_version, d.evidence_kind;
```

### 3.5 GRANTs & RLS

```sql
GRANT SELECT ON public.course_skills, public.module_skills, public.assessment_skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_skills, public.module_skills, public.assessment_skills TO authenticated;
GRANT SELECT, INSERT ON public.student_skill_events TO authenticated;
GRANT ALL ON public.course_skills, public.module_skills, public.assessment_skills, public.student_skill_events TO service_role;
```

Policies:

- `*_skills` mapping tables → public SELECT; INSERT/UPDATE/DELETE gated to `has_role(auth.uid(),'faculty')` or `'admin'`.
- `student_skill_events` → student SELECTs own rows; advisor via `advising_assignments`; faculty/admin via `has_role`. INSERT only through security-definer RPCs.

---

## 4. RPCs

All `SECURITY DEFINER`, `SET search_path = public`, argument-validated, audit-logged to `ops_log` (channel `skills`).

| RPC | Purpose | Callers |
|---|---|---|
| `get_student_skill_profile(_student uuid, _kind text default null)` | Rows from `vw_student_skill_profile`, optionally filtered by `evidence_kind`. Enforces self / advisor / faculty / admin. | Student profile, `SkillsAssessment.tsx`, advisor tools |
| `record_skill_evidence(_student, _skill, _evidence_kind, _source_type, _source_id, _mastery, _confidence, _occurred_at)` | Single append into `student_skill_events`. Idempotent on `(user_id, skill_id, source_type, source_id)`. | Recompute job, endorsement trigger, **AI tutor interface (Edit #6)** |
| `recompute_student_skill_mastery(_student uuid)` | Walks `student_module_progress`, graded submissions, `skill_endorsements`; appends any missing evidence rows. Never mutates existing ones. | Nightly cron; on-demand |
| `get_course_skill_map(_course uuid)` | Skills for a course + rolled-up module + assessment skills. | Course/module detail, faculty analytics |

**Confidence weights** (initial constants inside `recompute_student_skill_mastery`):

| Source | Kind | Confidence |
|---|---|---|
| `module_progress` (mastery ≥ 70) | demonstrated | 0.6 |
| `assessment` (≥ passing) | demonstrated | 0.8 |
| `endorsement` (faculty) | demonstrated | 0.7 · endorser weight |
| `ai_tutor` (session-emitted) | inferred | 0.3 |
| `manual` (student self-claim) | inferred | 0.2 |

### 4.1 AI tutor emitter interface (Edit #6 — interface only)

No implementation this sprint. Define the contract so avatars can later plug in:

```ts
// src/lib/skillEvidence.ts (stub)
export interface SkillEvidencePayload {
  studentId: string;
  skillId: string;
  evidenceKind: 'demonstrated' | 'inferred';
  sourceType: 'ai_tutor';
  sourceId: string;           // tutor session id
  masteryScore: number;       // 0-100
  confidence: number;         // 0-1
  occurredAt?: string;
}
export async function emitSkillEvidence(p: SkillEvidencePayload): Promise<void> {
  // wraps supabase.rpc('record_skill_evidence', ...)
}
```

---

## 5. Backfill

One-shot migration seeder (append-only, no destructive writes):

1. **Course → skill** — token overlap ≥ 2 between `courses.title/faculty` and `skills_catalog.name`. `source='backfill'`, `weight=0.5`.
2. **Module → skill** — token overlap on `course_modules.title`; fall back to parent `course_skills`.
3. **CLO-derived** — if a CLO statement contains a skill name, insert `course_skills` with `source='clo_derived'`, `weight=0.7`.
4. Each backfill insert logs to `ops_log` with the matching rule.

Explicitly **not** using AI extraction from lecture transcripts (per approval note — noisy signal, faculty-reviewed mappings are higher quality).

---

## 6. UI exposure (read-only, minimal)

| Location | Change |
|---|---|
| `src/pages/SkillsAssessment.tsx` | Add **"Skills"** tab beside "Faculty" aggregation; split panels for **Demonstrated** vs **Inferred** (Edit #3). |
| `src/pages/student/StudentProfilePage.tsx` | **"Skill profile"** card — top 5 demonstrated skills by `weighted_mastery`, with evidence counts and freshness. |
| `src/pages/student/StudentTranscriptPage.tsx` | Add a second panel **"Skill Transcript"** alongside the academic transcript (Edit #8). Read-only, no PDF issuance yet. |
| Course detail page | **"Skills you'll build"** section via `get_course_skill_map`. |
| Module detail page | Inline chip list of module skills. |
| Faculty analytics (feature-flagged) | Roster-level skill coverage summary. |

No changes to grading, standing, degree audit, graduation, enrollment, ScrollGold logic, or badge issuance.

### 6.1 Reserved for later (schema hooks only)

- **Skill gap engine (Edit #7)** — schema already supports it: `program_learning_outcomes` × `vw_student_skill_profile` diff → recommended modules via `module_skills`. Build in D6.
- **Employer mapping (Edit #5)** — `skills_catalog.external_ids` jsonb column already reserved.
- **Skill Transcript PDF issuance** — after D4.

---

## 7. Tests

New SQL regression tests under `supabase/tests/`:

- `skill_taxonomy_grants.test.sql` — GRANT + RLS for all four new tables.
- `skill_taxonomy_versioning.test.sql` — retiring a skill preserves historical evidence.
- `skill_events_immutable.test.sql` — asserts UPDATE and DELETE on `student_skill_events` raise.
- `skill_mastery_recompute.test.sql` — synthetic student, module progress + endorsement → deterministic `weighted_mastery`, `evidence_count`, and decay-adjusted confidence.
- `skill_events_kind_split.test.sql` — demonstrated vs inferred aggregate separately.
- `skill_profile_scope.test.sql` — a student cannot read another student's events; advisor can.
- `course_skill_map.test.sql` — union rollup without duplicates.

Wired into `.github/workflows/backend-sql-tests.yml`.

---

## 8. Out of scope (explicit)

- ❌ AI extraction from lecture transcripts (rejected — noisy).
- ❌ LinkedIn "share to profile" — post-D6.
- ❌ Learning Paths entity — D6.
- ❌ Mastery-gated module unlock — D4 will consume this taxonomy; not built here.
- ❌ Replacing CLO/PLO mastery — skills are complementary.
- ❌ Editing GPA, standing, graduation, enrollment, grade logic.
- ❌ ScrollGold rewards on skill mastery.
- ❌ Admin UI for editing mappings.
- ❌ Skill gap engine implementation (schema-ready; built in D6).
- ❌ AI tutor evidence emission (interface only this sprint).

---

## 9. Deliverables

- [ ] Migration: `skills_catalog` versioning columns, `course_skills`, `module_skills`, `assessment_skills`, `student_skill_events` (with append-only trigger), `vw_student_skill_profile` (with decay), GRANTs, RLS.
- [ ] Backfill migration with `ops_log` entries per rule.
- [ ] RPCs: `get_student_skill_profile`, `record_skill_evidence`, `recompute_student_skill_mastery`, `get_course_skill_map`.
- [ ] `src/lib/skillEvidence.ts` — AI tutor emitter interface stub.
- [ ] `SkillsAssessment.tsx` "Skills" tab with demonstrated/inferred split.
- [ ] Student profile skill card.
- [ ] Student Transcript page "Skill Transcript" panel.
- [ ] Course/module detail skill chips.
- [ ] 7 SQL regression tests, green in CI.
- [ ] Sprint log entry with readiness delta.
- [ ] ADR update — versioning + append-only ledger + decay model are architectural.

---

## 10. Readiness delta (expected after D3.6)

| Area | Before | After |
|---|---|---|
| Faculty operations | 7.5/10 | 7.5/10 (unchanged) |
| Pilot readiness | 8/10 | 8.5/10 |
| Registrar prep (D4) | — | **Ready** — versioned skill taxonomy + evidence ledger available for mastery gating and skill-attested transcripts |
| Employer signal | 2/10 | 6/10 — skill transcript with evidence, decay, and demonstrated/inferred split |

---

## 11. Revision log

**2026-07-04 — Approved with edits (9.7/10):**
1. ✅ Skill versioning (`skill_version`, `effective_from/to`, `is_current`).
2. ✅ Immutable evidence — renamed to `student_skill_events`, append-only trigger, projection view.
3. ✅ Demonstrated vs inferred split (`evidence_kind` column, UI panels).
4. ✅ Skill decay (exponential, half-life in view).
5. ✅ Employer mapping reserved (`external_ids` jsonb).
6. ✅ AI tutor `emitSkillEvidence` interface stub.
7. ✅ Skill gap engine — schema-ready, built in D6.
8. ✅ Skill Transcript panel alongside academic transcript.
9. ❌ AI extraction from lecture transcripts — rejected.

*"The Lord gives wisdom; from His mouth come knowledge and understanding." — Proverbs 2:6*
