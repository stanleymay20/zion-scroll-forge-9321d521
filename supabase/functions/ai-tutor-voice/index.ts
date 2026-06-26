// ✝️ AI Tutor Voice — transcribes audio + responds, persists to ai_tutor_messages
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateUUID,
  ValidationError,
  createValidationErrorResponse,
  extractAuthenticatedUser,
} from "../_shared/validation.ts";
import { buildTutorSystemPrompt, formatForTTS, type TutorTone, type WarmthLevel } from "../_shared/tutor-persona.ts";
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

// 8 MB cap on base64 input (~6MB raw audio)
const MAX_AUDIO_B64 = 8 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const t0 = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { user, error: authError } = await extractAuthenticatedUser(
      req,
      supabase,
      corsHeaders,
    );
    if (authError) return authError;

    const { session_id, audio_base64, tone, warmth, student_name, course_title, program_title, faculty_name } = await req.json().catch(() => ({}));
    validateUUID(session_id, "session_id");
    if (typeof audio_base64 !== "string" || audio_base64.length === 0) {
      throw new ValidationError("audio_base64 is required");
    }
    if (audio_base64.length > MAX_AUDIO_B64) {
      throw new ValidationError("audio is too large (max ~6MB)");
    }

    const { data: session } = await supabase
      .from("ai_tutor_sessions")
      .select(
        "id, user_id, status, module_id, ai_tutors(name, description, personality_prompt, specialty)",
      )
      .eq("id", session_id)
      .maybeSingle();

    if (!session) return json({ error: "Session not found" }, 404);
    if (session.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (session.status !== "active") {
      return json({ error: "Session is not active" }, 409);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // Decode base64 → bytes
    let audioBuffer: Uint8Array;
    try {
      audioBuffer = Uint8Array.from(atob(audio_base64), (c) => c.charCodeAt(0));
    } catch {
      throw new ValidationError("audio_base64 is not valid base64");
    }

    // Transcribe
    const transcriptionResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "audio/webm",
        },
        body: audioBuffer,
      },
    );

    if (transcriptionResponse.status === 429) {
      return json({ error: "Rate limit exceeded — try again shortly." }, 429);
    }
    if (transcriptionResponse.status === 402) {
      return json({ error: "AI credits exhausted." }, 402);
    }
    if (!transcriptionResponse.ok) {
      const t = await transcriptionResponse.text().catch(() => "");
      console.error("transcription failed", transcriptionResponse.status, t);
      return json({ error: "Transcription failed" }, 502);
    }

    const { text: transcript } = await transcriptionResponse.json();
    if (!transcript || typeof transcript !== "string") {
      return json({ error: "Empty transcription" }, 502);
    }

    // Save student message (user-owned via RLS would also pass; we use service)
    await supabase.from("ai_tutor_messages").insert({
      session_id,
      sender_type: "student",
      content: transcript,
      metadata: { source: "voice" },
    });

    // Load history
    const { data: history } = await supabase
      .from("ai_tutor_messages")
      .select("sender_type, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(40);

    const tutor = (session as any).ai_tutors ?? {};
    const systemPrompt = buildTutorSystemPrompt({
      mode: "spoken",
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
    });

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m: any) => ({
        role: m.sender_type === "student" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const chatResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          temperature: 0.6,
          max_tokens: 600,
        }),
      },
    );

    if (chatResponse.status === 429) {
      return json({ error: "Rate limit exceeded — try again shortly." }, 429);
    }
    if (chatResponse.status === 402) {
      return json({ error: "AI credits exhausted." }, 402);
    }
    if (!chatResponse.ok) {
      const t = await chatResponse.text().catch(() => "");
      console.error("chat completion failed", chatResponse.status, t);
      return json({ error: "Chat completion failed" }, 502);
    }

    const chatData = await chatResponse.json();
    const rawAssistant =
      chatData?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!rawAssistant) return json({ error: "Empty AI response" }, 502);
    const assistantMessage = formatForTTS(rawAssistant);

    await supabase.from("ai_tutor_messages").insert({
      session_id,
      sender_type: "tutor",
      content: assistantMessage,
      metadata: { source: "voice", model: "google/gemini-2.5-flash" },
    });

    // Best-effort notification + audit log
    try {
      await supabase.rpc("create_notification", {
        p_user_id: session.user_id,
        p_title: "Your AI Tutor responded",
        p_body: assistantMessage.substring(0, 100) + "…",
        p_type: "tutor",
        p_related_id: session_id,
        p_related_type: "tutor_session",
      });
    } catch (e) {
      console.warn("notification rpc failed:", e);
    }

    try {
      await supabase.from("spiritual_events_log").insert({
        scope: "ai_tutor",
        action: "voice_interaction",
        details: { session_id, transcript_length: transcript.length },
        severity: "info",
        user_id: session.user_id,
      });
    } catch (e) {
      console.warn("spiritual_events_log insert failed:", e);
    }

    await logAiOutput({
      user_id: session.user_id,
      feature: "ai_tutor",
      provider: "lovable_ai_gateway",
      model: "google/gemini-2.5-flash",
      input_reference: session_id,
      output_reference: session_id,
      tokens_in: chatData?.usage?.prompt_tokens ?? null,
      tokens_out: chatData?.usage?.completion_tokens ?? null,
      latency_ms: Date.now() - t0,
      status: "ok",
      metadata: { source: "voice", transcript_chars: transcript.length },
    });

    return json({ transcript, assistant_message: assistantMessage });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error, corsHeaders);
    }
    console.error("ai-tutor-voice error:", error);
    await logAiOutput({
      feature: "ai_tutor",
      provider: "lovable_ai_gateway",
      status: "error",
      latency_ms: Date.now() - t0,
      error_message: error?.message ?? String(error),
      metadata: { source: "voice" },
    });
    return json({ error: error?.message ?? "Internal error" }, 500);
  }
});
