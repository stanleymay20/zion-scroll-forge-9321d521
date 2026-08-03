import { describe, expect, it } from "vitest";
import { getAcademicCourseProfile, getCourseOutcomes } from "./academicRigor";

describe("academic rigor profile", () => {
  it("uses real course outcomes before fallback defaults", () => {
    const outcomes = getCourseOutcomes({
      learning_outcomes: ["Analyze primary sources", "", 42, "Produce a final portfolio"],
    });

    expect(outcomes).toEqual(["Analyze primary sources", "Produce a final portfolio"]);
  });

  it("creates a university-grade course contract when metadata is thin", () => {
    const profile = getAcademicCourseProfile({ title: "Introductory Seminar" }, 8);

    expect(profile.credits).toBe("Credit-bearing pathway");
    expect(profile.workload).toBe("6-9 hrs/week");
    expect(profile.duration).toBe("8 weeks");
    expect(profile.moduleCount).toBe(8);
    expect(profile.assessmentModel).toContain("Final synthesis project");
    expect(profile.syllabusStandard).toContain("Academic integrity, citation, and remediation policy");
  });

  it("derives weekly workload from credits and duration", () => {
    const profile = getAcademicCourseProfile({
      credit_hours: 3,
      duration: "12 weeks",
      estimated_duration_hours: 36,
    });

    expect(profile.credits).toBe("3 credits");
    expect(profile.workload).toBe("9-12 hrs/week");
    expect(profile.duration).toBe("12 weeks");
  });
});
