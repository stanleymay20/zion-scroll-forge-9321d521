export type CourseFamilyIdentity = {
  id: string;
  title: string;
  faculty?: string | null;
  faculty_id?: string | null;
  institution_id?: string | null;
  level?: string | null;
  curriculum_status?: string | null;
  visibility?: string | null;
  description?: string | null;
  created_at?: string | null;
};

export type CourseFamily<T extends CourseFamilyIdentity> = {
  key: string;
  title: string;
  faculty: string | null;
  variants: T[];
  representative: T;
  collapsedRows: number;
};

const LEVEL_ORDER = [
  "scrollcertificate",
  "beginner",
  "scrolldiploma",
  "intermediate",
  "scrollbachelor",
  "advanced",
  "scrollmaster",
  "scrolldoctorate",
  "scrollexousia",
  "foundation",
  "capstone",
  "unspecified",
];

const STATUS_RANK: Record<string, number> = {
  approved: 5,
  accreditation_review: 4,
  faculty_review: 3,
  authored: 2,
  pending_authorship: 1,
};

export function normalizeCourseIdentityText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatCourseLevel(level: string | null | undefined): string {
  if (!level) return "Unspecified";
  return level.startsWith("Scroll") ? level.slice("Scroll".length) : level;
}

export function courseLevelRank(level: string | null | undefined): number {
  const normalized = normalizeCourseIdentityText(level) || "unspecified";
  const index = LEVEL_ORDER.indexOf(normalized);
  return index === -1 ? LEVEL_ORDER.length : index;
}

function familyKey(course: CourseFamilyIdentity): string {
  const institution = course.institution_id ?? "default";
  const faculty = normalizeCourseIdentityText(course.faculty) || course.faculty_id || "other";
  const title = normalizeCourseIdentityText(course.title);
  return `${institution}::${faculty}::${title}`;
}

function variantKey(course: CourseFamilyIdentity): string {
  return normalizeCourseIdentityText(course.level) || "unspecified";
}

function placeholderDescription(description: string | null | undefined): boolean {
  const value = (description ?? "").trim();
  return !value || value === "**" || /auto-generated curriculum course/i.test(value);
}

function compareRepresentativeQuality(a: CourseFamilyIdentity, b: CourseFamilyIdentity): number {
  const statusDelta = (STATUS_RANK[b.curriculum_status ?? ""] ?? 0) - (STATUS_RANK[a.curriculum_status ?? ""] ?? 0);
  if (statusDelta !== 0) return statusDelta;

  const aPlaceholder = placeholderDescription(a.description) ? 1 : 0;
  const bPlaceholder = placeholderDescription(b.description) ? 1 : 0;
  if (aPlaceholder !== bPlaceholder) return aPlaceholder - bPlaceholder;

  const descriptionDelta = (b.description?.length ?? 0) - (a.description?.length ?? 0);
  if (descriptionDelta !== 0) return descriptionDelta;

  const aCreated = a.created_at ? Date.parse(a.created_at) : Number.POSITIVE_INFINITY;
  const bCreated = b.created_at ? Date.parse(b.created_at) : Number.POSITIVE_INFINITY;
  if (aCreated !== bCreated) return aCreated - bCreated;

  return a.id.localeCompare(b.id);
}

export function groupCourseFamilies<T extends CourseFamilyIdentity>(courses: T[]): CourseFamily<T>[] {
  const families = new Map<string, { firstIndex: number; rows: T[] }>();

  courses.forEach((course, index) => {
    const key = familyKey(course);
    const current = families.get(key);
    if (current) current.rows.push(course);
    else families.set(key, { firstIndex: index, rows: [course] });
  });

  return Array.from(families.entries())
    .map(([key, family]) => {
      const byLevel = new Map<string, T>();

      family.rows.forEach((course) => {
        const level = variantKey(course);
        const current = byLevel.get(level);
        if (!current || compareRepresentativeQuality(course, current) < 0) {
          byLevel.set(level, course);
        }
      });

      const variants = Array.from(byLevel.values()).sort((a, b) => {
        const rankDelta = courseLevelRank(a.level) - courseLevelRank(b.level);
        if (rankDelta !== 0) return rankDelta;
        return (a.level ?? "").localeCompare(b.level ?? "");
      });

      const representative = [...variants].sort(compareRepresentativeQuality)[0];

      return {
        key,
        title: representative.title,
        faculty: representative.faculty ?? null,
        variants,
        representative,
        collapsedRows: family.rows.length - variants.length,
        firstIndex: family.firstIndex,
      };
    })
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map(({ firstIndex: _firstIndex, ...family }) => family);
}
