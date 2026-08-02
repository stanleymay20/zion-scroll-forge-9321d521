# ScrollUniversity Learning and Onboarding Readiness Audit

Audit date: 2026-08-02
Branch: `main`
Live site: https://scrolluniversity.org/
Live deployment observed: `700c91aa-a073-4140-93d1-2c6e0711ee26`

## Executive Status

ScrollUniversity has the core pieces for a real learning lifecycle: public discovery, account creation, application, admissions state handling, orientation, matriculation, student identity, catalog browsing, course learning, AI tutors, and a student portal.

The main readiness gap is systemization. The learner path existed in multiple places, but default handoffs mixed the legacy `/dashboard` route with the newer `/student/*` portal. This pass centralizes the canonical onboarding route map and points the most important entry and completion states toward the student portal, orientation, matriculation, catalog, and student identity routes.

## Canonical Learner Journey

1. Discover: `/`
2. Explore catalog: `/catalog`
3. Create account and apply: `/auth?tab=signup&redirect=/apply`
4. Submit application: `/apply`
5. Track status from student portal: `/student/dashboard`
6. Begin admitted-student orientation: `/orientation`
7. Complete matriculation oath: `/matriculation`
8. Confirm student identity: `/student-identity`
9. Enroll or continue learning: `/catalog`, `/courses/:courseId/learn`, `/student/courses`
10. Manage academic progress: `/student/dashboard`, `/student/degree-audit`, `/student/transcript`, `/student/advising`

The route constants now live in `src/lib/onboardingRoutes.ts`.

## Live Site Checks

Checked on 2026-08-02:

| Endpoint | Result | Notes |
| --- | --- | --- |
| `/` | 200 | HTML served through Cloudflare/Lovable deployment. |
| `/auth` | 200 | SPA route is reachable. |
| `/courses` | 200 | Live route responds; local app redirects canonical browsing to `/catalog`. |
| `/robots.txt` | 200 | Present. This pass adds sitemap reference. |
| `/sitemap.xml` | 404 | Missing on live deployment. This pass adds `public/sitemap.xml` for next redeploy. |

Observed response headers include HSTS, `Referrer-Policy`, and `X-Content-Type-Options`. The live response did not show a strict `Content-Security-Policy`, `X-Frame-Options`, or `Permissions-Policy`; those should be handled in the hosting layer if Lovable supports custom headers.

## Repository Verification

| Check | Result | Notes |
| --- | --- | --- |
| `git status --short --branch` before edits | Clean on `main` | Local branch matched `origin/main` after fast-forward. |
| `npm ci` | Pass | 674 packages installed. |
| `npm run build` | Pass | Vite production build completed. |
| `npm test -- --run` | Fail | `src/components/learning/LiveAvatarLecture.test.tsx` has 2 failing tests around delivery status text expectations. |
| `npm run lint` | Fail | Existing large lint debt: 1619 errors, mostly `no-explicit-any`, plus hook-order and hook-dependency issues. |
| `npm audit --audit-level=moderate` | Fail | 7 vulnerabilities: high issues in `brace-expansion`, `dompurify`, `postcss`; moderate issues in `esbuild`/`vite` and `react-router`. Some fixes require major upgrades. |

## Improvements Made

| Area | Change |
| --- | --- |
| Route systemization | Added `src/lib/onboardingRoutes.ts` as the canonical learner flow map. |
| Homepage CTAs | Sends signed-in learners to `/student/dashboard`; sends applicants to signup with `/apply` redirect; sends catalog browsing to `/catalog`. |
| Auth default | Safe redirect fallback now lands on `/student/dashboard` instead of legacy `/dashboard`. |
| Admissions handoff | Accepted applicants are sent to orientation instead of a generic dashboard. |
| Orientation and matriculation | Back/continue states now use student portal, matriculation, catalog, and student identity route constants. |
| Learning profile | Completion and skip now return to `/student/dashboard`. |
| Metadata | Updated root title and description to emphasize structured learning and onboarding rather than hype-first positioning. |
| SEO | Added `public/sitemap.xml` and linked it from `public/robots.txt`. |

## Priority Readiness Gaps

### P0 - Release Gates

1. Fix the failing `LiveAvatarLecture` tests or update the assertions to match the current truthful delivery-state UI.
2. Triage `npm audit` with care:
   - Safe `npm audit fix` candidates: `brace-expansion`, `dompurify`, `postcss`.
   - Breaking candidates: `vite`/`esbuild`, `react-router`/`react-router-dom` may require migration testing.
3. Reduce lint scope or fix critical lint classes. At minimum, hook-order errors should block release because they can become runtime defects.

### P1 - Learner Onboarding

1. Add an explicit post-verification decision route that sends learners to:
   - `/apply` if no application exists.
   - `/student/dashboard` if application is submitted or under review.
   - `/orientation` if accepted and not oriented.
   - `/matriculation` if orientation is complete and oath is not signed.
   - `/student/dashboard` when fully active.
2. Add onboarding coverage tests for route decisions, safe redirects, orientation completion, and matriculation completion.
3. Make `/student/dashboard` the visible learner home throughout navigation while keeping `/dashboard` only as legacy/admin-compatible fallback.

### P2 - Public Trust and Structure

1. Replace the social preview image URL with a stable owned asset under `public/` or a controlled CDN path.
2. Add hosting-level security headers where supported:
   - `Content-Security-Policy`
   - `X-Frame-Options` or CSP `frame-ancestors`
   - `Permissions-Policy`
3. Keep public claims learner-centered and verifiable: program levels, admission steps, identity, orientation, credentials, and student support.

## Main Branch Deployment Rule

Lovable redeployment uses `main`. Future implementation commits for production should be made from `main`, verified locally, and pushed to `origin/main` only after the release gates above are intentionally accepted or resolved.

