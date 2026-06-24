// ✝️ Remediate Module Pedagogy
// Repairs a module's pedagogy in one structured AI pass:
//   • Module-unique learning objectives (replaces templated text)
//   • 6-step flow markers baked into content_md (Ignition → Commission)
//   • Reflective prompt + formative checkpoints
//   • tutor_context for the live AI lecturer
//   • 6 quiz questions tagged to the module's CLOs with Bloom levels
//
// Uses Lovable AI Gateway (preferred) with DeepSeek fallback. Background-safe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BLOOM = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

interface CLO {
  id: string;
  code: string;
  statement: string;
  bloom_level: string | null;
}

interface RemediatedPayload {
  learning_objectives: string[];
  reflective_prompt: string;
  formative_checkpoints: Array<{ prompt: string; expected: string }>;
  tutor_context: string;
  content_md: string;
  quiz_questions: Array<{
    prompt: string;
    options: string[];
    answer: string;
    explanation: string;
    clo_code: string;
    bloom_level: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!lovableKey && !deepseekKey) return json({ error: "No AI provider configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const moduleId: string | undefined = body.module_id;
    const limit = Math.min(Number(body.limit) || 5, 25);

    // Resolve target modules: explicit id, OR a batch of failing modules
    let targets: any[] = [];
    if (moduleId) {
      const { data } = await supabase
        .from("course_modules")
        .select("id, course_id, title, content_md, clo_ids, courses(title, faculty)")
        .eq("id", moduleId)
        .limit(1);
      targets = data ?? [];
    } else {
      const { data } = await supabase
        .from("course_modules")
        .select("id, course_id, title, content_md, clo_ids, courses(title, faculty)")
        .eq("quality_verified", false)
        .limit(limit);
      targets = data ?? [];
    }

    if (targets.length === 0) {
      return json({ success: true, processed: 0, message: "No modules to remediate" });
    }

    const run = async () => {
      const results: any[] = [];
      for (const mod of targets) {
        try {
          const { data: clos } = await supabase
            .from("course_learning_outcomes")
            .select("id, code, statement, bloom_level")
            .eq("course_id", mod.course_id)
            .order("code");
          const cloList: CLO[] = (clos as any) ?? [];

          const payload = await draftRemediation({
            lovableKey, deepseekKey,
            courseTitle: mod.courses?.title ?? "",
            faculty: mod.courses?.faculty ?? "",
            moduleTitle: mod.title,
            existing: (mod.content_md ?? "").slice(0, 1500),
            clos: cloList,
          });

          if (!payload) {
            results.push({ id: mod.id, status: "ai_failed" });
            continue;
          }

          // Persist module-level changes
          const { error: upErr } = await supabase
            .from("course_modules")
            .update({
              learning_objectives: payload.learning_objectives,
              reflective_prompt: payload.reflective_prompt,
              formative_checkpoints: payload.formative_checkpoints,
              tutor_context: payload.tutor_context,
              content_md: payload.content_md,
              content_char_count: payload.content_md.length,
            })
            .eq("id", mod.id);
          if (upErr) {
            results.push({ id: mod.id, status: "update_failed", error: upErr.message });
            continue;
          }

          // Replace this module's quiz questions
          await supabase.from("quiz_questions").delete().eq("module_id", mod.id);
          const qqRows = payload.quiz_questions.map((q, i) => {
            const clo = cloList.find((c) => c.code === q.clo_code) ?? cloList[i % Math.max(cloList.length, 1)];
            return {
              kind: "mcq",
              prompt: q.prompt,
              options: q.options,
              answer: q.answer,
              points: 10,
              order_index: i,
              difficulty_rating: 2,
              learning_objective_id: clo?.id ?? null,
              bloom_level: BLOOM.includes(q.bloom_level) ? q.bloom_level : BLOOM[i % 6],
              course_id: mod.course_id,
              module_id: mod.id,
            };
          });
          if (qqRows.length > 0) {
            const { error: qErr } = await supabase.from("quiz_questions").insert(qqRows);
            if (qErr) {
              results.push({ id: mod.id, status: "quiz_insert_failed", error: qErr.message });
              continue;
            }
          }

          results.push({ id: mod.id, status: "remediated", chars: payload.content_md.length, questions: qqRows.length });
        } catch (e) {
          results.push({ id: mod.id, status: "exception", error: (e as Error).message });
        }
      }
      console.log(`[remediate-module-pedagogy] DONE: ${results.filter(r => r.status === "remediated").length}/${results.length}`);
      return results;
    };

    // @ts-ignore EdgeRuntime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil && targets.length > 1) {
      // @ts-ignore
      EdgeRuntime.waitUntil(run());
      return json({ success: true, queued: targets.length, message: "Background remediation started" });
    }
    const out = await run();
    return json({ success: true, processed: out.length, results: out });
  } catch (err) {
    console.error("remediate-module-pedagogy error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

async function draftRemediation(args: {
  lovableKey?: string; deepseekKey?: string;
  courseTitle: string; faculty: string; moduleTitle: string; existing: string; clos: CLO[];
}): Promise<RemediatedPayload | null> {
  const { lovableKey, deepseekKey, courseTitle, faculty, moduleTitle, existing, clos } = args;
  const cloBrief = clos.map(c => `- ${c.code} (${c.bloom_level ?? 'n/a'}): ${c.statement}`).join("\n");

  const system = `You are a senior endowed-chair professor at ScrollUniversity — a faith-integrated MIT/Harvard-tier institution. You write definitive, rigorous, citation-grounded curriculum that obeys the ScrollUniversity Scroll Pedagogy Model (Revelation + Reason; Transformation over Information; Practice-First). You never produce placeholders, filler, or generic language. You respond ONLY with valid JSON matching the requested schema.`;

  const user = `Remediate ONE module so it passes ScrollUniversity's pedagogy gate. Output ONLY a single JSON object — no markdown fence, no commentary.

Course: ${courseTitle}
Faculty: ${faculty}
Module title: ${moduleTitle}
Course Learning Outcomes available for tagging:
${cloBrief}

Existing module content (may be templated/thin):
"""
${existing}
"""

Return JSON with EXACTLY these fields:
{
  "learning_objectives": [3 module-SPECIFIC objectives — name the module's concepts, NOT the course title; verb-led; measurable],
  "reflective_prompt": "One paragraph (>= 100 words) inviting the student to connect this module to identity, calling, and Scripture",
  "formative_checkpoints": [
    {"prompt": "low-stakes check 1", "expected": "concise model answer"},
    {"prompt": "low-stakes check 2", "expected": "concise model answer"},
    {"prompt": "low-stakes check 3", "expected": "concise model answer"}
  ],
  "tutor_context": "300-500 word briefing the live AI lecturer can use to ground its turns: the module's central question, key concepts, the analogies you want the tutor to use, the misconceptions to correct, and the calling-relevant examples",
  "content_md": "Full chapter in Markdown, 2500-3500 words, structured with these EXACT ## headings in this order: '## Ignition' (hook/opening question), '## Download' (concept teaching), '## Demonstration' (worked example or case), '## Activation' (student practice / your turn), '## Reflection' (identity & integration), '## Commission' (next step / go and do). Engage Scripture exegetically with chapter:verse. Cite real named scholarly works. Include '## Key Terms' and '## Further Reading' after Commission. No placeholders, no first-person, no AI mentions.",
  "quiz_questions": [6 MCQs, each tagged to one of the CLOs above and a Bloom level, schema: {"prompt": "...", "options": ["A) ...","B) ...","C) ...","D) ..."], "answer": "B) ...", "explanation": "why correct + why distractors wrong", "clo_code": "CLO2", "bloom_level": "apply"}. Distribute across CLOs and rise in Bloom from remember → create. Distractors must be plausible and discipline-grounded.]
}`;

  // Try Lovable first
  const callLovable = async () => {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    return res;
  };
  const callDeepSeek = async () => {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      }),
    });
    return res;
  };

  let res: Response | null = null;
  if (lovableKey) {
    res = await callLovable();
    if ((res.status === 402 || res.status === 429) && deepseekKey) {
      res = await callDeepSeek();
    }
  } else if (deepseekKey) {
    res = await callDeepSeek();
  }
  if (!res || !res.ok) {
    console.error("ai call failed", res?.status, await res?.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as RemediatedPayload;
    // Strict pedagogy gate — refuse partial payloads that would corrupt the row.
    const reasons: string[] = [];
    if (!parsed.content_md || parsed.content_md.length < 8000) reasons.push("content_md_too_short");
    if (!Array.isArray(parsed.learning_objectives) || parsed.learning_objectives.length < 3) reasons.push("objectives_insufficient");
    // Some models return a single concatenated string in element 0 — split it.
    if (Array.isArray(parsed.learning_objectives) && parsed.learning_objectives.length === 1 && /\.\s+[A-Z]/.test(parsed.learning_objectives[0])) {
      parsed.learning_objectives = parsed.learning_objectives[0].split(/(?<=[.?!])\s+(?=[A-Z])/).filter((s: string) => s.trim().length > 10);
    }
    if (typeof parsed.reflective_prompt !== "string" || parsed.reflective_prompt.length < 80) reasons.push("reflective_prompt_missing");
    if (!Array.isArray(parsed.formative_checkpoints) || parsed.formative_checkpoints.length < 2) reasons.push("formative_checkpoints_missing");
    if (typeof parsed.tutor_context !== "string" || parsed.tutor_context.length < 200) reasons.push("tutor_context_missing");
    if (!Array.isArray(parsed.quiz_questions) || parsed.quiz_questions.length < 5) reasons.push("quiz_questions_insufficient");
    if (reasons.length > 0) {
      console.error("payload validation failed", reasons, raw.slice(0, 400));
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("json parse failed", (e as Error).message, raw.slice(0, 400));
    return null;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
