# ScrollUniversity Recovery Ledger — 2026-09-07

## Canonical source of truth

- GitHub: `stanleymay20/zion-scroll-forge-9321d521`
- Default branch: `main`
- Supabase project configured by this repository: `klbtvdqfsctrfdkilrmx`
- Production site configured by this repository: `https://scrolluniversity.org`
- Lovable project: existing `zion-scroll-forge` project only.
- **Do not remix, fork, clone, or duplicate a Lovable app without explicit owner approval.**

## Recovery purpose

A substantial ScrollUniversity workstream was mistakenly implemented in the ScrollLibrary repository (`stanleymay20/scroll-wisdom-weave-d69aa349`). This ledger maps the intended capabilities onto the real ScrollUniversity architecture. The recovery rule is **capability recovery, not blind file copying**: preserve stronger native ScrollUniversity implementations, adapt missing hardening to the existing schema, and avoid parallel academic systems.

## Capability matrix

| Intended capability from misplaced work | Native ScrollUniversity state | Recovery action |
| --- | --- | --- |
| Academic institution core | Already extensive: `courses`, `degree_programs`, faculties, sections, enrolments, registrar/faculty/student portals | Do not add parallel `university_*` academic core tables. Strengthen native model only. |
| Student lifecycle | Existing `student_lifecycle` table, lifecycle Edge Function, registrar/student lifecycle UI/tests | Port scaling, integrity and authorization hardening into native lifecycle paths; do not duplicate lifecycle tables. |
| Course readiness governance | Existing `curriculum_status`, `course_evidence_requirements`, module quality evaluator and `v_learning_readiness` | Extend native readiness to distinguish shell / authored / teaching-ready / scheduled / enrollable from evidence. Do not add a second catalogue. |
| Course-content quality | Existing module quality verification and curriculum-depth tooling | Add stricter evidence for course-specific materials/assessments and prevent templated metadata from being mistaken for finished curriculum. |
| Foundation Core source-controlled packs | Six packs were authored in the wrong repo | Evaluate against the real 1,560-course catalogue/programme map before importing. Only add where they fill a real curriculum gap; never duplicate existing courses by title/role. |
| Workload / academic-credit truth | Native schema currently contains explicit Scroll-credit to ECTS/US ratios | Replace equivalency claims with non-award workload-planning language unless an authorized academic body establishes formal transfer/equivalence. |
| Bulk university provisioning | Misplaced repo added hardened roster provisioning | Audit native admissions/account provisioning first; port only missing batch/security controls. Academic roles must never imply organization/system admin. |
| LTI 1.3 Core | No verified native LTI 1.3 implementation located | Adapt the tested OIDC launch/state/claim design to native courses/sections/users, then test against an external LMS. Do not claim LTI Advantage until AGS/NRPS/Deep Linking are implemented. |
| SCORM 1.2/2004 runtime/import | No native SCORM implementation located | Adapt trusted-staff-only private package import, parser hardening, attempt/runtime sessions and learner launch to native courses/enrolments. |
| 1,000-user load evidence | Only archived/simulated load-service references found; no active k6 gate located | Add real staging-only k6 profiles for 100/250/500/1000 VUs. Never claim 1,000 concurrent support before staged evidence. |
| University security contracts | Native production gate already has extensive SQL authority/security suites | Integrate new University-specific regression suites into existing `production-deploy.yml` / SQL tests instead of creating redundant CI systems. |
| Public landing-page redesign | Native landing already has Header/Hero/Stats/Capabilities/Faculties/Journey/etc. | Apply benchmarked shadcn information architecture to native landing; do not replace the app with a second `/university/about` shell. |
| Role-aware student/faculty/admin UX | Native app already has dedicated student, faculty, registrar, admin portals | Improve native shells/navigation and pagination instead of importing the ScrollLibrary workspace components. |
| GitHub UI/UX benchmark | Research completed against shadcn dashboard/landing, shadcn-admin, LearnHouse | Preserve benchmark as design guidance; only MIT-compatible patterns/code may be incorporated. LearnHouse remains reference-only due AGPL. |
| Accreditation/credential claims | Native app includes accreditation-status/transparency surfaces | Audit all public claims and machine-readable credit/equivalency metadata before release. |

## Known real-repo findings to preserve/fix

1. `courses.curriculum_status` already supports `pending_authorship`, `authored`, `faculty_review`, `accreditation_review`, and `approved`.
2. `student_lifecycle` and its Edge Function already exist.
3. A later pedagogy migration re-evaluates module quality with substantive gates; keep it.
4. An older readiness migration mass-filled generic objectives/references/activities and seeded sessions; do not use those backfills as proof of human-authored academic quality.
5. `transcript_equivalency_rules` currently contains numerical Scroll-credit/ECTS/US conversion claims. These require correction to avoid implying awarded or transferable external academic credit without authorization.
6. The active production workflow already fails closed on major security/academic/financial/role boundaries. New checks should extend it rather than bypass it.
7. Direct read access to Supabase project `klbtvdqfsctrfdkilrmx` is not available through the currently connected Supabase account, so live database claims must remain grounded in verified Lovable/database audit evidence until access is available.

## Recovery gates

A recovered capability is not considered complete until:

1. it is implemented against the native ScrollUniversity schema and routes;
2. relevant SQL/RLS/auth tests exist;
3. TypeScript/build/security gates pass on the exact commit;
4. no duplicate catalogue/lifecycle/role system is introduced;
5. public academic-credit/accreditation language remains truthful;
6. the change reaches the canonical repository `main` only after exact-SHA verification;
7. Lovable uses the existing ScrollUniversity project — **no remix without explicit approval**.

## Cleanup of the wrong repository

The mistaken ScrollLibrary merge also contains non-University historical migration repairs and unrelated ScrollLibrary fixes. Therefore the whole merge must **not** be blindly reverted. University-only files and routes will be removed or neutralized separately after their useful intent has been recovered here, preserving unrelated ScrollLibrary repairs.
