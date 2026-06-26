/**
 * Canonical route map (Sprint 1 — 2026-06-26)
 *
 * Resolves duplication identified in the forensic audit. When two pages cover
 * the same intent, the **canonical** route stays active and the **legacy**
 * route is redirected (see `src/App.tsx`). New code should link only to
 * canonical paths. Legacy paths are kept solely to preserve external links;
 * remove them when analytics show no inbound traffic.
 */
export const ROUTE_MAP = {
  // Gold economy — ScrollCoin terminology is forbidden by project memory.
  wallet: { canonical: "/scrollgold-wallet", legacy: ["/scrollcoin", "/scrollcoin-wallet"] },
  leaderboard: { canonical: "/scrollgold-leaderboard", legacy: ["/scrollcoin-leaderboard"] },

  // Course detail
  courseDetail: { canonical: "/courses/:courseId", legacy: ["/courses-detail/:courseId"] },

  // Quiz
  quiz: { canonical: "/quiz/:quizId", legacy: ["/quiz-taking/:quizId"] },

  // Notifications — student portal owns canonical.
  notifications: { canonical: "/student/notifications", legacy: ["/notifications"] },

  // XR / Labs — base pages are canonical, the *Page variants are kept-but-deprecated.
  xrClassrooms: { canonical: "/xr-classrooms", deprecatedComponent: "XRClassroomsPage" },
  virtualLabs: { canonical: "/virtual-labs", deprecatedComponent: "VirtualLabsPage" },
} as const;

export type RouteMapKey = keyof typeof ROUTE_MAP;
