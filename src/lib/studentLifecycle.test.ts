import { describe, expect, it } from "vitest";
import {
  PRE_INSTITUTION_ROUTES,
  STUDENT_LIFECYCLE_TRANSITIONS,
  canTransitionStudentLifecycle,
  canonicalLifecycleRoutes,
  getLifecycleStatusFallbackRoute,
  getRequiredStudentOnboardingRoute,
  getStudentJourneyStage,
  type StudentLifecycleSnapshot,
} from "./studentLifecycle";

const snapshot = (overrides: Partial<StudentLifecycleSnapshot> = {}): StudentLifecycleSnapshot => ({
  authenticated: true,
  lifecycleStatus: "admitted",
  orientationStepsCompleted: 0,
  matriculated: false,
  learningProfileComplete: false,
  enrollmentCount: 0,
  ...overrides,
});

describe("canonical student lifecycle", () => {
  it("mirrors the governed lifecycle transition graph", () => {
    expect(STUDENT_LIFECYCLE_TRANSITIONS).toEqual({
      applicant: ["admitted", "withdrawn"],
      admitted: ["enrolled", "withdrawn"],
      enrolled: ["active", "withdrawn"],
      active: ["on_leave", "withdrawn", "graduated"],
      on_leave: ["active", "withdrawn"],
      graduated: ["alumni"],
      alumni: ["alumni"],
      withdrawn: [],
    });
    expect(canTransitionStudentLifecycle("applicant", "admitted")).toBe(true);
    expect(canTransitionStudentLifecycle("applicant", "active")).toBe(false);
    expect(canTransitionStudentLifecycle("graduated", "active")).toBe(false);
  });

  it("forces exactly one onboarding milestone at a time", () => {
    expect(getRequiredStudentOnboardingRoute(snapshot())).toBe(canonicalLifecycleRoutes.orientation);
    const oriented = snapshot({ orientationStepsCompleted: 9 });
    expect(getRequiredStudentOnboardingRoute(oriented)).toBe(canonicalLifecycleRoutes.matriculation);
    const staleAdmitted = snapshot({ orientationStepsCompleted: 9, matriculated: true });
    expect(getRequiredStudentOnboardingRoute(staleAdmitted)).toBe(canonicalLifecycleRoutes.matriculation);
    const enrolled = snapshot({ lifecycleStatus: "enrolled", orientationStepsCompleted: 9, matriculated: true });
    expect(getRequiredStudentOnboardingRoute(enrolled)).toBe(canonicalLifecycleRoutes.learningProfile);
    const profiled = snapshot({ lifecycleStatus: "enrolled", orientationStepsCompleted: 9, matriculated: true, learningProfileComplete: true });
    expect(getRequiredStudentOnboardingRoute(profiled)).toBe(canonicalLifecycleRoutes.registration);
    const registered = snapshot({ lifecycleStatus: "active", orientationStepsCompleted: 9, matriculated: true, learningProfileComplete: true, enrollmentCount: 1 });
    expect(getRequiredStudentOnboardingRoute(registered)).toBeNull();
    expect(getStudentJourneyStage(registered)).toBe("active_learning");
  });

  it("keeps applicants out of the academic portal and lets post-study states use record/support policy", () => {
    expect(getRequiredStudentOnboardingRoute(snapshot({ lifecycleStatus: "applicant" }))).toBe(canonicalLifecycleRoutes.apply);
    expect(getRequiredStudentOnboardingRoute(snapshot({ lifecycleStatus: "on_leave" }))).toBeNull();
    expect(getRequiredStudentOnboardingRoute(snapshot({ lifecycleStatus: "graduated" }))).toBeNull();
    expect(getRequiredStudentOnboardingRoute(snapshot({ lifecycleStatus: "alumni" }))).toBeNull();
    expect(getRequiredStudentOnboardingRoute(snapshot({ lifecycleStatus: "withdrawn" }))).toBeNull();
  });

  it("keeps status-only redirects centralized", () => {
    expect(getLifecycleStatusFallbackRoute("applicant")).toBe("/apply");
    expect(getLifecycleStatusFallbackRoute("admitted")).toBe("/orientation");
    expect(getLifecycleStatusFallbackRoute("enrolled")).toBe("/register");
    expect(getLifecycleStatusFallbackRoute("graduated")).toBe("/student/graduation");
    expect(getLifecycleStatusFallbackRoute("alumni")).toBe("/alumni");
  });

  it("allows every pre-institution onboarding milestone through the institution shell", () => {
    expect(PRE_INSTITUTION_ROUTES).toContain("/apply");
    expect(PRE_INSTITUTION_ROUTES).toContain("/orientation");
    expect(PRE_INSTITUTION_ROUTES).toContain("/matriculation");
    expect(PRE_INSTITUTION_ROUTES).toContain("/learning-profile");
  });
});
