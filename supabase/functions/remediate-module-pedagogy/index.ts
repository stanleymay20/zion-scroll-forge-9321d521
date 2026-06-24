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

  // PASS 1 — pedagogy metadata + quiz (small, structured JSON)
  const metaSystem = `You are a senior endowed-chair professor at ScrollUniversity — a faith-integrated MIT/Harvard-tier institution. You write rigorous, citation-grounded curriculum per the Scroll Pedagogy Model (Revelation + Reason; Transformation over Information; Practice-First). Respond ONLY with valid JSON.`;
  const metaUser = `Produce ONLY the pedagogy metadata JSON for the module below. No content_md here.

Course: ${courseTitle}
Faculty: ${faculty}
Module title: ${moduleTitle}
Available Course Learning Outcomes:
${cloBrief}

Existing module content (may be templated/thin):
"""
${existing.slice(0, 1000)}
"""

Return JSON with EXACTLY these fields:
{
  "learning_objectives": [3 module-SPECIFIC objectives — name THIS module's concepts, not the course; verb-led; measurable],
  "reflective_prompt": "One paragraph (>=100 words) connecting the module to identity, calling, and Scripture",
  "formative_checkpoints": [
    {"prompt":"low-stakes check 1","expected":"concise model answer"},
    {"prompt":"low-stakes check 2","expected":"concise model answer"},
    {"prompt":"low-stakes check 3","expected":"concise model answer"}
  ],
  "tutor_context": "300-500 word briefing the live AI lecturer can use to ground turns: the module's central question, key concepts, analogies, misconceptions to correct, calling-relevant examples",
  "quiz_questions": [6 MCQs tagged to the CLOs above with rising Bloom (remember→create). Schema per item: {"prompt":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"B) ...","explanation":"why correct + why distractors fail","clo_code":"CLO2","bloom_level":"apply"}]
}`;

  // PASS 2 — long-form chapter (uses full token budget)
  const contentSystem = `You are a senior endowed-chair professor at ScrollUniversity writing a definitive long-form chapter. No placeholders, no AI mentions, no first-person plural marketing tone. Engage Scripture exegetically with chapter:verse. Cite real named scholarly works. Respond ONLY with valid JSON.`;
  const contentUser = (meta: any) => `Write the full chapter for the module below as Markdown, 2500-3500 words, using these EXACT ## headings in this order: '## Ignition', '## Download', '## Demonstration', '## Activation', '## Reflection', '## Commission', then '## Key Terms', then '## Further Reading'.

Course: ${courseTitle}
Module: ${moduleTitle}
Learning objectives you MUST address: ${JSON.stringify(meta.learning_objectives)}
Tutor briefing (use as ground truth for concepts, analogies, examples): ${meta.tutor_context}

Return JSON: {"content_md": "..."}`;

  const callLovable = async (body: any) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const callDeepSeek = async (body: any) => fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const runAi = async (system: string, user: string, maxTokens: number) => {
    const body = {
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    };
    const dsBody = {
      model: "deepseek-chat",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    };
    let res: Response | null = null;
    if (lovableKey) {
      res = await callLovable(body);
      if ((res.status === 402 || res.status === 429) && deepseekKey) res = await callDeepSeek(dsBody);
    } else if (deepseekKey) {
      res = await callDeepSeek(dsBody);
    }
    if (!res || !res.ok) {
      console.error("ai call failed", res?.status, await res?.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    try { return JSON.parse(raw); } catch (e) {
      console.error("json parse failed", (e as Error).message, raw.slice(0, 400));
      return null;
    }
  };

  const meta = await runAi(metaSystem, metaUser, 4000);
  if (!meta) return null;

  const reasons: string[] = [];
  if (!Array.isArray(meta.learning_objectives) || meta.learning_objectives.length < 3) reasons.push("objectives_insufficient");
  if (typeof meta.reflective_prompt !== "string" || meta.reflective_prompt.length < 80) reasons.push("reflective_prompt_missing");
  if (!Array.isArray(meta.formative_checkpoints) || meta.formative_checkpoints.length < 2) reasons.push("formative_checkpoints_missing");
  if (typeof meta.tutor_context !== "string" || meta.tutor_context.length < 200) reasons.push("tutor_context_missing");
  if (!Array.isArray(meta.quiz_questions) || meta.quiz_questions.length < 5) reasons.push("quiz_questions_insufficient");
  if (reasons.length > 0) { console.error("meta validation failed", reasons); return null; }

  const contentOut = await runAi(contentSystem, contentUser(meta), 16000);
  if (!contentOut || typeof contentOut.content_md !== "string" || contentOut.content_md.length < 6000) {
    console.error("content_md insufficient", contentOut?.content_md?.length ?? 0);
    return null;
  }

  return {
    learning_objectives: meta.learning_objectives,
    reflective_prompt: meta.reflective_prompt,
    formative_checkpoints: meta.formative_checkpoints,
    tutor_context: meta.tutor_context,
    content_md: contentOut.content_md,
    quiz_questions: meta.quiz_questions,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
