# Sprint D3.6 — Skill Taxonomy & Skill-Attested Learning

**Status:** Draft (pending approval)
**Depends on:** D3.4 (Faculty Gradebook), D3.5 (Workload Planner)
**Blocks:** D4 (Registrar Operations) — mastery-gated unlock + skill-attested transcripts
**Size:** Small (1 sprint slot, pre-D4)

---

## 1. Goal

Add a lightweight **skill taxonomy** that connects courses, modules, assessments, and student progress to concrete skills — **without changing the academic engine**. Skills complement CLO/PLO mastery, GPA, standing, and graduation; they do not override them.

The output is a queryable, auditable answer to:

- *What skills does this course/module/assessment teach?*
- *What skills has this student demonstrated, at what level, from what evidence?*
- *Where are the gaps between a student's skill profile and their program's declared skills?*

---

## 2. Existing surface (audit)

Already in the database:

| Table | Purpose | Status |
|---|---|---|
| `skills_catalog` | Canonical skill list (name, category, faculty, parent, difficulty, xp, sg) | ✅ exists — reuse as taxonomy root |
| `student_skills` | Per-student skill records | ⚠️ exists — normalize into `student_skill_mastery` view |
| `skill_endorsements` | Peer/faculty endorsement of a `student_skill` | ✅ keep unchanged |
| `course_learning_outcomes` (CLO) | Per-course outcomes | ✅ evidence source — do NOT modify |
| `program_learning_outcomes` (PLO) | Per-program outcomes | ✅ evidence source — do NOT modify |
| `clo_plo_mapping`, `assessment_outcome_alignment`, `learning_outcome_mappings` | Outcome graph | ✅ untouched |
| `student_module_progress.mastery_level` | Module mastery 0-100 | ✅ evidence source |
| `SkillsAssessment.tsx` + `skills-assessment` edge function | Aggregates by *faculty* today | 🔧 extend to aggregate by *skill* |

**Rule:** everything above stays. This sprint only *adds* mapping tables and read-side RPCs.

---

## 3. Schema changes

### 3.1 New mapping tables

All follow the same shape: `(entity_id, skill_id, weight, created_by, created_at)`.

```sql
-- Course → Skill
CREATE TABLE public.course_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source text NOT NULL DEFAULT 'manual', -- manual | backfill | clo_derived
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, skill_id)
);

-- Module → Skill
CREATE TABLE public.module_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, skill_id)
);

-- Assessment → Skill (assignments + divine_assessments; use polymorphic pair)
CREATE TABLE public.assessment_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type text NOT NULL CHECK (assessment_type IN ('assignment','divine_assessment','quiz','exam')),
  assessment_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_type, assessment_id, skill_id)
);
```

### 3.2 Auditable evidence table

```sql
CREATE TABLE public.student_skill_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  mastery_score numeric NOT NULL CHECK (mastery_score BETWEEN 0 AND 100),
  evidence_count integer NOT NULL DEFAULT 0,
  source_type text NOT NULL,     -- module_progress | assessment | endorsement | manual
  source_id uuid,                -- polymorphic pointer to the evidence row
  confidence numeric NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  last_evidence_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id, source_type, source_id)
);
```

Append-mostly. `recompute_student_skill_mastery` rolls these evidence rows up into a per-`(user_id, skill_id)` aggregate exposed by `vw_student_skill_profile`.

### 3.3 Aggregate view (read side)

```sql
CREATE VIEW public.vw_student_skill_profile AS
SELECT
  m.user_id,
  m.skill_id,
  sc.name        AS skill_name,
  sc.category,
  sc.faculty_id,
  ROUND(SUM(m.mastery_score * m.confidence) / NULLIF(SUM(m.confidence),0), 1) AS weighted_mastery,
  SUM(m.evidence_count) AS total_evidence,
  MAX(m.last_evidence_at) AS last_evidence_at
FROM student_skill_mastery m
JOIN skills_catalog sc ON sc.id = m.skill_id
GROUP BY m.user_id, m.skill_id, sc.name, sc.category, sc.faculty_id;
```

### 3.4 GRANTs & RLS

Standard pattern for every new table:

```sql
GRANT SELECT ON public.course_skills, public.module_skills, public.assessment_skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_skills, public.module_skills, public.assessment_skills TO authenticated;
GRANT ALL ON public.course_skills, public.module_skills, public.assessment_skills, public.student_skill_mastery TO service_role;

GRANT SELECT, INSERT ON public.student_skill_mastery TO authenticated;
```

Policies:

- `*_skills` mapping tables → public SELECT; INSERT/UPDATE/DELETE gated to `has_role(auth.uid(),'faculty')` or `'admin'`.
- `student_skill_mastery` → student can SELECT own rows; faculty/advisor SELECT via `advising_assignments`; only the security-definer RPCs INSERT.

---

## 4. RPCs

All `SECURITY DEFINER`, `SET search_path = public`, argument-validated, and audit-logged to `ops_log` (channel `skills`).

| RPC | Purpose | Callers |
|---|---|---|
| `get_student_skill_profile(_student uuid)` | Returns rows from `vw_student_skill_profile` with catalog metadata. Enforces "self, or advisor, or faculty, or admin". | Student profile page, `SkillsAssessment.tsx`, advisor tools |
| `recompute_student_skill_mastery(_student uuid)` | Idempotent recompute: walks `student_module_progress`, graded submissions, and `skill_endorsements`; upserts into `student_skill_mastery` with `source_type` + `source_id` + `confidence`. | Nightly cron; on-demand from student profile |
| `get_course_skill_map(_course uuid)` | Returns skills for a course + rolled-up skills from its modules and assessments (union with weights). | Course detail, module detail, faculty analytics |

**Confidence weights** (initial):
- `module_progress` (completed, mastery ≥ 70): 0.6
- `assessment` (graded, ≥ passing threshold): 0.8
- `endorsement` (faculty): 0.7 · (endorser role weight)
- `manual` (student self-claim): 0.2

Weights are constants inside the RPC — tunable in a follow-up sprint without a schema change.

---

## 5. Backfill

One-shot migration seeder (no destructive writes):

1. **Course → skill** heuristic: match on `courses.title` + `courses.faculty` against `skills_catalog.name` (case-insensitive, token overlap ≥ 2). Insert with `source = 'backfill'`, `weight = 0.5`.
2. **Module → skill** heuristic: match on `course_modules.title`; fall back to parent `course_skills`.
3. **CLO-derived** (optional): if a CLO statement contains a skill name, insert `course_skills` row with `source = 'clo_derived'`, `weight = 0.7`.
4. Every backfill insert is logged to `ops_log` with the matching rule for auditability.

Faculty can later override via the (future) admin UI; this sprint ships **read-only exposure** only.

---

## 6. UI exposure (read-only, minimal)

| Location | Change |
|---|---|
| `src/pages/SkillsAssessment.tsx` | Add a **"Skills"** tab beside the existing "Faculty" aggregation, powered by `get_student_skill_profile`. Reuse existing radar/bar chart components. |
| `src/pages/student/StudentProfilePage.tsx` | New **"Skill profile"** card: top 5 skills by `weighted_mastery`, with evidence counts. |
| Course detail page | Small **"Skills you'll build"** section calling `get_course_skill_map`. |
| Module detail page | Inline chip list of module skills. |
| Faculty analytics (`FacultyGradebook` sidebar, if low-risk) | Roster-level skill coverage summary — read-only, feature-flagged. |

No changes to grading, standing, degree audit, graduation, enrollment, ScrollGold logic, or badge issuance.

---

## 7. Tests

New SQL regression tests under `supabase/tests/`:

- `skill_taxonomy_grants.test.sql` — confirms GRANT + RLS for all four new tables.
- `skill_mastery_recompute.test.sql` — seeds a synthetic student with module progress + one endorsement, calls `recompute_student_skill_mastery`, asserts `weighted_mastery` and `evidence_count` are deterministic.
- `skill_profile_scope.test.sql` — asserts a student cannot read another student's `student_skill_mastery`, but their advisor can.
- `course_skill_map.test.sql` — asserts union rollup of course + module + assessment skills without duplicates.

Wired into `.github/workflows/backend-sql-tests.yml` (already runs on PR).

---

## 8. Out of scope (explicit)

- ❌ LinkedIn "share to profile" — deferred (post-D6).
- ❌ Learning Paths entity — D6.
- ❌ Mastery-gated module unlock — D4 will consume this taxonomy; not built here.
- ❌ Replacing CLO/PLO mastery — skills are complementary.
- ❌ Editing GPA, standing, graduation, enrollment, grade logic.
- ❌ ScrollGold rewards on skill mastery (already have `skills_catalog.scrollgold_value` but no ledger writes this sprint).
- ❌ Admin UI for editing mappings (faculty can propose via future sprint; backfill + manual SQL only for D3.6).

---

## 9. Deliverables

- [ ] Migration: `course_skills`, `module_skills`, `assessment_skills`, `student_skill_mastery`, `vw_student_skill_profile`, GRANTs, RLS.
- [ ] Backfill migration with `ops_log` entries per rule.
- [ ] RPCs: `get_student_skill_profile`, `recompute_student_skill_mastery`, `get_course_skill_map`.
- [ ] `SkillsAssessment.tsx` "Skills" tab.
- [ ] Student profile skill card.
- [ ] Course/module detail skill chips.
- [ ] 4 new SQL regression tests, green in CI.
- [ ] Sprint log entry with readiness delta.
- [ ] ADR update **only if** the confidence-weighting rule is considered architectural (likely not — treat as tunable constant).

---

## 10. Readiness delta (expected after D3.6)

| Area | Before | After |
|---|---|---|
| Faculty operations | 7.5/10 | 7.5/10 (unchanged — no faculty logic touched) |
| Pilot readiness | 8/10 | 8.5/10 (skill-attested transcripts unlock in D4) |
| Registrar prep (D4) | — | **Ready** — skill taxonomy available for mastery gating |

---

## 11. Verdict gate

Approve if the spec includes:

- ✅ Central skill taxonomy (reuses `skills_catalog`).
- ✅ Mapping tables: `course_skills`, `module_skills`, `assessment_skills`, `student_skill_mastery`.
- ✅ Auditable evidence (`source_type`, `source_id`, `confidence`, `last_evidence_at`).
- ✅ RPCs: profile / recompute / course-map.
- ✅ Backfill from titles + CLOs.
- ✅ UI exposure in Skills Assessment, student profile, course/module detail.
- ✅ SQL regression tests + CI.
- ✅ Explicit non-goals protecting the academic engine.

*"The Lord gives wisdom; from His mouth come knowledge and understanding." — Proverbs 2:6*
