// Seeds quiz question banks for quizzes and quiz-type assignments
// by generating 5 MCQs per module via Lovable AI Gateway.
// Admin-only. Idempotent: only fills items that are still empty.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `You write rigorous multiple-choice questions for a Christian-rooted graduate university (Scroll University). Output ONLY a JSON tool call with 5 questions. Each question: one prompt, exactly 4 options labeled A-D, one correct answer (the option text), and a one-sentence explanation grounded in the source.`;

const tool = {
  type: "function",
  function: {
    name: "emit_questions",
    description: "Return 5 high-quality MCQs grounded in the module content.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" },
              },
              correctAnswer: { type: "string" },
              explanation: { type: "string" },
            },
            required: ["question", "options", "correctAnswer", "explanation"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

async function generateQuestions(
  moduleTitle: string,
  contentMd: string,
): Promise<any[] | null> {
  const trimmed = (contentMd || "").slice(0, 8000);
  if (trimmed.length < 500) return null;
  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Module: ${moduleTitle}\n\n---\n${trimmed}\n---\nWrite 5 MCQs.`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_questions" } },
      }),
    },
  );
  if (!resp.ok) {
    console.error("AI error", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try {
    const args = JSON.parse(call.function.arguments);
    return args.questions ?? null;
  } catch (e) {
    console.error("parse error", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "superadmin"])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize: number = Math.min(Math.max(body.batch_size ?? 10, 1), 30);

    let processedQuizzes = 0;
    let processedAssignments = 0;
    const errors: string[] = [];

    // 1. Seed quizzes table → course_modules.quiz_data
    const { data: pendingQuizzes } = await admin
      .from("quizzes")
      .select("id, title, module_id, course_modules!inner(id, title, content_md, quiz_data)")
      .limit(batchSize);

    for (const q of pendingQuizzes ?? []) {
      const m: any = (q as any).course_modules;
      const existing = m?.quiz_data?.questions;
      if (Array.isArray(existing) && existing.length > 0) continue;
      const questions = await generateQuestions(m.title, m.content_md ?? "");
      if (!questions) {
        errors.push(`quiz ${q.id}: generation failed`);
        continue;
      }
      const newQuizData = { ...(m.quiz_data ?? {}), questions };
      const { error: upErr } = await admin
        .from("course_modules")
        .update({ quiz_data: newQuizData })
        .eq("id", m.id);
      if (upErr) errors.push(`quiz ${q.id}: ${upErr.message}`);
      else processedQuizzes++;
    }

    // 2. Seed quiz-type assignments → assessment_question_pools
    const { data: pendingAssignments } = await admin
      .from("assignments")
      .select("id, title, module_id, course_modules!inner(id, title, content_md)")
      .eq("type", "quiz")
      .limit(batchSize);

    for (const a of pendingAssignments ?? []) {
      const { data: existingPool } = await admin
        .from("assessment_question_pools")
        .select("id")
        .eq("assignment_id", a.id)
        .maybeSingle();
      if (existingPool) continue;
      const m: any = (a as any).course_modules;
      const questions = await generateQuestions(m.title, m.content_md ?? "");
      if (!questions) {
        errors.push(`assignment ${a.id}: generation failed`);
        continue;
      }
      const { error: insErr } = await admin
        .from("assessment_question_pools")
        .insert({
          assignment_id: a.id,
          questions,
          draw_count: 5,
          shuffle: true,
        });
      if (insErr) errors.push(`assignment ${a.id}: ${insErr.message}`);
      else processedAssignments++;
    }

    // Remaining counts
    const { count: remainingQuizzes } = await admin
      .from("quizzes")
      .select("id, course_modules!inner(quiz_data)", {
        count: "exact",
        head: false,
      })
      .limit(1);
    const { count: remainingAssignments } = await admin
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("type", "quiz");
    const { count: filledPools } = await admin
      .from("assessment_question_pools")
      .select("id", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        processed_quizzes: processedQuizzes,
        processed_assignments: processedAssignments,
        filled_pools_total: filledPools,
        remaining_quizzes_total: remainingQuizzes,
        remaining_assignments_total: remainingAssignments,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
