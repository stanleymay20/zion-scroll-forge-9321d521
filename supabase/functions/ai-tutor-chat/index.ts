// ✝️ AI Tutor Chat — session-based, persists to ai_tutor_messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  validateUUID,
  sanitizeString,
  MAX_LENGTHS,
  ValidationError,
  createValidationErrorResponse,
  extractAuthenticatedUser,
} from "../_shared/validation.ts";
import { buildTutorSystemPrompt, type TutorTone, type WarmthLevel } from "../_shared/tutor-persona.ts";
import {
  decidePedagogy,
  renderMemorySummary,
  EMPTY_MEMORY,
  type TeachingMode,
  type TutorStudentMemory,
} from "../_shared/tutor-pedagogy.ts";
import { logAiOutput } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require authenticated user
    const { user, error: authError } = await extractAuthenticatedUser(
      req,
      supabase,
      corsHeaders,
    );
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const {
      session_id, message, tone, warmth,
      student_name, course_title, program_title, faculty_name,
      intent, mode_override, last_assessment_score,
    } = body ?? {};

    validateUUID(session_id, "session_id");
    const userMessage = sanitizeString(message)?.slice(0, MAX_LENGTHS.content);
    if (!userMessage || userMessage.trim().length === 0) {
      throw new ValidationError("message cannot be empty");
    }

    // Load session and ownership-check
    const { data: session, error: sessErr } = await supabase
      .from("ai_tutor_sessions")
      .select(
        "id, user_id, status, institution_id, module_id, ai_tutors(name, description, personality_prompt, specialty)",
      )
      .eq("id", session_id)
      .maybeSingle();

    if (sessErr || !session) return json({ error: "Session not found" }, 404);
    if (session.user_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }
    if (session.status !== "active") {
      return json({ error: "Session is not active" }, 409);
    }

    const tutor = (session as any).ai_tutors ?? {};

    // Load module context (optional)
    let moduleTitle: string | null = null;
    let moduleContent: string | null = null;
    let courseIdForMemory: string | null = null;
    if (session.module_id) {
      const { data: mod } = await supabase
        .from("course_modules")
        .select("title, content_md, course_id")
        .eq("id", session.module_id)
        .maybeSingle();
      if (mod) {
        moduleTitle = mod.title ?? null;
        moduleContent = (mod.content_md ?? "").slice(0, 3000);
        courseIdForMemory = (mod as any).course_id ?? null;
      }
    }

    // ─── PR2: Load student memory for this course (best-effort) ───
    let memory: TutorStudentMemory = { ...EMPTY_MEMORY };
    if (courseIdForMemory) {
      const { data: memRow } = await supabase
        .from("tutor_student_memory")
        .select("misconceptions,strengths,weak_areas,last_topics,preferred_pace,current_mode,consecutive_low_scores,intervention_flag")
        .eq("user_id", user.id)
        .eq("course_id", courseIdForMemory)
        .maybeSingle();
      if (memRow) memory = { ...EMPTY_MEMORY, ...(memRow as any) };
    }

    const pedagogy = decidePedagogy({
      intent: typeof intent === "string" ? intent : null,
      modeOverride: (mode_override as TeachingMode | null) ?? null,
      lastAssessmentScore: typeof last_assessment_score === "number" ? last_assessment_score : null,
      memory,
    });

    // Persist student message FIRST so it shows even if AI fails
    await supabase.from("ai_tutor_messages").insert({
      session_id,
      sender_type: "student",
      content: userMessage,
      metadata: { source: "text" },
    });

    // Load history (after insert)
    const { data: history } = await supabase
      .from("ai_tutor_messages")
      .select("sender_type, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(40);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI not configured" }, 500);
    }

    const systemPrompt = buildTutorSystemPrompt({
      mode: "text",
      tone: (tone as TutorTone | TutorTone[] | undefined),
      warmth: (warmth as WarmthLevel | undefined),
      tutorName: tutor.name,
      tutorSpecialty: tutor.specialty,
      tutorDescription: tutor.description,
      personalityPrompt: tutor.personality_prompt,
      studentName: student_name ?? null,
      courseTitle: course_title ?? null,
      programTitle: program_title ?? null,
      facultyName: faculty_name ?? null,
      moduleTitle,
      moduleContent,
      teachingModeBlock: pedagogy.modeInstructions,
      memorySummary: renderMemorySummary(memory),
    });

    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...(history ?? []).map((m: any) => ({
        role: m.sender_type === "student" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const t0 = Date.now();
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: aiMessages,
          temperature: 0.6,
          max_tokens: 2200,
        }),
      },
    );

    if (aiRes.status === 429) {
      await logAiOutput({ user_id: user.id, feature: "ai_tutor", model: "google/gemini-2.5-pro", provider: "lovable-ai", latency_ms: Date.now()-t0, status: "error", error_message: "rate_limited_429", metadata: { session_id } });
      return json({ error: "Rate limit exceeded — please wait a moment and try again." }, 429);
    }
    if (aiRes.status === 402) {
      await logAiOutput({ user_id: user.id, feature: "ai_tutor", model: "google/gemini-2.5-pro", provider: "lovable-ai", latency_ms: Date.now()-t0, status: "error", error_message: "credits_exhausted_402", metadata: { session_id } });
      return json({ error: "AI credits exhausted — please add credits in workspace settings." }, 402);
    }
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, t);
      await logAiOutput({ user_id: user.id, feature: "ai_tutor", model: "google/gemini-2.5-pro", provider: "lovable-ai", latency_ms: Date.now()-t0, status: "error", error_message: `gateway_${aiRes.status}: ${t.slice(0,200)}`, metadata: { session_id } });
      return json({ error: "AI gateway error" }, 502);
    }

    const data = await aiRes.json();
    const assistantMessage = data?.choices?.[0]?.message?.content?.trim();
    if (!assistantMessage) {
      await logAiOutput({ user_id: user.id, feature: "ai_tutor", model: "google/gemini-2.5-pro", provider: "lovable-ai", latency_ms: Date.now()-t0, status: "error", error_message: "empty_response", metadata: { session_id } });
      return json({ error: "Empty AI response" }, 502);
    }

    await logAiOutput({
      user_id: user.id, feature: "ai_tutor", model: "google/gemini-2.5-pro",
      provider: "lovable-ai", latency_ms: Date.now() - t0,
      tokens_in: data?.usage?.prompt_tokens ?? null,
      tokens_out: data?.usage?.completion_tokens ?? null,
      status: "ok",
      output_reference: session_id,
      metadata: { mode: pedagogy.mode, intervene: pedagogy.shouldIntervene },
    });

    // Persist assistant reply + bump counter
    await supabase.from("ai_tutor_messages").insert({
      session_id,
      sender_type: "tutor",
      content: assistantMessage,
      metadata: { model: "google/gemini-2.5-pro", rubric: "ivy_plus_v1", mode: pedagogy.mode },
    });

    await supabase
      .from("ai_tutor_sessions")
      .update({ total_messages: (history?.length ?? 0) + 1 })
      .eq("id", session_id);

    // ─── PR2: persist memory + open intervention alert if triggered ───
    if (courseIdForMemory) {
      const nextTopics = [
        ...(moduleTitle ? [moduleTitle] : []),
        ...(pedagogy.nextMemory.last_topics || []),
      ].slice(0, 6);
      await supabase.from("tutor_student_memory").upsert({
        user_id: user.id,
        course_id: courseIdForMemory,
        ...pedagogy.nextMemory,
        last_topics: nextTopics,
        last_interaction_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id" });

      if (pedagogy.shouldIntervene) {
        // Only open one OPEN alert per (user, course)
        const { data: existing } = await supabase
          .from("student_intervention_alerts")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseIdForMemory)
          .eq("status", "open")
          .maybeSingle();
        if (!existing) {
          await supabase.from("student_intervention_alerts").insert({
            user_id: user.id,
            course_id: courseIdForMemory,
            trigger_reason: pedagogy.interventionReason ?? "Repeated low assessment scores.",
            recommended_action: "Faculty check-in; tutor switched to revision mode.",
            metadata: { source: "ai-tutor-chat", mode: pedagogy.mode },
          });
        }
      }
    }

    return json({
      assistant_message: assistantMessage,
      teaching_mode: pedagogy.mode,
      intervention_opened: pedagogy.shouldIntervene,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error, corsHeaders);
    }
    console.error("ai-tutor-chat error:", error);
    return json({ error: error?.message ?? "Internal error" }, 500);
  }
});
