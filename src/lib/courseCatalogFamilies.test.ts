import { describe, expect, it } from "vitest";
import {
  formatCourseLevel,
  groupCourseFamilies,
  normalizeCourseIdentityText,
} from "./courseCatalogFamilies";

type TestCourse = {
  id: string;
  title: string;
  faculty: string | null;
  faculty_id: string | null;
  institution_id: string | null;
  level: string | null;
  curriculum_status?: string | null;
  description?: string | null;
  created_at?: string | null;
};

const base = (overrides: Partial<TestCourse>): TestCourse => ({
  id: crypto.randomUUID(),
  title: "Foundations of Scroll Technology",
  faculty: "Scroll Technology",
  faculty_id: null,
  institution_id: "inst-1",
  level: "ScrollDiploma",
  curriculum_status: "pending_authorship",
  description: "Auto-generated curriculum course for the Scroll Technology faculty.",
  created_at: "2026-06-26T12:15:46.759Z",
  ...overrides,
});

describe("course catalogue families", () => {
  it("normalizes identity text without changing the visible title", () => {
    expect(normalizeCourseIdentityText("  Academic   Writing AND Research Skills ")).toBe(
      "academic writing and research skills"
    );
  });

  it("groups one faculty/title across academic levels into a single family", () => {
    const rows = [
      base({ id: "diploma", level: "ScrollDiploma" }),
      base({ id: "master", level: "ScrollMaster" }),
      base({ id: "doctorate", level: "ScrollDoctorate" }),
    ];

    const families = groupCourseFamilies(rows);

    expect(families).toHaveLength(1);
    expect(families[0].variants.map((course) => course.id)).toEqual(["diploma", "master", "doctorate"]);
    expect(families[0].collapsedRows).toBe(0);
  });

  it("never combines the same title from different faculties", () => {
    const families = groupCourseFamilies([
      base({ id: "tech", faculty: "Scroll Technology" }),
      base({ id: "science", faculty: "Scroll Science" }),
    ]);

    expect(families).toHaveLength(2);
  });

  it("uses faculty text as the legacy grouping authority when faculty_id is missing", () => {
    const families = groupCourseFamilies([
      base({ id: "legacy", faculty_id: null, level: "ScrollMaster" }),
      base({ id: "linked", faculty_id: "faculty-tech", level: "ScrollDoctorate" }),
    ]);

    expect(families).toHaveLength(1);
    expect(families[0].variants).toHaveLength(2);
  });

  it("collapses same-level duplicate rows and prefers the stronger academic record", () => {
    const families = groupCourseFamilies([
      base({ id: "placeholder", level: "ScrollMaster" }),
      base({
        id: "approved",
        level: "ScrollMaster",
        curriculum_status: "approved",
        description: "A faculty-authored, independently reviewed course description.",
      }),
    ]);

    expect(families).toHaveLength(1);
    expect(families[0].variants).toHaveLength(1);
    expect(families[0].variants[0].id).toBe("approved");
    expect(families[0].collapsedRows).toBe(1);
  });

  it("formats Scroll-prefixed academic levels for compact catalogue badges", () => {
    expect(formatCourseLevel("ScrollMaster")).toBe("Master");
    expect(formatCourseLevel("Advanced")).toBe("Advanced");
  });
});
