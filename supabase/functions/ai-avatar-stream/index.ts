import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body = await req.json();
    const { action } = body;

    // ─── ACTION: Create a streaming session ───
    if (action === "create_stream") {
      if (!DID_API_KEY) {
        throw new Error("DID_API_KEY not configured");
      }

      // Create a D-ID streaming session
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
        throw new Error(`D-ID stream creation failed: ${errText}`);
      }

      const streamData = await streamResp.json();
      console.log("D-ID stream created:", streamData.id);

      return new Response(
        JSON.stringify({
          stream_id: streamData.id,
          session_id: streamData.session_id,
          offer: streamData.offer,
          ice_servers: streamData.ice_servers,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─── ACTION: Send text to avatar (make it talk) ───
    if (action === "talk") {
      const { stream_id, session_id, text, messages, moduleContent, tutorId } =
        body;

      if (!stream_id || !session_id || !text) {
        return new Response(
          JSON.stringify({
            error: "stream_id, session_id, and text are required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 1. Get AI response from Lovable AI
      const systemPrompt = `You are Professor Noelle, a warm AI tutor at Scroll University. You're presenting a live lecture to students via video avatar.

RULES:
- Keep responses to 2-3 short paragraphs (spoken word, ~100-150 words max)
- Be conversational and engaging — you're SPEAKING, not writing
- Reference Scripture naturally when relevant
- Encourage students and check understanding
- Acknowledge Christ as Lord over all learning
${moduleContent ? `\nCURRENT MODULE CONTEXT:\n${moduleContent.substring(0, 2000)}` : ""}`;

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
            temperature: 0.7,
            max_tokens: 400,
          }),
        }
      );

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({
              error: "RATE_LIMITED",
              message: "Rate limited. Please wait a moment.",
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({
              error: "CREDITS_REQUIRED",
              message: "AI credits exhausted. Please add credits.",
            }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        throw new Error(`AI Gateway error: ${status}`);
      }

      const aiData = await aiResp.json();
      const aiMessage = aiData.choices[0].message.content;

      // 2. Generate audio via ElevenLabs TTS
      let audioBase64: string | null = null;
      if (ELEVENLABS_API_KEY) {
        try {
          const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah voice
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
                  stability: 0.6,
                  similarity_boost: 0.75,
                  style: 0.4,
                  use_speaker_boost: true,
                  speed: 1.0,
                },
              }),
            }
          );

          if (ttsResp.ok) {
            const audioBuffer = await ttsResp.arrayBuffer();
            // Use Deno's btoa-safe encoding
            const uint8 = new Uint8Array(audioBuffer);
            let binary = "";
            for (let i = 0; i < uint8.length; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            audioBase64 = btoa(binary);
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

          if (talkResp.ok) {
            didTalkResult = await talkResp.json();
          } else {
            console.error("D-ID talk error:", talkResp.status);
          }
        } catch (didErr) {
          console.error("D-ID talk error:", didErr);
        }
      }

      return new Response(
        JSON.stringify({
          message: aiMessage,
          audio_base64: audioBase64,
          did_talk: didTalkResult,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─── ACTION: Send SDP answer (WebRTC handshake) ───
    if (action === "sdp_answer") {
      const { stream_id, session_id, answer } = body;

      if (!DID_API_KEY) throw new Error("DID_API_KEY not configured");

      const resp = await fetch(
        `https://api.d-id.com/talks/streams/${stream_id}/sdp`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${DID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id, answer }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`SDP answer failed: ${errText}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: Send ICE candidate ───
    if (action === "ice_candidate") {
      const { stream_id, session_id, candidate } = body;

      if (!DID_API_KEY) throw new Error("DID_API_KEY not configured");

      const resp = await fetch(
        `https://api.d-id.com/talks/streams/${stream_id}/ice`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${DID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id, candidate }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("ICE candidate error:", errText);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: Destroy stream ───
    if (action === "destroy_stream") {
      const { stream_id, session_id } = body;

      if (DID_API_KEY && stream_id) {
        try {
          await fetch(`https://api.d-id.com/talks/streams/${stream_id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${DID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id }),
          });
        } catch (e) {
          console.error("Stream destroy error:", e);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action. Use: create_stream, talk, sdp_answer, ice_candidate, destroy_stream",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ai-avatar-stream error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
