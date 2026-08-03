type CourseLike = {
  title?: string | null;
  faculty?: string | null;
  level?: string | null;
  credit_hours?: number | null;
  estimated_duration_hours?: number | null;
  duration?: string | null;
  learning_outcomes?: unknown;
};

const DEFAULT_OUTCOMES = [
  "Explain the discipline's core questions, methods, and vocabulary with precision.",
  "Apply course concepts to supervised practice, cases, or technical work.",
  "Evaluate evidence, cite sources responsibly, and defend conclusions in writing.",
  "Produce a final artifact that demonstrates transferable mastery.",
];

const ASSESSMENT_MODEL = [
  "Weekly formative checks",
  "Applied assignment portfolio",
  "Faculty or AI-supported feedback cycle",
  "Final synthesis project",
];

const SUPPORT_MODEL = [
  "AI tutor available for guided practice",
  "Advising and progress checkpoints",
  "Peer discussion and cohort accountability",
  "Remediation path before high-stakes completion",
];

const QUALITY_STANDARDS = [
  "Evidence-based reasoning",
  "Original work with proper citation",
  "Outcome mastery before completion",
  "Transparent credential record",
];

function parseWeeks(duration?: string | null): number | null {
  if (!duration) return null;
  const match = duration.match(/(\d+(?:\.\d+)?)\s*(week|wk|month|mo)/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return /month|mo/i.test(match[2]) ? Math.round(value * 4) : Math.round(value);
}

export function getCourseOutcomes(course: CourseLike): string[] {
  return Array.isArray(course.learning_outcomes) && course.learning_outcomes.length > 0
    ? course.learning_outcomes.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : DEFAULT_OUTCOMES;
}

export function getAcademicCourseProfile(course: CourseLike, moduleCount = 0) {
  const credits = Number(course.credit_hours ?? 0);
  const estimatedHours = Number(course.estimated_duration_hours ?? 0);
  const weeks = parseWeeks(course.duration) ?? (estimatedHours >= 24 ? Math.max(4, Math.round(estimatedHours / 6)) : 8);
  const workload = credits > 0
    ? `${credits * 3}-${credits * 4} hrs/week`
    : estimatedHours > 0
      ? `${Math.max(3, Math.ceil(estimatedHours / weeks))} hrs/week`
      : "6-9 hrs/week";

  return {
    level: course.level || "University",
    credits: credits > 0 ? `${credits} credits` : "Credit-bearing pathway",
    duration: course.duration || `${weeks} weeks`,
    workload,
    moduleCount,
    outcomes: getCourseOutcomes(course),
    assessmentModel: ASSESSMENT_MODEL,
    supportModel: SUPPORT_MODEL,
    qualityStandards: QUALITY_STANDARDS,
    weeklyCadence: [
      "Read or watch the core lecture material",
      "Complete guided practice and checkpoint prompts",
      "Use AI tutor support to close gaps",
      "Submit reflection or applied work for mastery evidence",
    ],
  };
}

