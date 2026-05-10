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
    const { session_id, message } = body ?? {};

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
    let moduleContext = "";
    if (session.module_id) {
      const { data: mod } = await supabase
        .from("course_modules")
        .select("title, content_md")
        .eq("id", session.module_id)
        .maybeSingle();
      if (mod) {
        moduleContext = `Module: ${mod.title}\n${(mod.content_md ?? "").slice(0, 3000)}`;
      }
    }

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

    const systemPrompt = `You are ${tutor.name ?? "a ScrollUniversity AI tutor"}${
      tutor.specialty ? `, specializing in ${tutor.specialty}` : ""
    }, a Christ-centered AI tutor at ScrollUniversity.
${tutor.description ? `About you: ${tutor.description}` : ""}
${tutor.personality_prompt ?? ""}

GUIDELINES:
- Acknowledge Jesus Christ as Lord over all learning.
- Be clear, accurate, encouraging, and patient.
- Use scripture and biblical wisdom where appropriate (cite chapter:verse).
- Keep responses concise but thorough (2-4 short paragraphs).
- End with a question or next step.

${moduleContext ? `CONTEXT:\n${moduleContext}` : ""}`;

    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...(history ?? []).map((m: any) => ({
        role: m.sender_type === "student" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const aiRes = await fetch(
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
          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
    );

    if (aiRes.status === 429) {
      return json(
        { error: "Rate limit exceeded — please wait a moment and try again." },
        429,
      );
    }
    if (aiRes.status === 402) {
      return json(
        { error: "AI credits exhausted — please add credits in workspace settings." },
        402,
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 502);
    }

    const data = await aiRes.json();
    const assistantMessage = data?.choices?.[0]?.message?.content?.trim();
    if (!assistantMessage) return json({ error: "Empty AI response" }, 502);

    // Persist assistant reply + bump counter
    await supabase.from("ai_tutor_messages").insert({
      session_id,
      sender_type: "tutor",
      content: assistantMessage,
      metadata: { model: "google/gemini-2.5-flash" },
    });

    await supabase
      .from("ai_tutor_sessions")
      .update({ total_messages: (history?.length ?? 0) + 1 })
      .eq("id", session_id);

    return json({ assistant_message: assistantMessage });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error, corsHeaders);
    }
    console.error("ai-tutor-chat error:", error);
    return json({ error: error?.message ?? "Internal error" }, 500);
  }
});
