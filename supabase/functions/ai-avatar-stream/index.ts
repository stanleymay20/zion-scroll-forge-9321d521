import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildTutorSystemPrompt, formatForTTS, type TutorTone, type WarmthLevel } from "../_shared/tutor-persona.ts";
import {
  decidePedagogy, renderMemorySummary, EMPTY_MEMORY,
  type TeachingMode, type TutorStudentMemory,
} from "../_shared/tutor-pedagogy.ts";
import { healthAll, orchestrateCreate, providerByKind } from "../_shared/avatar-providers/registry.ts";
import type { LectureMode } from "../_shared/avatar-providers/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    const body = await req.json();
    const { action } = body;

    const bearer = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
    const { data: authData } = bearer
      ? await supabase.auth.getUser(bearer)
      : { data: { user: null } as any };
    const authUserId: string | null = authData?.user?.id ?? null;

    // ── provider_health (capabilities + cost + truthful reason) ─────────────
    if (action === "provider_health") {
      const checks = await healthAll();
      return json({
        ok: checks.some((c) => c.healthy && (c.kind === "did" || c.kind.startsWith("sovereign") || c.kind === "tavus" || c.kind === "heygen")),
        providers: checks,
        llm_ready: Boolean(LOVABLE_API_KEY),
        tts_ready: Boolean(ELEVENLABS_API_KEY),
        checked_at: new Date().toISOString(),
      });
    }

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── create_stream: orchestrate + audit ──────────────────────────────────
    if (action === "create_stream") {
      const lectureMode: LectureMode = (body.lecture_mode as LectureMode) ?? "live";
      const isMobile = Boolean(body.is_mobile);
      const budgetCeilingUsd: number | undefined = typeof body.budget_ceiling_usd === "number"
        ? body.budget_ceiling_usd : undefined;

      const orchestrated = await orchestrateCreate({
        lectureMode, isMobile, budgetCeilingUsd,
        preferredLanguage: body.language ?? null,
        facultyVoiceId: body.faculty_voice_id ?? null,
      });

      // Persist a session row (audit-first; never blocks the user)
      let sessionRowId: string | null = null;
      try {
        const { data: row } = await supabase.from("live_lecture_sessions").insert({
          user_id: authUserId,
          course_id: body.course_id ?? null,
          module_id: body.module_id ?? null,
          faculty_id: body.faculty_id ?? null,
          tutor_id: body.tutor_id ?? null,
          lecture_mode: lectureMode,
          provider_used: orchestrated.providerKind,
          provider_capabilities: orchestrated.provider.capabilities as unknown as Record<string, unknown>,
          estimated_cost_usd: 0,
          metadata: { attempts: orchestrated.attempts, budget_ceiling_usd: budgetCeilingUsd ?? null },
        }).select("id").single();
        sessionRowId = row?.id ?? null;
      } catch (e) { console.error("audit session insert failed", e); }

      // Audit each attempt + the selection
      if (sessionRowId) {
        try {
          const events = orchestrated.attempts.map((a) => ({
            session_id: sessionRowId!,
            event_type: a.ok ? "provider_selected" : "fallback",
            payload: { provider: a.kind, reason: a.reason ?? null },
            estimated_cost_usd: 0,
          }));
          if (events.length) await supabase.from("live_lecture_events").insert(events);
        } catch (e) { console.error("audit events insert failed", e); }
      }

      return json({
        // legacy shape preserved
        stream_id: orchestrated.stream_id ?? null,
        session_id: orchestrated.session_id ?? null,
        offer: orchestrated.offer ?? null,
        ice_servers: orchestrated.ice_servers ?? null,
        fallback: orchestrated.fallback ?? !orchestrated.ok ? true : (orchestrated.providerKind === "voice-only" || orchestrated.providerKind === "text-only"),
        reason: orchestrated.reason ?? null,
        // new: truthful provider + capability info for UI badge logic
        provider_kind: orchestrated.providerKind,
        provider_capabilities: orchestrated.provider.capabilities,
        estimated_cost_per_minute_usd: orchestrated.estimatedCostPerMinuteUsd,
        mode: orchestrated.providerKind === "text-only"
          ? "text"
          : orchestrated.providerKind === "voice-only"
            ? "audio"
            : "avatar",
        audit_session_id: sessionRowId,
        attempts: orchestrated.attempts,
      });
    }

    // ── talk: pedagogy + LLM + TTS + (optional) provider speak ──────────────
    if (action === "talk") {
      const {
        stream_id, session_id, text, messages, moduleContent, tutorId,
        tutorName, tutorSpecialty,
        courseTitle, programTitle, facultyName, moduleTitle,
        studentName, learningObjectives,
        tone, warmth,
        courseId, intent, modeOverride, lastAssessmentScore,
        audit_session_id, provider_kind,
      } = body;

      if (!text) return json({ error: "text is required" }, 400);

      const effectiveUserId = authUserId ?? (typeof body.userId === "string" ? body.userId : null);

      let memory: TutorStudentMemory = { ...EMPTY_MEMORY };
      if (effectiveUserId && courseId) {
        const { data: memRow } = await supabase
          .from("tutor_student_memory")
          .select("misconceptions,strengths,weak_areas,last_topics,preferred_pace,current_mode,consecutive_low_scores,intervention_flag")
          .eq("user_id", effectiveUserId).eq("course_id", courseId).maybeSingle();
        if (memRow) memory = { ...EMPTY_MEMORY, ...(memRow as any) };
      }

      const pedagogy = decidePedagogy({
        intent: typeof intent === "string" ? intent : null,
        modeOverride: (modeOverride as TeachingMode | null) ?? null,
        lastAssessmentScore: typeof lastAssessmentScore === "number" ? lastAssessmentScore : null,
        memory,
      });

      const systemPrompt = buildTutorSystemPrompt({
        mode: "spoken",
        tone: tone as TutorTone | TutorTone[] | undefined,
        warmth: warmth as WarmthLevel | undefined,
        tutorName,
        tutorSpecialty: tutorSpecialty || facultyName || null,
        studentName, courseTitle, programTitle, facultyName, moduleTitle,
        learningObjectives, moduleContent,
        teachingModeBlock: pedagogy.modeInstructions,
        memorySummary: renderMemorySummary(memory),
      });

      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...(messages || []),
        { role: "user", content: text },
      ];

      const t0 = Date.now();
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash", messages: chatMessages,
          temperature: 0.6, max_tokens: 600,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return json({ error: "RATE_LIMITED", message: "Rate limited." }, 429);
        if (aiResp.status === 402) return json({ error: "CREDITS_REQUIRED", message: "AI credits exhausted." }, 402);
        throw new Error(`AI Gateway error: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();
      const rawMessage: string = aiData.choices[0].message.content ?? "";
      const spokenMessage = formatForTTS(rawMessage);
      const aiMessage = spokenMessage || rawMessage;
      const llmLatencyMs = Date.now() - t0;

      // TTS
      let audioBase64: string | null = null;
      let ttsAvailable = false;
      if (ELEVENLABS_API_KEY) {
        try {
          const voiceId = "EXAVITQu4vr4xnSDxMaL";
          const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({
                text: aiMessage,
                model_id: "eleven_turbo_v2_5",
                voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true, speed: 0.97 },
              }),
            },
          );
          if (ttsResp.ok) {
            const buf = await ttsResp.arrayBuffer();
            const u8 = new Uint8Array(buf);
            let bin = "";
            for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
            audioBase64 = btoa(bin);
            ttsAvailable = true;
          }
        } catch (e) { console.error("TTS error", e); }
      }

      // Route avatar speak through the provider that owns the stream
      let providerSpeakResult: unknown = null;
      if (stream_id && session_id && provider_kind) {
        const provider = providerByKind(provider_kind);
        if (provider?.speak) {
          try { providerSpeakResult = await provider.speak(stream_id, session_id, aiMessage); }
          catch (e) { console.error("provider.speak failed", e); }
        }
      }

      // Persist memory + intervention (unchanged behaviour)
      if (effectiveUserId && courseId) {
        const nextTopics = [
          ...(moduleTitle ? [moduleTitle] : []),
          ...(pedagogy.nextMemory.last_topics || []),
        ].slice(0, 6);
        await supabase.from("tutor_student_memory").upsert({
          user_id: effectiveUserId, course_id: courseId,
          ...pedagogy.nextMemory, last_topics: nextTopics,
          last_interaction_at: new Date().toISOString(),
        }, { onConflict: "user_id,course_id" });

        if (pedagogy.shouldIntervene) {
          const { data: existing } = await supabase
            .from("student_intervention_alerts")
            .select("id").eq("user_id", effectiveUserId).eq("course_id", courseId)
            .eq("status", "open").maybeSingle();
          if (!existing) {
            await supabase.from("student_intervention_alerts").insert({
              user_id: effectiveUserId, course_id: courseId,
              trigger_reason: pedagogy.interventionReason ?? "Repeated low assessment scores.",
              recommended_action: "Faculty check-in; tutor switched to revision mode.",
              metadata: { source: "ai-avatar-stream", mode: pedagogy.mode },
            });
          }
        }
      }

      // Audit teaching mode + latency
      if (audit_session_id) {
        try {
          await supabase.from("live_lecture_events").insert({
            session_id: audit_session_id,
            event_type: "teaching_mode_change",
            payload: { mode: pedagogy.mode, tts_available: ttsAvailable, provider_kind: provider_kind ?? null },
            latency_ms: llmLatencyMs,
          });
        } catch (e) { console.error("audit talk event failed", e); }
      }

      return json({
        message: aiMessage,
        audio_base64: audioBase64,
        tts_available: ttsAvailable,
        did_talk: providerSpeakResult,
        teaching_mode: pedagogy.mode,
        intervention_opened: pedagogy.shouldIntervene,
        memory_user_scoped: Boolean(effectiveUserId && courseId),
        llm_latency_ms: llmLatencyMs,
      });
    }

    // ── sdp_answer / ice_candidate / destroy_stream — routed via registry ───
    if (action === "sdp_answer") {
      const { stream_id, session_id, answer, provider_kind } = body;
      const provider = providerByKind(provider_kind ?? "did");
      if (!provider?.sendSdpAnswer) return json({ success: false, reason: "PROVIDER_NO_REALTIME" });
      await provider.sendSdpAnswer(stream_id, session_id, answer);
      return json({ success: true });
    }

    if (action === "ice_candidate") {
      const { stream_id, session_id, candidate, provider_kind } = body;
      const provider = providerByKind(provider_kind ?? "did");
      if (!provider?.sendIceCandidate) return json({ success: false, reason: "PROVIDER_NO_REALTIME" });
      await provider.sendIceCandidate(stream_id, session_id, candidate);
      return json({ success: true });
    }

    if (action === "destroy_stream") {
      const { stream_id, session_id, provider_kind, audit_session_id, end_reason } = body;
      const provider = providerByKind(provider_kind ?? "did");
      if (provider?.destroy && stream_id) {
        try { await provider.destroy(stream_id, session_id); } catch (e) { console.error(e); }
      }
      if (audit_session_id) {
        try {
          await supabase.from("live_lecture_sessions").update({
            ended_at: new Date().toISOString(),
            end_reason: end_reason ?? "completed",
          }).eq("id", audit_session_id);
          await supabase.from("live_lecture_events").insert({
            session_id: audit_session_id,
            event_type: "disconnect",
            payload: { reason: end_reason ?? "completed" },
          });
        } catch (e) { console.error("audit destroy failed", e); }
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: any) {
    console.error("ai-avatar-stream error:", error);
    return json({ error: error.message }, 500);
  }
});
