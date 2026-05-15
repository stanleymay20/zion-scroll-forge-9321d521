// ✝️ Multi-Agent Classroom — orchestrates Lecturer + Peer Student + Teaching Assistant
// Returns a structured turn-by-turn dialogue grounded in the module content.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { extractAuthenticatedUser } from "../_shared/validation.ts";
import { IVY_PLUS_RUBRIC } from "../_shared/ivy-pedagogy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  moduleId: string;
  studentQuestion?: string;
  rounds?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require authenticated user
    const { error: authError } = await extractAuthenticatedUser(
      req,
      supabase,
      corsHeaders,
    );
    if (authError) return authError;

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body?.moduleId || !/^[0-9a-f-]{36}$/i.test(body.moduleId)) {
      return json({ error: "valid moduleId required" }, 400);
    }
    const rounds = Math.min(Math.max(body.rounds ?? 3, 1), 5);

    const { data: mod, error } = await supabase
      .from("course_modules")
      .select("id, title, content_md, courses(title, faculty)")
      .eq("id", body.moduleId)
      .maybeSingle();
    if (error || !mod) return json({ error: "module not found" }, 404);

    const courseTitle = (mod.courses as any)?.title ?? "";
    const faculty = (mod.courses as any)?.faculty ?? "";
    const moduleContext = (mod.content_md ?? "").slice(0, 6000);

    const system = `You are orchestrating a live three-agent ScrollUniversity classroom for the module "${mod.title}" in "${courseTitle}" (${faculty}).
Three agents speak in turn:
- LECTURER (Dr. Selah, endowed-chair professor): Authoritative, citation-grounded, scripturally fluent, doctoral tone.
- PEER (Mara, fellow student): Curious, asks the questions a smart student would ask. Sometimes wrong-on-purpose to surface a misconception.
- TA (Tobias, teaching assistant): Pushes for rigor — asks "why", offers counterexamples, summarizes, sets a micro-exercise.

Use ONLY the provided module content as the ground truth. Cite scripture with chapter:verse. Never invent sources.
Return ${rounds} rounds. Each round = one turn from each agent in order: LECTURER → PEER → TA.
${body.studentQuestion ? `Open the lesson by addressing the student's question: "${body.studentQuestion}"` : "Open with the Lecturer framing today's central question."}
End with the TA assigning a 1-minute reflection prompt.`;

    const tool = {
      type: "function",
      function: {
        name: "render_classroom",
        description: "Return the structured multi-agent classroom dialogue.",
        parameters: {
          type: "object",
          properties: {
            opening: { type: "string", description: "One-sentence framing of today's session." },
            turns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  speaker: { type: "string", enum: ["LECTURER", "PEER", "TA"] },
                  text: { type: "string" },
                },
                required: ["speaker", "text"],
                additionalProperties: false,
              },
            },
            reflection_prompt: { type: "string" },
          },
          required: ["opening", "turns", "reflection_prompt"],
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Module content:\n"""\n${moduleContext}\n"""` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "render_classroom" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiRes.ok) return json({ error: `AI error ${aiRes.status}` }, 500);

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "No structured output" }, 500);
    const args = JSON.parse(call.function.arguments);
    return json({ success: true, ...args });
  } catch (e) {
    console.error("multi-agent-classroom error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
