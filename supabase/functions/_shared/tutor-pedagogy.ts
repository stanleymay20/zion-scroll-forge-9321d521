// ============================================================
// ScrollUniversity — Tutor Pedagogy Engine
// Mode-specific scaffolding for the AI tutor. Pure functions —
// no AI calls, no content generation. Caller passes student
// memory + intent, gets back: chosen mode, mode-specific
// instruction block, intervention decision.
// ============================================================

export type TeachingMode =
  | "lecture"
  | "socratic"
  | "coaching"
  | "revision"
  | "assessment_prep"
  | "practicum_reflection";

export interface TutorStudentMemory {
  misconceptions: string[];
  strengths: string[];
  weak_areas: string[];
  last_topics: string[];
  preferred_pace: "slow" | "balanced" | "fast";
  current_mode: TeachingMode;
  consecutive_low_scores: number;
  intervention_flag: boolean;
}

export const EMPTY_MEMORY: TutorStudentMemory = {
  misconceptions: [],
  strengths: [],
  weak_areas: [],
  last_topics: [],
  preferred_pace: "balanced",
  current_mode: "lecture",
  consecutive_low_scores: 0,
  intervention_flag: false,
};

export interface PedagogyInput {
  /** Student-stated intent for this turn, free text — used as hint only. */
  intent?: string | null;
  /** Optional explicit mode override from the caller (e.g. UI button). */
  modeOverride?: TeachingMode | null;
  /** Most recent score on a graded artifact in this course, 0–100. */
  lastAssessmentScore?: number | null;
  memory: TutorStudentMemory;
}

export interface PedagogyDecision {
  mode: TeachingMode;
  modeInstructions: string;
  shouldIntervene: boolean;
  interventionReason: string | null;
  /** Updated memory the edge function should persist. */
  nextMemory: TutorStudentMemory;
}

const LOW_SCORE_THRESHOLD = 65;
const INTERVENTION_TRIGGER = 3;

const MODE_BLOCKS: Record<TeachingMode, string> = {
  lecture: `
[MODE: LECTURE]
- Lead with the core idea, then build supporting depth in 2–3 layers.
- Use concrete examples drawn from this course's discipline before abstractions.
- Close with one question that checks for genuine understanding (not recall).
`.trim(),

  socratic: `
[MODE: SOCRATIC]
- Ask one well-formed question at a time. Do NOT deliver a mini-lecture before the question.
- Respond to the student's answer by acknowledging what's right, then probing what's missing.
- Avoid yes/no questions. Aim for "why", "how", "what would change if…".
`.trim(),

  coaching: `
[MODE: COACHING]
- The student is working on a task. Diagnose where they are stuck before prescribing.
- Offer the smallest next step that unblocks them, not the full solution.
- Reflect back their thinking so they can see it; build their confidence honestly.
`.trim(),

  revision: `
[MODE: REVISION]
- The student is struggling. Slow down. Re-explain the prerequisite idea in plainer words.
- Tie the new concept back to something already in their "strengths".
- After re-explaining, give one small practice attempt — never overload with new material.
- Be gentle. Never shame confusion.
`.trim(),

  assessment_prep: `
[MODE: ASSESSMENT PREP]
- Focus tightly on the learning outcomes for the upcoming assessment.
- Walk through the rubric in plain language; show what "good" looks like vs "weak".
- Practice with one representative item, then ask the student to attempt the next one.
- Do not give the answer to a graded item directly; teach the method.
`.trim(),

  practicum_reflection: `
[MODE: PRACTICUM REFLECTION]
- This is an applied/field exercise. Ask what happened, what surprised them, what they would do differently.
- Bridge experience back to course concepts and any vocational/calling framing.
- Help them write a short reflection they could submit; do not write it for them.
`.trim(),
};

/** Crude intent classifier — string heuristics, no AI call. */
function classifyIntent(intent?: string | null): TeachingMode | null {
  if (!intent) return null;
  const t = intent.toLowerCase();
  if (/\b(quiz|test|exam|midterm|final|assessment|rubric)\b/.test(t)) return "assessment_prep";
  if (/\b(stuck|confus|don'?t (get|understand)|lost|hard|struggling)\b/.test(t)) return "revision";
  if (/\b(field|practicum|placement|internship|reflect|reflection)\b/.test(t)) return "practicum_reflection";
  if (/\b(working on|building|writing|drafting|coding|designing|debug)\b/.test(t)) return "coaching";
  if (/\b(why|how come|what if|argue|debate|critique)\b/.test(t)) return "socratic";
  return null;
}

export function decidePedagogy(input: PedagogyInput): PedagogyDecision {
  const mem = { ...EMPTY_MEMORY, ...input.memory };

  // 1. Update score streak from the most recent score (if provided).
  let consecutive = mem.consecutive_low_scores;
  if (typeof input.lastAssessmentScore === "number") {
    consecutive = input.lastAssessmentScore < LOW_SCORE_THRESHOLD
      ? consecutive + 1
      : 0;
  }
  const shouldIntervene = consecutive >= INTERVENTION_TRIGGER;

  // 2. Choose mode: explicit override > intervention > intent > prior mode > lecture
  let mode: TeachingMode;
  let interventionReason: string | null = null;
  if (input.modeOverride) {
    mode = input.modeOverride;
  } else if (shouldIntervene) {
    mode = "revision";
    interventionReason = `Student has ${consecutive} consecutive assessment scores below ${LOW_SCORE_THRESHOLD}%.`;
  } else {
    mode = classifyIntent(input.intent) ?? mem.current_mode ?? "lecture";
  }

  const nextMemory: TutorStudentMemory = {
    ...mem,
    current_mode: mode,
    consecutive_low_scores: consecutive,
    intervention_flag: shouldIntervene || mem.intervention_flag,
  };

  return {
    mode,
    modeInstructions: MODE_BLOCKS[mode],
    shouldIntervene,
    interventionReason,
    nextMemory,
  };
}

/** Render memory as a short prompt block the tutor can read each turn. */
export function renderMemorySummary(mem: TutorStudentMemory): string {
  if (!mem) return "";
  const parts: string[] = [];
  if (mem.strengths?.length) parts.push(`Strengths so far: ${mem.strengths.slice(0, 4).join("; ")}.`);
  if (mem.weak_areas?.length) parts.push(`Weaker areas: ${mem.weak_areas.slice(0, 4).join("; ")}.`);
  if (mem.misconceptions?.length) parts.push(`Recent misconceptions to gently correct: ${mem.misconceptions.slice(0, 3).join("; ")}.`);
  if (mem.last_topics?.length) parts.push(`Recently covered: ${mem.last_topics.slice(0, 4).join("; ")}.`);
  if (mem.preferred_pace && mem.preferred_pace !== "balanced") {
    parts.push(`Preferred pace: ${mem.preferred_pace}.`);
  }
  if (!parts.length) return "";
  return `[STUDENT MEMORY — use lightly, never recite verbatim]\n${parts.join(" ")}`;
}
