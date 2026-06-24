import { config } from './config.js';
import { log } from './logger.js';

export interface LectureContext {
  lectureTitle?: string | null;
  tutor: { id?: string; name?: string; specialty?: string | null } | null;
  /** Module-level pedagogy briefing (course_modules.tutor_context). Grounds the lecturer in
   * the module's central question, key concepts, analogies, misconceptions, and calling-relevant examples. */
  tutorContext?: string | null;
  /** Pedagogy mode for this turn. */
  mode: 'lecture' | 'socratic' | 'coaching' | 'revision';
}

const FALLBACK_OPENING =
  "Welcome, students. The AI lecturer worker is online and audio is being published. " +
  "Today's lecture content engine is in fallback mode, so I will keep this brief. " +
  "Please raise a hand or post a question and we will continue the discussion.";

/**
 * Draft the next utterance for the lecturer. Uses the Lovable AI Gateway
 * when LOVABLE_API_KEY is configured; otherwise returns a deterministic
 * fallback so the worker remains truthful and useful in degraded mode.
 */
export async function draftLectureTurn(ctx: LectureContext, kind: 'opening' | 'continue', priorText?: string): Promise<string> {
  if (!config.LOVABLE_API_KEY) {
    log.warn('LOVABLE_API_KEY missing; using fallback lecture script.');
    return FALLBACK_OPENING;
  }

  const systemParts = [
    'You are an AI university lecturer for ScrollUniversity, a faith-integrated MIT/Harvard-tier institution.',
    `Mode: ${ctx.mode}. Speak naturally for live audio delivery — no markdown, no bullet points, no headings.`,
    'Aim for 60-90 seconds of spoken content per turn. Use short sentences. Avoid filler.',
    // Scroll Pedagogy Model §4 — dual-explanation requirement
    'For every concept you introduce, explain it in TWO complementary ways: first conceptually (the underlying principle), then practically (a concrete example, case, or worked illustration).',
    'Affirm effort, correct error gently, and invite deeper practice. Stay warm, wise, prophetic but grounded.',
    'Engage Scripture exegetically when relevant — never as decoration.',
    ctx.tutor?.name ? `You are ${ctx.tutor.name}.` : '',
    ctx.tutor?.specialty ? `Your specialty is ${ctx.tutor.specialty}.` : '',
    ctx.lectureTitle ? `Today's lecture: "${ctx.lectureTitle}".` : '',
  ];

  // Inject module-level briefing if present — this grounds the turn in real content
  // instead of generic openings.
  if (ctx.tutorContext && ctx.tutorContext.trim().length > 0) {
    systemParts.push('Module briefing (use this to ground every turn):');
    systemParts.push(ctx.tutorContext.trim().slice(0, 2000));
  }

  const system = systemParts.filter(Boolean).join('\n');

  const user = kind === 'opening'
    ? 'Open the lecture. Greet students, state the central question of today drawn from the module briefing, and give the first concept using the dual-explanation rule (conceptual then practical).'
    : `Continue the lecture. Build on what you just said. Do not restart or re-greet. Introduce the next concept and again apply the dual-explanation rule. Previous turn: """${priorText ?? ''}"""`;

  const startedAt = Date.now();
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.LECTURER_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      log.warn('ai gateway non-ok; using fallback', { status: res.status, detail: detail.slice(0, 200) });
      return FALLBACK_OPENING;
    }
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content?.trim() ?? '';
    log.info('lecture turn drafted', { ms: Date.now() - startedAt, chars: text.length, kind, grounded: !!ctx.tutorContext });
    return text || FALLBACK_OPENING;
  } catch (e) {
    log.error('lecture draft failed; using fallback', { err: (e as Error).message });
    return FALLBACK_OPENING;
  }
}
