// ✝️ Course Recommendations — Christ is Lord over guidance
// Returns ONLY courses that belong to the student's admitted degree program,
// in their proper sequencing order, excluding already-enrolled coursework.
// No global course pool, no cross-faculty leakage.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logAiOutput } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

console.info("✝️ Course Recommendations — degree-program scoped");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("authorization") ?? "";
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) return json({ error: "Unauthorized" }, 401);

    // IDOR fix: ignore any caller-supplied userId. Always use the JWT user.
    const userId = user.id;

    // Resolve student's admitted program (the lock anchor).
    const { data: student } = await supabase
      .from("students")
      .select("degree_program_id, current_year")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!student?.degree_program_id) {
      // Not yet admitted to a program → no recommendations (do NOT fall back to global pool).
      return json({ success: true, recommendations: [], reason: "no_admitted_program" });
    }

    // Pull program-aligned courses with full sequencing metadata.
    const { data: planned, error: planErr } = await supabase
      .from("degree_program_courses")
      .select(
        "course_id, sequence_order, recommended_year, recommended_term, is_required, courses(id, title, description, faculty, level, tags, institution_id)",
      )
      .eq("degree_program_id", student.degree_program_id)
      .order("recommended_year", { ascending: true, nullsFirst: false })
      .order("sequence_order", { ascending: true });

    if (planErr) {
      console.error("plan fetch failed", planErr);
      return json({ error: "Failed to load curriculum plan" }, 500);
    }

    // Already-enrolled course IDs (any progress, any institution context).
    const { data: enrolled } = await supabase
      .from("enrollments")
      .select("course_id, progress")
      .eq("user_id", userId);

    const completedSet = new Set(
      (enrolled ?? [])
        .filter((e: any) => (e.progress ?? 0) >= 100)
        .map((e: any) => e.course_id),
    );
    const enrolledSet = new Set((enrolled ?? []).map((e: any) => e.course_id));

    const currentYear = student.current_year ?? 1;

    const recommendations = (planned ?? [])
      .filter((row: any) => row.courses && !enrolledSet.has(row.course_id))
      .map((row: any, idx: number) => {
        // Higher score = more strongly recommended now.
        let score = 0;
        if (row.is_required) score += 5;
        const ryear = row.recommended_year ?? currentYear;
        if (ryear <= currentYear) score += 4; // available this year
        else score -= (ryear - currentYear); // future year, demote
        score -= idx * 0.01; // stable secondary sort by order
        return {
          course_id: row.course_id,
          relevance_score: Math.max(0, score),
          reason: row.is_required
            ? `Required Year ${ryear} course in your program`
            : `Recommended elective for Year ${ryear}`,
          course: row.courses,
          sequence_order: row.sequence_order,
          recommended_year: ryear,
          recommended_term: row.recommended_term,
        };
      })
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5);

    // Persist (program-scoped, never global)
    if (recommendations.length > 0) {
      await supabase.from("course_recommendations").delete().eq("user_id", userId);
      await supabase.from("course_recommendations").insert(
        recommendations.map((r) => ({
          user_id: userId,
          course_id: r.course_id,
          relevance_score: r.relevance_score,
          reason: r.reason,
        })),
      );
    }

    await logAiOutput({
      user_id: userId, feature: "recommendation", provider: "deterministic",
      latency_ms: 0, status: "ok",
      metadata: { program_id: student.degree_program_id, count: recommendations.length },
    });

    return json({
      success: true,
      program_id: student.degree_program_id,
      completed_count: completedSet.size,
      recommendations: recommendations.map((r) => ({
        ...r.course,
        sequence_order: r.sequence_order,
        recommended_year: r.recommended_year,
        recommended_term: r.recommended_term,
        reason: r.reason,
      })),
    });
  } catch (error: any) {
    console.error("Recommendations error:", error);
    return json({ error: error.message ?? "Internal error" }, 500);
  }
});
