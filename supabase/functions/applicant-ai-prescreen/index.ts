// AI pre-screen of an applicant's motivation statement.
// Admin-only. Uses Lovable AI Gateway. Stores ai_review_score (0-100)
// and ai_review_summary on the student row.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiOutput } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: aErr } = await supabase.auth.getUser(token);
    if (aErr || !user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "admin role required" }, 403);

    const { student_id } = await req.json();
    if (!student_id) return json({ error: "student_id required" }, 400);

    const { data: student } = await supabase
      .from("students")
      .select("id, full_name, country, motivation_statement, degree_program_id")
      .eq("id", student_id)
      .maybeSingle();
    if (!student) return json({ error: "not found" }, 404);
    if (!student.motivation_statement || student.motivation_statement.trim().length < 20) {
      return json({ error: "motivation statement too short to score" }, 400);
    }

    let programTitle = "";
    if (student.degree_program_id) {
      const { data: prog } = await supabase
        .from("degree_programs")
        .select("title, level")
        .eq("id", student.degree_program_id)
        .maybeSingle();
      if (prog) programTitle = `${prog.title}${prog.level ? " (" + prog.level + ")" : ""}`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

    const prompt = `You are an admissions officer for ScrollUniversity, a faith-driven academic institution.
Score the applicant 0-100 on: clarity, motivation, program fit, commitment, basic literacy.
Applicant: ${student.full_name} (${student.country ?? "n/a"})
Program: ${programTitle || "Undeclared"}
Motivation statement:
"""
${student.motivation_statement}
"""
Respond ONLY in JSON: {"score": <0-100>, "summary": "<2-3 sentences>", "recommendation": "accept|waitlist|reject"}`;

    const t0 = Date.now();
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      await logAiOutput({
        user_id: user.id, feature: "prescreen", model: "google/gemini-2.5-flash",
        provider: "lovable-ai", prompt, latency_ms: Date.now() - t0,
        status: "error", error_message: `gateway ${aiRes.status}: ${t.slice(0,200)}`,
        metadata: { student_id },
      });
      return json({ error: `AI gateway ${aiRes.status}: ${t}` }, 502);
    }
    const aiBody = await aiRes.json();
    const content = aiBody?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const score = Math.max(0, Math.min(100, parseInt(parsed.score ?? 0)));
    const summary = String(parsed.summary ?? "").slice(0, 1000);
    const recommendation = ["accept", "waitlist", "reject"].includes(parsed.recommendation)
      ? parsed.recommendation : "waitlist";

    await supabase.from("students").update({
      ai_review_score: score,
      ai_review_summary: `${summary}\n\nRecommendation: ${recommendation}`,
      ai_reviewed_at: new Date().toISOString(),
    }).eq("id", student_id);

    return json({ ok: true, score, summary, recommendation });
  } catch (e: any) {
    console.error("applicant-ai-prescreen error", e);
    return json({ error: e.message ?? "internal error" }, 500);
  }
});
