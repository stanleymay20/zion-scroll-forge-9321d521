/**
 * Canonical client-side representation of the ScrollUniversity student lifecycle.
 *
 * IMPORTANT: this module never grants academic access and never mutates lifecycle state.
 * Database RPC/RLS authority remains the enforcement boundary. This graph exists so
 * navigation, onboarding and tests cannot drift into competing lifecycle definitions.
 */

export const STUDENT_LIFECYCLE_STATUSES = [
  "applicant", "admitted", "enrolled", "active", "on_leave", "graduated", "alumni", "withdrawn",
] as const;

export type StudentLifecycleStatus = (typeof STUDENT_LIFECYCLE_STATUSES)[number];

export const STUDENT_LIFECYCLE_TRANSITIONS: Readonly<Record<StudentLifecycleStatus, readonly StudentLifecycleStatus[]>> = {
  applicant: ["admitted", "withdrawn"],
  admitted: ["enrolled", "withdrawn"],
  enrolled: ["active", "withdrawn"],
  active: ["on_leave", "withdrawn", "graduated"],
  on_leave: ["active", "withdrawn"],
  graduated: ["alumni"],
  alumni: ["alumni"],
  withdrawn: [],
};

export const canonicalLifecycleRoutes = {
  publicHome: "/",
  signIn: "/auth",
  signUpToApply: "/auth?tab=signup&redirect=/apply",
  apply: "/apply",
  orientation: "/orientation",
  matriculation: "/matriculation",
  learningProfile: "/learning-profile",
  registration: "/register",
  studentDashboard: "/student/dashboard",
  catalog: "/catalog",
  studentIdentity: "/student-identity",
  graduationReadiness: "/student/graduation",
  alumni: "/alumni",
} as const;

export const REQUIRED_ORIENTATION_STEPS = 9;

export type StudentJourneyStage =
  | "account" | "application" | "admissions_review" | "orientation" | "matriculation"
  | "learning_profile" | "registration" | "active_learning" | "on_leave"
  | "graduation_readiness" | "alumni" | "withdrawn";

export interface StudentLifecycleSnapshot {
  authenticated: boolean;
  lifecycleStatus: StudentLifecycleStatus | null;
  orientationStepsCompleted: number;
  matriculated: boolean;
  learningProfileComplete: boolean;
  /** Number of governed section registrations with status=enrolled. */
  enrollmentCount: number;
}

export const CANONICAL_STUDENT_JOURNEY = [
  "Visitor", "Account", "Applicant", "Admissions Review", "Admitted Student", "Orientation",
  "Matriculation", "Learning Profile", "Registration", "Active Learning", "Assessment",
  "Academic Record", "Graduation Readiness", "Alumni",
] as const;

export const PRE_INSTITUTION_ROUTES = [
  canonicalLifecycleRoutes.apply,
  canonicalLifecycleRoutes.orientation,
  canonicalLifecycleRoutes.matriculation,
  canonicalLifecycleRoutes.learningProfile,
  canonicalLifecycleRoutes.studentIdentity,
] as const;

export function isStudentLifecycleStatus(value: unknown): value is StudentLifecycleStatus {
  return typeof value === "string" && (STUDENT_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function normalizeStudentLifecycleStatus(value: unknown): StudentLifecycleStatus | null {
  return isStudentLifecycleStatus(value) ? value : null;
}

export function canTransitionStudentLifecycle(from: StudentLifecycleStatus, to: StudentLifecycleStatus): boolean {
  return STUDENT_LIFECYCLE_TRANSITIONS[from].includes(to);
}

/**
 * Returns the one onboarding route that must be completed before the main portal.
 * Already-active historical students are not forced to reconstruct old milestone rows;
 * the database `active` state remains authoritative. New admissions cannot reach active
 * without the evidence checks enforced by transition_student_status().
 */
export function getRequiredStudentOnboardingRoute(snapshot: StudentLifecycleSnapshot): string | null {
  if (!snapshot.authenticated) return canonicalLifecycleRoutes.signIn;

  const status = snapshot.lifecycleStatus;
  if (!status || status === "applicant") return canonicalLifecycleRoutes.apply;

  if (status === "admitted") {
    if (snapshot.orientationStepsCompleted < REQUIRED_ORIENTATION_STEPS) return canonicalLifecycleRoutes.orientation;
    return canonicalLifecycleRoutes.matriculation;
  }

  if (status === "enrolled") {
    if (snapshot.orientationStepsCompleted < REQUIRED_ORIENTATION_STEPS) return canonicalLifecycleRoutes.orientation;
    if (!snapshot.matriculated) return canonicalLifecycleRoutes.matriculation;
    if (!snapshot.learningProfileComplete) return canonicalLifecycleRoutes.learningProfile;
    // Remain in Registration until the database actually confirms enrolled -> active.
    return canonicalLifecycleRoutes.registration;
  }

  return null;
}

export function getStudentJourneyStage(snapshot: StudentLifecycleSnapshot): StudentJourneyStage {
  if (!snapshot.authenticated) return "account";
  if (!snapshot.lifecycleStatus || snapshot.lifecycleStatus === "applicant") return "application";

  const required = getRequiredStudentOnboardingRoute(snapshot);
  if (required === canonicalLifecycleRoutes.orientation) return "orientation";
  if (required === canonicalLifecycleRoutes.matriculation) return "matriculation";
  if (required === canonicalLifecycleRoutes.learningProfile) return "learning_profile";
  if (required === canonicalLifecycleRoutes.registration) return "registration";

  switch (snapshot.lifecycleStatus) {
    case "admitted": return "admissions_review";
    case "enrolled":
    case "active": return "active_learning";
    case "on_leave": return "on_leave";
    case "graduated": return "graduation_readiness";
    case "alumni": return "alumni";
    case "withdrawn": return "withdrawn";
    default: return "application";
  }
}

export function getLifecycleStatusFallbackRoute(status: StudentLifecycleStatus | null): string {
  switch (status) {
    case "applicant": return canonicalLifecycleRoutes.apply;
    case "admitted": return canonicalLifecycleRoutes.orientation;
    case "enrolled": return canonicalLifecycleRoutes.registration;
    case "active":
    case "on_leave":
    case "withdrawn": return canonicalLifecycleRoutes.studentDashboard;
    case "graduated": return canonicalLifecycleRoutes.graduationReadiness;
    case "alumni": return canonicalLifecycleRoutes.alumni;
    default: return canonicalLifecycleRoutes.apply;
  }
}
