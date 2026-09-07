// ✝️ Expand Thin Modules — controlled AI authoring aid for under-developed modules.
// Generated content is never publication authority: every write is versioned,
// returned to draft, provenance-stamped, and must pass independent academic review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_CHARS = 8000;
const BATCH_LIMIT_DEFAULT = 20;
const CONCURRENCY = 5;

const SYSTEM_PROMPT =
  "You are a senior endowed-chair professor designing the definitive university-grade chapter for a faith-integrated institution. Write 2500-3500 words of rigorous, citation-grounded academic prose in clean Markdown. Include: an orientation, 6-8 themed sections with ## headings, primary-source quotations, named scholarly references (real authors, real works), worked examples or case studies, scripture engaged exegetically (not as decoration), key terms, discussion questions, further reading, and a synthesis. No placeholders. No filler. No mentions of being an AI. No first-person. Generated material is a draft for faculty review; do not claim that citations, quotations, or factual assertions have been independently verified.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Authentication happens before provider/key checks so the endpoint does not
    // disclose operational configuration to unauthenticated callers.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roleError) throw new Error(`Failed to resolve academic role: ${roleError.message}`);

    const roles = new Set((roleRows ?? []).map((row: any) => String(row.role)));
    const isInstitutionAdmin = roles.has("admin") || roles.has("superadmin");

    let assignedCourseIds: string[] = [];
    if (!isInstitutionAdmin) {
      const { data: assignments, error: assignmentError } = await supabase
        .from("faculty_teaching_assignments")
        .select("course_id")
        .eq("faculty_user_id", user.id)
        .eq("state", "active")
        .not("course_id", "is", null);
      if (assignmentError) {
        throw new Error(`Failed to resolve teaching assignments: ${assignmentError.message}`);
      }
      assignedCourseIds = Array.from(new Set(
        (assignments ?? []).map((row: any) => row.course_id).filter(Boolean),
      ));
      if (assignedCourseIds.length === 0) {
        return json({ error: "active teaching assignment or admin role required" }, 403);
      }
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!lovableKey && !deepseekKey) return json({ error: "No AI provider configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || BATCH_LIMIT_DEFAULT, 1), 50);
    const forceProvider: "lovable" | "deepseek" | undefined =
      body.provider === "lovable" || body.provider === "deepseek" ? body.provider : undefined;

    let moduleQuery = supabase
      .from("course_modules")
      .select("id, course_id, title, content_md, content_char_count, courses(title, faculty)")
      .or("content_char_count.lt.8000,content_char_count.is.null")
      .order("content_char_count", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (!isInstitutionAdmin) moduleQuery = moduleQuery.in("course_id", assignedCourseIds);

    const { data: thinModules, error: queryError } = await moduleQuery;
    if (queryError) throw queryError;

    if (!thinModules || thinModules.length === 0) {
      return json({ success: true, message: "No authorized thin modules found", processed: 0 });
    }

    const results: Array<{
      id: string;
      status: string;
      provider?: string;
      model?: string;
      chars?: number;
      error?: string;
    }> = [];

    async function callLovable(prompt: string) {
      return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
        }),
      });
    }

    async function callDeepSeek(prompt: string) {
      return fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${deepseekKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
          max_tokens: 8000,
        }),
      });
    }

    async function processOne(mod: any) {
      try {
        // Re-check the database authority immediately before mutation. This is
        // deliberate defense-in-depth against a teaching assignment changing
        // after the initial batch query.
        const { data: canAuthor, error: authorityError } = await supabase.rpc(
          "can_author_module_content",
          { p_user_id: user.id, p_module_id: mod.id },
        );
        if (authorityError) throw new Error(`Content authority check failed: ${authorityError.message}`);
        if (!canAuthor) return { id: mod.id, status: "forbidden" };

        const courseTitle = (mod.courses as any)?.title ?? "";
        const faculty = (mod.courses as any)?.faculty ?? "";
        const prompt = buildPrompt(courseTitle, faculty, mod.title, mod.content_md ?? "");
        const promptHash = await sha256Hex(`${SYSTEM_PROMPT}\n\n${prompt}`);

        let aiRes: Response | null = null;
        let usedProvider = "";
        let usedModel = "";

        if (lovableKey && forceProvider !== "deepseek") {
          aiRes = await callLovable(prompt);
          usedProvider = "lovable";
          usedModel = "google/gemini-2.5-pro";
          if (aiRes.status === 402 && deepseekKey) {
            aiRes = await callDeepSeek(prompt);
            usedProvider = "deepseek";
            usedModel = "deepseek-chat";
          }
        } else if (deepseekKey) {
          aiRes = await callDeepSeek(prompt);
          usedProvider = "deepseek";
          usedModel = "deepseek-chat";
        }

        if (!aiRes) return { id: mod.id, status: "no_provider" };
        if (aiRes.status === 429) {
          return { id: mod.id, status: "rate_limited", provider: usedProvider, model: usedModel };
        }
        if (!aiRes.ok) {
          const errText = await aiRes.text();
          return {
            id: mod.id,
            status: "ai_error",
            provider: usedProvider,
            model: usedModel,
            error: errText.slice(0, 200),
          };
        }

        const data = await aiRes.json();
        const newContent: string = data?.choices?.[0]?.message?.content ?? "";
        if (!newContent || newContent.length < MIN_CHARS) {
          return {
            id: mod.id,
            status: "too_short",
            provider: usedProvider,
            model: usedModel,
            chars: newContent.length,
          };
        }

        const now = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from("course_modules")
          .update({
            content_md: newContent,
            content_char_count: newContent.length,
            ai_generated: true,
            content_source: "ai_generated",
            content_model: usedModel,
            content_prompt_hash: promptHash,
            content_generated_by: user.id,
            content_generated_at: now,
            content_changed_by: user.id,
            content_review_state: "draft",
            quality_verified: false,
          })
          .eq("id", mod.id);

        if (updateErr) return { id: mod.id, status: "update_failed", error: updateErr.message };
        return {
          id: mod.id,
          status: "expanded_draft",
          provider: usedProvider,
          model: usedModel,
          chars: newContent.length,
        };
      } catch (e) {
        return { id: mod.id, status: "exception", error: (e as Error).message };
      }
    }

    const runBackground = async () => {
      for (let i = 0; i < thinModules.length; i += CONCURRENCY) {
        const batch = thinModules.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(processOne));
        results.push(...batchResults);
        const expanded = batchResults.filter((r) => r.status === "expanded_draft").length;
        const failed = batchResults.length - expanded;
        console.log(
          `[expand-thin-modules] batch ${i / CONCURRENCY + 1}: +${expanded} draft revisions, ${failed} other`,
        );
        if (batchResults.every((r) => r.status === "rate_limited" || r.status === "ai_error")) break;
      }
      console.log(
        `[expand-thin-modules] DONE: ${results.filter((r) => r.status === "expanded_draft").length}/${results.length} draft revisions generated`,
      );
    };

    // Supabase EdgeRuntime keeps the authenticated, already-authorized batch alive
    // without making HTTP latency the authority boundary.
    // @ts-ignore EdgeRuntime is provided by Supabase Edge Functions.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore EdgeRuntime is provided by Supabase Edge Functions.
      EdgeRuntime.waitUntil(runBackground());
      return json({
        success: true,
        queued: thinModules.length,
        review_state: "draft",
        message: `Background authoring started for ${thinModules.length} authorized modules. Generated revisions require independent review before publication.`,
      });
    }

    await runBackground();
    return json({
      success: true,
      processed: results.length,
      expanded_draft: results.filter((r) => r.status === "expanded_draft").length,
      review_state: "draft",
      results: results.slice(0, 20),
    });
  } catch (err) {
    console.error("expand-thin-modules error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function buildPrompt(course: string, faculty: string, moduleTitle: string, existing: string) {
  return `Rewrite and substantially expand the following module into a complete, university-grade chapter.

Course: ${course}
Faculty: ${faculty}
Module title: ${moduleTitle}

Existing content (may be very short or empty):
"""
${existing.slice(0, 1500)}
"""

Requirements:
- 2500-3500 words of substantive, rigorous academic prose in Markdown.
- Open with a one-paragraph orientation framing the module's stakes and trajectory.
- 6-8 sections using ## headings, each with depth (definitions, mechanisms, examples).
- Engage scripture exegetically (cite chapter:verse) AND named scholarly works (real author + title).
- Include at least one worked example, case study, or thought experiment.
- Add "## Key Terms", "## Discussion Questions" (5 items), "## Further Reading" (4-6 real sources), and "## Synthesis & Reflection".
- Treat all generated citations and quotations as claims requiring faculty verification before publication.
- Tone: doctoral seminar, reverent, accessible to advanced undergraduates.
- Output ONLY the Markdown body — no preamble, no meta-commentary.`;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
