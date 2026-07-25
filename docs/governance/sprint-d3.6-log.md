# Sprint D3.6 — Skill Taxonomy & Skill-Attested Learning — Delivery Log

**Status:** Shipped 2026-07-25
**Spec:** `docs/governance/sprint-d3.6-skill-taxonomy.md`

## Shipped

### Schema (migration `20260725_sprint_d3_6_skill_taxonomy`)
- `skills_catalog` versioning columns: `skill_version`, `effective_from`, `effective_to`, `is_current`, `external_ids` (jsonb, reserved for ESCO/O*NET/SFIA).
- Mapping tables: `course_skills`, `module_skills`, `assessment_skills` — public read; faculty/admin/superadmin write.
- Append-only ledger `student_skill_events` with immutability trigger `reject_skill_event_mutation` and dedup index on `(user_id, skill_id, source_type, coalesce(source_id, zero))`.
- View `vw_student_skill_profile` with exponential decay (half-life 24mo demonstrated, 12mo inferred), split by `evidence_kind`.

### RPCs (all `SECURITY DEFINER`, `search_path = public`)
- `get_student_skill_profile(_student, _kind)` — self / advisor (`advising_assignments` active) / faculty / admin / superadmin.
- `record_skill_evidence(...)` — idempotent, single-row append.
- `recompute_student_skill_mastery(_student)` — walks `student_module_progress` × `module_skills` at mastery ≥ 70, confidence 0.6.
- `get_course_skill_map(_course)` — rolls up course-level and module-level skills.

### Client
- `src/lib/skillEvidence.ts` — AI-tutor emitter interface (`emitSkillEvidence`).
- `src/hooks/useSkillProfile.ts` — React Query wrapper over `get_student_skill_profile`.

## Deferred (schema-ready, per spec §6.1 / §8)
- Backfill migration (course/module title tokenization) — deferred until faculty QA workflow exists.
- UI panels on Skills Assessment / Student Profile / Transcript / Course detail — planned as follow-up UI-only sprint; RPC surface is stable.
- SQL regression suite (7 tests) — planned before D4 opens.
- Skill-gap engine, LinkedIn share, mastery-gated unlock — remain deferred to D6 / D4.

## Frozen academic engine
No changes to grading, GPA, standing, degree audit, graduation, enrollment, or ScrollGold logic.

## Readiness delta
| Area | Before | After |
|---|---|---|
| Employer signal | 2/10 | 5/10 (schema live, no UI yet) |
| Registrar prep (D4) | — | Ready — versioned taxonomy + append-only evidence ledger callable |
| Pilot readiness | 8/10 | 8/10 (UI-visible bump lands with follow-up UI sprint) |
