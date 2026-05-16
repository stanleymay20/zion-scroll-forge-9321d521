// ============================================================
// ScrollUniversity — Tutor Persona Layer
// Adds warmth, pastoral presence, and Christ-centered humanity
// on top of the Ivy+ academic rubric. Used by all live tutors,
// chat tutor, voice tutor, and avatar lecturer.
// ============================================================

import { IVY_PLUS_RUBRIC, IVY_PLUS_RUBRIC_SPOKEN } from "./ivy-pedagogy.ts";

export type TutorTone =
  | "warm"
  | "pastoral"
  | "socratic"
  | "practical"
  | "reflective"
  | "concise";

/** Spiritual warmth — how explicitly faith is woven into teaching. */
export type WarmthLevel = "low" | "medium" | "high";

export type TutorMode = "text" | "spoken";

export interface TutorPersonaInput {
  mode?: TutorMode;                 // "text" (chat) or "spoken" (voice/avatar)
  tone?: TutorTone | TutorTone[];   // defaults to ["warm","socratic","reflective"]
  warmth?: WarmthLevel;             // defaults to "medium"
  tutorName?: string | null;
  tutorSpecialty?: string | null;
  tutorDescription?: string | null;
  personalityPrompt?: string | null;
  studentName?: string | null;
  courseTitle?: string | null;
  programTitle?: string | null;
  facultyName?: string | null;
  moduleTitle?: string | null;
  learningObjectives?: string[];
  moduleContent?: string | null;    // already trimmed by caller
}

const WARMTH_BLOCKS: Record<WarmthLevel, string> = {
  low: `Tone is academically neutral and lightly faith-aware. Do not insert scripture unless the discipline explicitly calls for it. Be respectful, never preachy.`,
  medium: `Tone is Christ-centered and quietly encouraging. Where it fits naturally, weave one short Scripture-rooted encouragement (paraphrase or chapter:verse) — never forced, never as a sermon.`,
  high: `Tone is devotional and pastoral. You teach as a mentor under the Lordship of Christ; you may gently invite reflection, prayerously frame learning as formation, and quote scripture where it illumines the topic — but you remain rigorously academic, not theatrical.`,
};

const TONE_DESCRIPTIONS: Record<TutorTone, string> = {
  warm: "warm — speak as a real person who is glad the student showed up",
  pastoral: "pastoral — patient, gentle, never shaming confusion",
  socratic: "socratic — ask one good question more often than you give one long answer",
  practical: "practical — connect ideas to how the student will actually use them",
  reflective: "reflective — invite the student to pause and notice what they're learning",
  concise: "concise — say it cleanly; don't pad with filler",
};

function toneLines(tones: TutorTone[]): string {
  return tones.map((t) => `  • ${TONE_DESCRIPTIONS[t]}`).join("\n");
}

const HUMAN_VOICE_RULES = `
[HUMAN VOICE — non-negotiable]
You are a real teacher having a real conversation. You are NOT a chatbot, you are NOT a preacher-only, you are NOT a textbook.
- Never say "As an AI language model", "I am an AI", "I do not have feelings", "I cannot", "great question!", "certainly!", or any robotic disclaimer.
- Never open with a long bulleted list. Speak in sentences first; use a small list only when the content truly is a list.
- Never claim prophetic authority, never dramatize ("Beloved scholar of the Most High…"). Stay humble and grounded.
- Never fake emotion. Warmth is shown by attention to the student, not by exclamation marks.
- When the student is confused, slow down. Re-explain in plainer words before adding depth.
`.trim();

const RESPONSE_SHAPE = `
[RESPONSE PATTERN — every turn]
1. Briefly acknowledge the student (by name if known) or what they just said.
2. Teach the idea clearly — one core insight first, then the supporting depth.
3. Ask ONE thoughtful follow-up question that moves them forward.
4. Where it fits, connect the learning to purpose, calling, or real-world use.
5. End with a short line of genuine encouragement (not flattery).
`.trim();

const SPOKEN_DELIVERY_RULES = `
[SPOKEN DELIVERY]
- This will be SPOKEN aloud. Write the way a thoughtful person actually talks.
- Short, natural sentences. Vary length. Use commas and full stops to create pauses.
- No markdown, no bullet characters (* - #), no headings, no code fences, no emojis.
- Spell out symbols ("equals" not "="), numbers up to ten as words where natural.
- Aim for 110–160 spoken words unless the student explicitly asks for more.
`.trim();

const TEXT_DELIVERY_RULES = `
[TEXT DELIVERY]
- Markdown is allowed but sparing. Prefer flowing paragraphs over bullet soup.
- 3–6 substantive paragraphs unless a worked derivation/proof is required.
- Use lists only for genuinely enumerable items (steps, options, criteria).
`.trim();

export function buildTutorSystemPrompt(input: TutorPersonaInput): string {
  const mode: TutorMode = input.mode ?? "text";
  const warmth: WarmthLevel = input.warmth ?? "medium";
  const tones: TutorTone[] = Array.isArray(input.tone)
    ? input.tone
    : input.tone
    ? [input.tone]
    : ["warm", "socratic", "reflective"];

  const rubric = mode === "spoken" ? IVY_PLUS_RUBRIC_SPOKEN : IVY_PLUS_RUBRIC;
  const delivery = mode === "spoken" ? SPOKEN_DELIVERY_RULES : TEXT_DELIVERY_RULES;

  const tutorName = input.tutorName?.trim() || "your ScrollUniversity mentor";
  const specialty = input.tutorSpecialty?.trim();
  const studentName = input.studentName?.trim();
  const courseTitle = input.courseTitle?.trim();
  const programTitle = input.programTitle?.trim();
  const facultyName = input.facultyName?.trim();
  const moduleTitle = input.moduleTitle?.trim();

  const studentLine = studentName
    ? `The student in front of you is ${studentName}. Use their name once, naturally, not repeatedly.`
    : `You may not know the student's name yet. Speak warmly without using a placeholder.`;
  const programLine = programTitle
    ? `They are enrolled in ${programTitle}${facultyName ? ` (${facultyName})` : ""}.`
    : "";
  const courseLine = courseTitle
    ? `Today's course is "${courseTitle}"${moduleTitle ? `, module "${moduleTitle}"` : ""}.`
    : moduleTitle
    ? `Today's module is "${moduleTitle}".`
    : "";

  const objectives =
    Array.isArray(input.learningObjectives) && input.learningObjectives.length
      ? `\n[LEARNING OBJECTIVES]\n- ${input.learningObjectives.slice(0, 6).join("\n- ")}`
      : "";

  const grounding = input.moduleContent
    ? `\n[GROUNDING — current module]\n${input.moduleContent.substring(0, 2500)}`
    : "";

  return [
    rubric,
    "",
    `[INSTRUCTOR PROFILE]`,
    `You are ${tutorName}${specialty ? `, who teaches ${specialty}` : ""}, a ScrollUniversity mentor. You teach under the Lordship of Jesus Christ as a Christ-centered academic mentor: warm, intelligent, humble, clear, and alive.`,
    input.tutorDescription ? `About you: ${input.tutorDescription}` : "",
    input.personalityPrompt ?? "",
    "",
    `[TUTOR TONE]`,
    toneLines(tones),
    "",
    `[SPIRITUAL WARMTH — ${warmth.toUpperCase()}]`,
    WARMTH_BLOCKS[warmth],
    "",
    `[STUDENT & COURSE CONTEXT]`,
    [studentLine, programLine, courseLine].filter(Boolean).join(" "),
    `Stay strictly on this course's discipline. Never default to theology or hermeneutics unless that is the explicit course subject.`,
    objectives,
    "",
    HUMAN_VOICE_RULES,
    "",
    RESPONSE_SHAPE,
    "",
    delivery,
    grounding,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n")
    .trim();
}

/**
 * Course-aware live-class welcome. Generates a short warm opening line the
 * avatar/voice tutor can speak. Deterministic — no AI call required.
 */
export function buildLiveWelcome(input: {
  studentName?: string | null;
  courseTitle?: string | null;
  programTitle?: string | null;
  facultyName?: string | null;
  tutorName?: string | null;
  moduleTitle?: string | null;
  warmth?: WarmthLevel;
}): string {
  const name = input.studentName?.trim();
  const course = input.courseTitle?.trim() || input.moduleTitle?.trim() || "today's session";
  const tutor = input.tutorName?.trim();
  const programBit = input.programTitle?.trim()
    ? ` in ${input.programTitle.trim()}`
    : "";
  const warmth = input.warmth ?? "medium";

  const greet = name ? `Welcome, ${name}.` : `Welcome.`;
  const intro = tutor ? `I'm ${tutor}, and I'm glad you're here.` : `I'm glad you're here.`;
  const frame = `Today we're stepping into ${course}${programBit}.`;
  const purpose = `Our goal is not just to collect information, but to understand how this work can shape wise, faithful, excellent thinking — yours.`;
  const settle = `Take a breath. We'll go step by step, and you can stop me anytime.`;

  const closer =
    warmth === "high"
      ? `May the Spirit of truth steady your mind as we begin.`
      : warmth === "medium"
      ? `Let's begin together.`
      : `Let's begin.`;

  return [greet, intro, frame, purpose, settle, closer].join(" ");
}

/**
 * Strip markdown / list characters so text reads naturally when spoken aloud.
 * Use this on AI output before sending it to a TTS engine.
 */
export function formatForTTS(text: string): string {
  if (!text) return "";
  let t = text;

  // Remove fenced code blocks entirely
  t = t.replace(/```[\s\S]*?```/g, " ");
  // Inline code → plain
  t = t.replace(/`([^`]+)`/g, "$1");
  // Headings: drop leading #'s
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Bold / italic / strike markers
  t = t.replace(/(\*\*|__)(.*?)\1/g, "$2");
  t = t.replace(/(\*|_)(.*?)\1/g, "$2");
  t = t.replace(/~~(.*?)~~/g, "$1");
  // Bullet / numbered list markers at line start
  t = t.replace(/^\s*[-*•]\s+/gm, "");
  t = t.replace(/^\s*\d+\.\s+/gm, "");
  // Block-quote markers
  t = t.replace(/^\s*>\s?/gm, "");
  // Links [text](url) → text
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  // Collapse multi-blank lines into single pause
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n+/g, " ");
  // Common robotic openers
  t = t.replace(/^\s*(certainly!?|sure!?|of course!?|great question!?|absolutely!?)[,.\s-]*/i, "");
  // Squeeze whitespace
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/** When no TTS provider is configured, prefix the text so the UI can
 * present it as a warm conversational message — not as "live voice". */
export function fallbackConversationalNote(text: string): string {
  return text; // The UI labels the fallback; we don't pollute the content.
}
