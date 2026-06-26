// Shared helper to record every AI call to public.ai_output_log.
// Edge functions: import and call `logAiOutput({...})` after each AI invocation.
// Failures are swallowed — logging must never break the user-facing call.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type AiFeature =
  | "ai_tutor"
  | "grading"
  | "prescreen"
  | "content_gen"
  | "study_plan"
  | "recommendation"
  | "pedagogy_remediation"
  | "avatar_lecture"
  | "transcript_narration"
  | "skills_assessment";

export interface AiLogInput {
  user_id?: string | null;
  feature: AiFeature;
  model?: string | null;
  provider?: string | null;
  prompt?: string | null;          // raw prompt — we hash, never store
  input_reference?: string | null;
  output_reference?: string | null;
  confidence?: number | null;       // 0..1
  human_review_required?: boolean;
  latency_ms?: number | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  cost_estimate?: number | null;
  status?: "ok" | "error" | "flagged";
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function logAiOutput(input: AiLogInput): Promise<void> {
  try {
    const prompt_hash = input.prompt ? await sha256Hex(input.prompt) : null;
    await admin.from("ai_output_log").insert({
      user_id: input.user_id ?? null,
      feature: input.feature,
      model: input.model ?? null,
      provider: input.provider ?? null,
      prompt_hash,
      input_reference: input.input_reference ?? null,
      output_reference: input.output_reference ?? null,
      confidence: input.confidence ?? null,
      human_review_required: input.human_review_required ?? false,
      latency_ms: input.latency_ms ?? null,
      tokens_in: input.tokens_in ?? null,
      tokens_out: input.tokens_out ?? null,
      cost_estimate: input.cost_estimate ?? null,
      status: input.status ?? "ok",
      error_message: input.error_message ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    console.error("[ai-log] failed to write ai_output_log:", e);
  }
}
