import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildTutorSystemPrompt, formatForTTS, type TutorTone, type WarmthLevel } from "../_shared/tutor-persona.ts";
import {
  decidePedagogy,
  renderMemorySummary,
  EMPTY_MEMORY,
  type TeachingMode,
  type TutorStudentMemory,
} from "../_shared/tutor-pedagogy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const DID_API_KEY = Deno.env.get("DID_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json();
    const { action } = body;

    // Auth is best-effort for stream creation, but required to persist tutor memory safely.
    // We infer the learner from the JWT rather than trusting a caller-supplied userId.
    const bearer = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
    const { data: authData } = bearer
      ? await supabase.auth.getUser(bearer)
      : { data: { user: null } as any };
    const authUserId = authData?.user?.id ?? null;

    // Lightweight provider readiness probe for frontend/admin diagnostics.
    if (action === "provider_health") {
      return json({
        ok: Boolean(LOVABLE_API_KEY),
        providers: {
          llm: Boolean(LOVABLE_API_KEY),
          avatar: Boolean(DID_API_KEY),
          tts: Boolean(ELEVENLABS_API_KEY),
        },
        mode: DID_API_KEY ? "avatar" : ELEVENLABS_API_KEY ? "audio" : "text",
        checked_at: new Date().toISOString(),
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // ─── ACTION: Create a streaming session ───
    // Graceful degradation: never throw — return `fallback:true` so the
    // client can continue in voice-only or text-only mode.
    if (action === "create_stream") {
      if (!DID_API_KEY) {
        return json({
          fallback: true,
          reason: "AVATAR_PROVIDER_UNCONFIGURED",
          message: "Live video avatar is unavailable. Continuing in voice/text mode.",
          mode: ELEVENLABS_API_KEY ? "audio" : "text",
        });
      }

      try {
        const streamResp = await fetch("https://api.d-id.com/talks/streams", {
          method: "POST",
          headers: {
            Authorization: `Basic ${DID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_url:
              "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
            driver_url: "bank://lively",
            config: { stitch: true, fluent: true },
          }),
        });

        if (!streamResp.ok) {
          const errText = await streamResp.text();
          console.error("D-ID stream create error:", streamResp.status, errText);
          const reason =
            streamResp.status === 402 ? "AVATAR_PROVIDER_CREDITS_EXHAUSTED"
            : streamResp.status === 401 ? "AVATAR_PROVIDER_AUTH_FAILED"
            : "AVATAR_PROVIDER_UNAVAILABLE";
          return json({
            fallback: true,
            reason,
            provider_status: streamResp.status,
            message: "Live video avatar unavailable. Continuing in voice/text mode.",
            mode: ELEVENLABS_API_KEY ? "audio" : "text",
          });
        }

        const streamData = await streamResp.json();
        console.log("D-ID stream created:", streamData.id);
        return json({
          stream_id: streamData.id,
          session_id: streamData.session_id,
          offer: streamData.offer,
          ice_servers: streamData.ice_servers,
        });
      } catch (e) {
        console.error("D-ID stream exception:", e);
        return json({
          fallback: true,
          reason: "AVATAR_PROVIDER_EXCEPTION",
          message: "Live video avatar unreachable. Continuing in voice/text mode.",
          mode: ELEVENLABS_API_KEY ? "audio" : "text",
        });
      }
    }

    // ─── ACTION: Send text to avatar (make it talk) ───
    if (action === "talk") {
      const {
        stream_id, session_id, text, messages, moduleContent, tutorId,
        tutorName, tutorSpecialty,
        courseTitle, programTitle, facultyName, moduleTitle,
        studentName, learningObjectives,
        tone, warmth,
        courseId, intent, modeOverride, lastAssessmentScore,
      } = body;

      if (!stream_id || !session_id || !text) {
        return json({ error: "stream_id, session_id, and text are required" }, 400);
      }

      // Never trust body.userId for memory writes. Use JWT user, with body.userId only as
      // a compatibility fallback when a legacy client is still being upgraded.
      const effectiveUserId = authUserId ?? (typeof body.userId === "string" ? body.userId : null);
      if (body.userId && authUserId && body.userId !== authUserId) {
        console.warn("Ignoring mismatched avatar userId", { bodyUserId: body.userId, authUserId });
      }

      // ─── PR2: load tutor_student_memory (best-effort) ───
      let memory: TutorStudentMemory = { ...EMPTY_MEMORY };
      if (effectiveUserId && courseId) {
        const { data: memRow } = await supabase
          .from("tutor_student_memory")
          .select("misconceptions,strengths,weak_areas,last_topics,preferred_pace,current_mode,consecutive_low_scores,intervention_flag")
          .eq("user_id", effectiveUserId)
          .eq("course_id", courseId)
          .maybeSingle();
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
        studentName,
        courseTitle,
        programTitle,
        facultyName,
        moduleTitle,
        learningObjectives,
        moduleContent,
        teachingModeBlock: pedagogy.modeInstructions,
        memorySummary: renderMemorySummary(memory),
      });

      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...(messages || []),
        { role: "user", content: text },
      ];

      const aiResp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: chatMessages,
            temperature: 0.6,
            max_tokens: 600,
          }),
        }
      );

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return json({ error: "RATE_LIMITED", message: "Rate limited. Please wait a moment." }, 429);
        }
        if (status === 402) {
          return json({ error: "CREDITS_REQUIRED", message: "AI credits exhausted. Please add credits." }, 402);
        }
        throw new Error(`AI Gateway error: ${status}`);
      }

      const aiData = await aiResp.json();
      const rawMessage: string = aiData.choices[0].message.content ?? "";
      const spokenMessage = formatForTTS(rawMessage);
      const aiMessage = spokenMessage || rawMessage;

      // 2. Generate audio via ElevenLabs TTS — warm, conversational settings.
      let audioBase64: string | null = null;
      let ttsAvailable = false;
      if (ELEVENLABS_API_KEY) {
        try {
          const voiceId = "EXAVITQu4vr4xnSDxMaL";
          const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: aiMessage,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.45,
                  similarity_boost: 0.8,
                  style: 0.55,
                  use_speaker_boost: true,
                  speed: 0.97,
                },
              }),
            }
          );

          if (ttsResp.ok) {
            const audioBuffer = await ttsResp.arrayBuffer();
            const uint8 = new Uint8Array(audioBuffer);
            let binary = "";
            for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
            audioBase64 = btoa(binary);
            ttsAvailable = true;
          } else {
            console.error("ElevenLabs TTS error:", ttsResp.status);
          }
        } catch (ttsErr) {
          console.error("TTS generation error:", ttsErr);
        }
      }

      // 3. Send talk command to D-ID stream (if available)
      let didTalkResult = null;
      if (DID_API_KEY && stream_id && session_id) {
        try {
          const talkResp = await fetch(
            `https://api.d-id.com/talks/streams/${stream_id}`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${DID_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                session_id,
                script: {
                  type: "text",
                  input: aiMessage.substring(0, 1500),
                  provider: { type: "microsoft", voice_id: "en-US-JennyNeural" },
                },
                config: { fluent: true },
              }),
            }
          );

          if (talkResp.ok) didTalkResult = await talkResp.json();
          else console.error("D-ID talk error:", talkResp.status);
        } catch (didErr) {
          console.error("D-ID talk error:", didErr);
        }
      }

      // ─── PR2: persist memory + open intervention alert if triggered ───
      if (effectiveUserId && courseId) {
        const nextTopics = [
          ...(moduleTitle ? [moduleTitle] : []),
          ...(pedagogy.nextMemory.last_topics || []),
        ].slice(0, 6);
        await supabase.from("tutor_student_memory").upsert({
          user_id: effectiveUserId,
          course_id: courseId,
          ...pedagogy.nextMemory,
          last_topics: nextTopics,
          last_interaction_at: new Date().toISOString(),
        }, { onConflict: "user_id,course_id" });

        if (pedagogy.shouldIntervene) {
          const { data: existing } = await supabase
            .from("student_intervention_alerts")
            .select("id")
            .eq("user_id", effectiveUserId)
            .eq("course_id", courseId)
            .eq("status", "open")
            .maybeSingle();
          if (!existing) {
            await supabase.from("student_intervention_alerts").insert({
              user_id: effectiveUserId,
              course_id: courseId,
              trigger_reason: pedagogy.interventionReason ?? "Repeated low assessment scores.",
              recommended_action: "Faculty check-in; tutor switched to revision mode.",
              metadata: { source: "ai-avatar-stream", mode: pedagogy.mode },
            });
          }
        }
      }

      return json({
        message: aiMessage,
        audio_base64: audioBase64,
        tts_available: ttsAvailable,
        did_talk: didTalkResult,
        teaching_mode: pedagogy.mode,
        intervention_opened: pedagogy.shouldIntervene,
        memory_user_scoped: Boolean(effectiveUserId && courseId),
      });
    }

    // ─── ACTION: Send SDP answer (WebRTC handshake) ───
    if (action === "sdp_answer") {
      const { stream_id, session_id, answer } = body;
      if (!DID_API_KEY) throw new Error("DID_API_KEY not configured");
      const resp = await fetch(`https://api.d-id.com/talks/streams/${stream_id}/sdp`, {
        method: "POST",
        headers: { Authorization: `Basic ${DID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id, answer }),
      });
      if (!resp.ok) throw new Error(`SDP answer failed: ${await resp.text()}`);
      return json({ success: true });
    }

    // ─── ACTION: Send ICE candidate ───
    if (action === "ice_candidate") {
      const { stream_id, session_id, candidate } = body;
      if (!DID_API_KEY) throw new Error("DID_API_KEY not configured");
      const resp = await fetch(`https://api.d-id.com/talks/streams/${stream_id}/ice`, {
        method: "POST",
        headers: { Authorization: `Basic ${DID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id, candidate }),
      });
      if (!resp.ok) console.error("ICE candidate error:", await resp.text());
      return json({ success: true });
    }

    // ─── ACTION: Destroy stream ───
    if (action === "destroy_stream") {
      const { stream_id, session_id } = body;
      if (DID_API_KEY && stream_id) {
        try {
          await fetch(`https://api.d-id.com/talks/streams/${stream_id}`, {
            method: "DELETE",
            headers: { Authorization: `Basic ${DID_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ session_id }),
          });
        } catch (e) {
          console.error("Stream destroy error:", e);
        }
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action. Use: provider_health, create_stream, talk, sdp_answer, ice_candidate, destroy_stream" }, 400);
  } catch (error: any) {
    console.error("ai-avatar-stream error:", error);
    return json({ error: error.message }, 500);
  }
});