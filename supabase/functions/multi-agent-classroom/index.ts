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

    const system = `${IVY_PLUS_RUBRIC}

[CLASSROOM ORCHESTRATION]
You are orchestrating a live three-agent doctoral seminar at ScrollUniversity for the module "${mod.title}" in "${courseTitle}" (${faculty}).
Three agents speak in turn, each held to the Ivy+ rubric above:

- LECTURER (Dr. Selah, endowed-chair professor): Doctoral-seminar register. Names primary literature or scripture (chapter:verse). Distinguishes observation, theory, conjecture. Walks through method, not just conclusion.
- PEER (Mara, advanced graduate student): Asks the sharpest question a top-tier student would ask. Occasionally voices a sophisticated misconception that deserves correction. Never says "great question".
- TA (Tobias, doctoral teaching fellow): Pushes for rigor — demands operational definitions, surfaces the strongest counter-argument, offers a counterexample or limiting case, then sets a non-trivial micro-exercise.

Use the provided module content as primary ground truth; supplement only with widely accepted canonical sources you can name. Never invent citations or statistics.
Return ${rounds} rounds. Each round = one turn from each agent in order: LECTURER → PEER → TA. Each turn 70–160 words.
${body.studentQuestion ? `Open by directly engaging the student's question: "${body.studentQuestion}"` : "Open with the Lecturer framing today's central problem and what is at stake."}
Close with the TA assigning a 2-minute reflection prompt that requires evaluation or synthesis (not recall).`;

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
