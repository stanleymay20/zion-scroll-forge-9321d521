# ScrollUniversity — P0: degree-graduation evidence must fail closed
Date: 2026-10-18 | Status: source remediation candidate only (NOT deployed)

## Evidence / risk
- Historical `evaluate_graduation_candidate(uuid)` implementations (May/June 2026) wrote `TRUE` for capstone, thesis, faculty-signoff, and spiritual-formation requirements without independently verified evidence.
- The latest relevant June migration (20260626191306) **does** compute PLO mastery from student outcomes and includes a documented override, but still writes `true, true, true` for `capstone_approved`, `thesis_approved`, `faculty_signoff` and `true, true` for formation/capstone fields in graduation candidates.
- When graduation is commercially enabled, these placeholders could incorrectly confer eligibility. Do not infer they have actually produced improperly awarded degrees: no live student record or credential was tested.
- The actual Cloud function definition and any downstream alternative issuance paths still require independent live verification. This candidate addresses only the named evaluator.

## Controlled remediation
- A new SQL migration replaces `evaluate_graduation_candidate(uuid)` with an explicit `55000` `graduation_evidence_unverified` exception.
- The call has **no side effects**. It cannot generate candidate rows, verification checks, institutional approvals or academic credits.
- Return type `jsonb` and function name remain stable, and trusted `service_role` retains EXECUTE for compatibility once a genuinely evidenced implementation replaces this hold. Browser roles have EXECUTE revoked.
- A blocking SQL regression test verifies caller permissions, an explicit denial even to a trusted test owner, and unchanged graduation/eligibility tables for a synthetic UUID.
- The test runs in both pre-existing repository CI workflows. It must NOT be misrepresented as a commercial degree-delivery PASS: it proves a safe **NO-GO** graduation state.

## Explicit release consequences
- Degree evaluation will intentionally fail rather than declaring completion. Legacy simulator and batch paths that attempt graduation must treat this exception as an expected policy denial, never synthesize a successful status.
- Do not use generic `try/catch` success fallbacks, client-only flags, or false accreditation/degree equivalence claims.
- Production database and the live Lovable app are **untouched**. Main branch is untouched.
- Until independent academic evidence contracts, supervised faculty/registrar approval, proof of degree-awarding authority, appeal/revocation and verified credential issuance exist, do not enable degree graduation or paid degree enrollment.
- Non-degree course completion certificates are separate and still require validated real learning and financial acceptance.

## Follow-up tests / blockers
1. Verify current Lovable-managed function body, EXECUTE ACL, owners and legacy trigger/batch callers.
2. Object-level migration reconciliation in controlled staging, backup restore and representative authorized user acceptance.
3. Investigate all other places that write `graduation_candidates`, `graduation_eligibility_checks`, `issued_credentials` or `graduations`.
4. Publish an actual evidence-backed, human-reviewed degree evaluation only after legal/institutional recognition and grading are verified.
5. Stage all approved source PRs with exact-head green CI; never replay migrations blindly.

**Commercial release decision: NO-GO for degree programmes.**

## CI bootstrap fidelity limitation
The repository's tolerant historical-migration bootstrap may omit `graduation_candidates` and `graduation_eligibility_checks`. The blocking regression creates **minimal synthetic tables only inside its BEGIN/ROLLBACK transaction when absent**, allowing its actual no-write assertion to run rather than silently skipping. A passing result proves the function denies calls without writing to that test tracking schema; it does **not** prove the complete production graduation schema, and should not be treated as an end-to-end degree issuance test. A populated staging schema test with full real constraints remains mandatory.
