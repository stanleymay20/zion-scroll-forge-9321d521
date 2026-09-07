# ScrollUniversity UI/UX Benchmark and Adoption Record

Reviewed: 2026-09-07

## Decision

ScrollUniversity keeps its existing React/Vite/Tailwind/shadcn stack and mature university routes. We adopt proven design patterns rather than transplanting a third-party application or creating a second University shell.

Reference architecture:

1. **Public landing composition:** `shadcnstore/shadcn-dashboard-landing-template`
2. **Authenticated administration/workspace patterns:** `satnaing/shadcn-admin`
3. **Learning-product interaction reference only:** `learnhouse/learnhouse`
4. **Secondary marketing-section reference:** `leoMirandaa/shadcn-landing-page`

The product keeps its native academic schema, student/faculty/registrar/admin portals, authorization model, database contracts and academic-authority boundaries.

## Licensing boundary

### shadcnstore/shadcn-dashboard-landing-template

- React/Vite + TypeScript + Tailwind + shadcn alignment.
- Useful for hero composition, responsive cards, section rhythm, navigation and CTA hierarchy.
- MIT licensed at review time.
- Repository: https://github.com/shadcnstore/shadcn-dashboard-landing-template

### satnaing/shadcn-admin

- Mature shadcn/Vite administration UX.
- Useful for data-heavy workspaces, responsive tables, search/command patterns, forms, settings and role-oriented navigation.
- MIT licensed at review time.
- Repository: https://github.com/satnaing/shadcn-admin

### learnhouse/learnhouse

- Strong LMS/course-discovery and authoring reference.
- AGPL-3.0 at review time.
- **Reference only. No LearnHouse source code may be copied into ScrollUniversity.**
- Repository: https://github.com/learnhouse/learnhouse

### leoMirandaa/shadcn-landing-page

- Secondary reference for marketing-section patterns.
- MIT licensed at review time.
- Repository: https://github.com/leoMirandaa/shadcn-landing-page

## Native ScrollUniversity information architecture

### Public experience

- Canonical public route: `/` on `scrolluniversity.org`.
- Existing section system: Header → Hero → Stats → Capabilities → Stories → Faculties → Lectures → Journey → Voices → ScrollGold → Prayer → CTA → Footer.
- Improve this existing architecture; do not add a competing `/university/about` product shell.
- Lead with learning value and evidence rather than unsupported institutional prestige claims.
- Keep accreditation and academic-authority transparency one click from the hero.
- Any synthetic, preview or illustrative number must be clearly labelled; public metrics should otherwise be live/evidence-backed.

### Student experience

Priority order:

1. Dashboard / current study state
2. My courses and schedule
3. Learning content
4. Assignments and assessments
5. Progress/outcomes
6. Grades/transcript
7. Advising and degree plan
8. Notifications/profile

### Faculty experience

Priority order:

1. Teaching assignments / sections
2. Student roster
3. Course materials
4. Assessments
5. Gradebook
6. Attendance
7. Learning outcomes
8. Advising/interventions
9. Workload/office hours

### Registrar / academic administration

Priority order:

1. Programme and course governance
2. Terms/sections/registration
3. Student records and standing
4. Progression/completion
5. Faculty authority/load
6. Accreditation evidence and public claims
7. Academic integrity
8. Institutional analytics
9. Interoperability/integrations

## Accessibility and trust rules

- Visible keyboard focus on interactive navigation/cards.
- Semantic headings and labelled navigation.
- Mobile behavior must not rely on hover.
- Tables need responsive or alternate mobile representations.
- Public claims must match the evidence in accreditation/public-claims systems.
- Workload benchmarking must never be presented as awarded/transferable ECTS or other external credit without explicit authority.
- Scalability claims require actual staging/load evidence.
- Do not call an integration LTI Advantage unless LTI Core 1.3 + Deep Linking 2.0 + NRPS 2.0 + AGS 2.0 are implemented and verified.
- SCORM packages are executable content; import must remain trusted-staff-only with private storage and runtime isolation controls.

## First recovered changes

The recovery pass in `repair/scrolluniversity-recovery` has already:

- corrected homepage metadata that previously said users could “earn verifiable degrees” regardless of accreditation evidence;
- changed the hero to describe structured programmes and verifiable learning records instead of making a blanket degree claim;
- surfaced `/accreditation-status` directly from the hero;
- created an academic-credit truth boundary separating ECTS workload benchmarking from formal transcript equivalency.

## Lovable safety rule

Use the existing ScrollUniversity Lovable project only. **Never remix, fork, clone or duplicate any Lovable app without explicit owner approval.**
