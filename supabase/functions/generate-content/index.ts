// ScrollUniversity — controlled curriculum draft generation.
//
// This endpoint is an authoring aid, never academic publication authority.
// It may create course shells and module drafts only. Graded assessments and
// ancillary student-facing materials are deliberately not auto-published here;
// they must flow through their own academic review boundaries.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEEK_THEMES = [
  { week: 1, theme: "Foundations & Introduction", focus: "Core concepts, historical context, biblical foundations" },
  { week: 2, theme: "Theological Framework", focus: "Scriptural basis, doctrinal perspectives, key principles" },
  { week: 3, theme: "Deep Dive Analysis", focus: "In-depth study, case studies, comparative analysis" },
  { week: 4, theme: "Practical Application", focus: "Real-world application, ministry contexts, hands-on exercises" },
  { week: 5, theme: "Advanced Concepts", focus: "Complex topics, scholarly debates, research methods" },
  { week: 6, theme: "Integration & Synthesis", focus: "Connecting ideas, cross-disciplinary insights, holistic understanding" },
  { week: 7, theme: "Professional & Service Practice", focus: "Leadership, supervised application, service and professional practice" },
  { week: 8, theme: "Capstone & Assessment Preparation", focus: "Final synthesis, review, evidence of learning and future directions" },
];

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AiConfig = { url: string; key: string; model: string; provider: string };
type CallerContext = {
  userId: string;
  institutionId: string;
  isAdmin: boolean;
  isSuperadmin: boolean;
  targetCourseId?: string;
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function defaultCourseOutcomes(courseTitle: string, faculty: string): string[] {
  return [
    `Explain the core vocabulary, sources, and methods that shape ${courseTitle}.`,
    `Analyze cases and evidence using ${faculty} standards and biblical-theological reasoning.`,
    `Apply course concepts to supervised professional, ministry, or research practice.`,
    `Produce a final synthesis artifact that demonstrates transferable mastery.`,
  ];
}

function buildLearningProgression(courseTitle: string) {
  return {
    syllabus_standard: [
      "Course purpose and measurable outcomes",
      "Weekly reading, practice, reflection, and evidence rhythm",
      "Formative checkpoints before final synthesis",
      "Academic integrity, citation, and remediation policy",
    ],
    assessment_model: [
      "Formative checks designed for later faculty approval",
      "Applied assignment portfolio",
      "Faculty feedback cycle",
      "Final synthesis project",
    ],
    support_model: [
      "AI tutor available for guided practice, not graded-answer substitution",
      "Advising and progress checkpoints",
      "Peer discussion and cohort accountability",
      "Remediation path before high-stakes completion",
    ],
    capstone: `Final synthesis portfolio for ${courseTitle}`,
  };
}

function buildModuleStandards(course: any, week: number, weekTheme: any) {
  const courseTitle = course.title || "Course";
  const faculty = course.faculty || "General Studies";
  const focus = weekTheme.focus.split(",")[0].toLowerCase();
  return {
    learning_objectives: [
      `Define the core concepts and vocabulary for ${weekTheme.theme}.`,
      `Analyze ${focus} through ${faculty} scholarship and biblical wisdom.`,
      `Apply this week's concepts to a realistic professional, ministry, or research case.`,
      `Create evidence of mastery that connects ${courseTitle} to a concrete context.`,
    ],
    reflective_prompt: `In 120-180 words, explain how ${weekTheme.theme.toLowerCase()} changes your understanding of ${courseTitle}. Cite one course idea or Scripture, name one unresolved question, and describe one concrete action before the next module.`,
    formative_checkpoints: [
      {
        id: `week-${week}-concept-check`,
        prompt: `What is the most important principle from ${weekTheme.theme}, and why does it matter?`,
        mastery_hint: "Define the principle, ground it in course evidence, and explain its consequence.",
      },
      {
        id: `week-${week}-application-check`,
        prompt: `Apply ${weekTheme.theme} to a realistic ${faculty} case or decision.`,
        mastery_hint: "Name the context, evaluate options, and defend a reasoned next step.",
      },
    ],
    module_references: [
      { label: "Primary Scripture", value: "Proverbs 1:7" },
      { label: "Academic method", value: "Evidence-based reasoning with responsible citation" },
    ],
  };
}

async function resolveCallerContext(req: Request, supabase: any, body: any): Promise<CallerContext> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) throw new HttpError(401, "unauthorized");

  const token = authHeader.slice("Bearer ".length);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw new HttpError(401, "unauthorized");

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roleError) throw new HttpError(500, "academic role resolution failed");

  const roles = new Set((roleRows ?? []).map((row: any) => String(row.role)));
  const isSuperadmin = roles.has("superadmin");
  const isAdmin = isSuperadmin || roles.has("admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_institution_id")
    .eq("id", user.id)
    .maybeSingle();

  const requestedInstitutionId = typeof body?.institution_id === "string" ? body.institution_id : undefined;
  const targetCourseId = typeof body?.course_id === "string" ? body.course_id : undefined;

  let targetCourse: any = null;
  if (targetCourseId) {
    const { data, error } = await supabase
      .from("courses")
      .select("id, institution_id")
      .eq("id", targetCourseId)
      .maybeSingle();
    if (error) throw new HttpError(500, "course authority resolution failed");
    if (!data) throw new HttpError(404, "course not found");
    targetCourse = data;
  }

  let institutionId = targetCourse?.institution_id || profile?.current_institution_id || requestedInstitutionId;

  if (requestedInstitutionId && targetCourse?.institution_id && requestedInstitutionId !== targetCourse.institution_id) {
    throw new HttpError(403, "requested institution does not own target course");
  }

  if (!isSuperadmin) {
    if (!profile?.current_institution_id) {
      throw new HttpError(403, "active institutional context required");
    }
    institutionId = targetCourse?.institution_id || profile.current_institution_id;
    if (requestedInstitutionId && requestedInstitutionId !== profile.current_institution_id) {
      throw new HttpError(403, "cross-institution generation forbidden");
    }
    if (targetCourse?.institution_id !== undefined && targetCourse.institution_id !== profile.current_institution_id) {
      throw new HttpError(403, "cross-institution course generation forbidden");
    }
  }

  if (!institutionId && isSuperadmin) {
    const { data } = await supabase
      .from("institutions")
      .select("id")
      .eq("slug", "scrolluniversity")
      .maybeSingle();
    institutionId = data?.id;
  }
  if (!institutionId) throw new HttpError(403, "institution could not be authorized");

  if (!isAdmin && !targetCourseId) {
    throw new HttpError(403, "bulk curriculum generation requires admin role");
  }

  if (!isAdmin && targetCourseId) {
    const { data: assignment, error: assignmentError } = await supabase
      .from("faculty_teaching_assignments")
      .select("id")
      .eq("faculty_user_id", user.id)
      .eq("course_id", targetCourseId)
      .eq("state", "active")
      .limit(1)
      .maybeSingle();
    if (assignmentError) throw new HttpError(500, "teaching assignment resolution failed");
    if (!assignment) throw new HttpError(403, "active teaching assignment or admin role required");
  }

  return {
    userId: user.id,
    institutionId,
    isAdmin,
    isSuperadmin,
    targetCourseId,
  };
}

function resolveAiConfig(): AiConfig {
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (deepseekKey) {
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      key: deepseekKey,
      model: "deepseek-chat",
      provider: "deepseek",
    };
  }
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "google/gemini-2.5-pro",
      provider: "lovable",
    };
  }
  throw new HttpError(500, "No AI provider configured");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) throw new HttpError(500, "server configuration unavailable");

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));

    // Authenticate/authorize before provider resolution so unauthenticated
    // callers cannot use this endpoint as a service-role or provider oracle.
    const caller = await resolveCallerContext(req, supabase, body);
    const aiConfig = resolveAiConfig();

    const { data: progress, error: progressError } = await supabase
      .from("generation_progress")
      .insert({
        institution_id: caller.institutionId,
        progress: 0,
        current_stage: "Initializing controlled curriculum draft generation",
        faculties_created: 0,
        courses_created: 0,
        modules_created: 0,
        tutors_created: 0,
      })
      .select()
      .single();

    if (progressError || !progress) {
      throw new HttpError(500, "generation progress could not be created");
    }

    const task = runGeneration(
      supabase,
      aiConfig,
      progress.id,
      caller.institutionId,
      caller.userId,
      caller.targetCourseId,
    );

    // @ts-ignore Supabase Edge Runtime global.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore Supabase Edge Runtime global.
      EdgeRuntime.waitUntil(task);
    } else {
      await task;
    }

    return json({
      success: true,
      institution_id: caller.institutionId,
      progressId: progress.id,
      authority: "draft_generation_only",
      features: [
        "8-week module draft structure",
        "AI provenance and immutable module revision snapshots",
        "Faculty review required before module publication",
        "Automatic graded-assessment publication withheld pending assessment authority",
        "Automatic ancillary-material publication withheld pending resource authority",
      ],
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "generation failed";
    console.error("generate-content error:", message);
    return json({ error: message }, status);
  }
});

async function runGeneration(
  supabase: any,
  aiConfig: AiConfig,
  progressId: string,
  institutionId: string,
  actorUserId: string,
  targetCourseId?: string,
) {
  const stats = { courses: 0, modules: 0 };

  try {
    let courses: any[] = [];

    if (targetCourseId) {
      const { data: course, error } = await supabase
        .from("courses")
        .select("*, faculties(*)")
        .eq("id", targetCourseId)
        .eq("institution_id", institutionId)
        .single();
      if (error || !course) throw new Error("authorized target course not found");
      courses = [course];
    } else {
      const { data: faculties, error: facultiesError } = await supabase
        .from("faculties")
        .select("*")
        .eq("institution_id", institutionId);
      if (facultiesError) throw facultiesError;
      if (!faculties?.length) throw new Error("No faculties found for authorized institution");

      for (const faculty of faculties) {
        await updateProgress(supabase, progressId, {
          current_stage: `Creating draft course shells for ${faculty.name}`,
        });
        for (let i = 0; i < 4; i++) {
          const course = await generateCourse(
            supabase,
            aiConfig,
            faculty,
            institutionId,
            actorUserId,
            i,
          );
          if (course) {
            courses.push(course);
            stats.courses++;
          }
        }
      }
    }

    const totalModules = Math.max(courses.length * 8, 1);
    for (const course of courses) {
      for (let week = 1; week <= 8; week++) {
        await updateProgress(supabase, progressId, {
          current_stage: `${course.title} — draft Week ${week}: ${WEEK_THEMES[week - 1].theme}`,
          progress: Math.min(95, 20 + Math.floor((stats.modules / totalModules) * 70)),
          modules_created: stats.modules,
        });

        const module = await generateWeekModule(
          supabase,
          aiConfig,
          course,
          week,
          institutionId,
          actorUserId,
        );
        if (module) stats.modules++;
      }

      // Generated/re-generated content must return the course to a human review
      // stage. Teaching-readiness separately requires explicit approval and all
      // module publication/quality gates.
      await supabase
        .from("courses")
        .update({ curriculum_status: "faculty_review" })
        .eq("id", course.id)
        .eq("institution_id", institutionId);
    }

    await updateProgress(supabase, progressId, {
      current_stage: "Draft generation complete — faculty review required",
      progress: 100,
      courses_created: stats.courses,
      modules_created: stats.modules,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "generation failed";
    console.error("controlled generation failed:", message);
    await updateProgress(supabase, progressId, {
      current_stage: `Error: ${message}`,
      progress: -1,
    });
  }
}

async function generateCourse(
  supabase: any,
  aiConfig: AiConfig,
  faculty: any,
  institutionId: string,
  actorUserId: string,
  index: number,
) {
  const courseTypes = ["Foundations", "Advanced Studies", "Applied Practice", "Research Methods"];
  const prompt = `You are an expert university curriculum designer creating a DRAFT course shell for faculty review.

Institutional faculty: ${faculty.name}
Course focus: ${courseTypes[index % courseTypes.length]}
Faculty description: ${faculty.description || faculty.name}
Key Scripture: ${faculty.key_scripture || "Proverbs 1:7"}

Return ONLY valid JSON with: title, description, level, prerequisites, learning_outcomes (5 measurable outcomes), key_texts, and tags.
Do not claim accreditation, awarded/transferable credit, regulatory approval, or independent source verification.`;

  try {
    const courseData = await callAiJson(aiConfig, prompt, 2200, 0.7);
    const { data: course, error } = await supabase
      .from("courses")
      .insert({
        institution_id: institutionId,
        title: courseData.title,
        description: courseData.description,
        faculty: faculty.name,
        faculty_id: faculty.id,
        level: courseData.level || "Intermediate",
        duration: "8 weeks",
        credit_hours: 3,
        estimated_duration_hours: 72,
        learning_outcomes: courseData.learning_outcomes || defaultCourseOutcomes(courseData.title, faculty.name),
        learning_progression: buildLearningProgression(courseData.title),
        tags: courseData.tags || [],
        xr_enabled: false,
        scholarship_eligible: true,
        curriculum_status: "pending_authorship",
        faculty_author_id: actorUserId,
      })
      .select()
      .single();
    if (error) throw error;
    return course;
  } catch (error) {
    console.error("course draft generation failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function generateWeekModule(
  supabase: any,
  aiConfig: AiConfig,
  course: any,
  week: number,
  institutionId: string,
  actorUserId: string,
) {
  const weekTheme = WEEK_THEMES[week - 1];

  // Do not create duplicate week rows. Existing content should be revised via
  // the controlled module-authoring/expansion path so version history remains clear.
  const { data: existing } = await supabase
    .from("course_modules")
    .select("id")
    .eq("course_id", course.id)
    .eq("order_index", week)
    .limit(1)
    .maybeSingle();
  if (existing) return null;

  const prompt = `Create DRAFT university-level Week ${week} content for "${course.title}".
Theme: ${weekTheme.theme}
Focus: ${weekTheme.focus}
Course description: ${course.description}

Return ONLY valid JSON with keys: title, content_md, duration_minutes, learning_objectives, reflective_prompt.
The Markdown body must contain orientation, measurable objectives, substantive sections, a worked example/case, discussion questions, key terms, synthesis, and a further-reading section.
Use Scripture exegetically where relevant. Never invent quotations or bibliographic details. Mark any unverified external quotation or source assertion as [VERIFY SOURCE].
Do not include monetary/reward-token incentives, accreditation claims, transferable-credit claims, or claims that the content has been independently reviewed.
This output is a faculty-review draft, not published curriculum.`;

  try {
    const moduleData = await callAiJson(aiConfig, prompt, 8000, 0.6);
    const contentMd = typeof moduleData.content_md === "string" ? moduleData.content_md.trim() : "";
    if (contentMd.length < 2000) throw new Error("generated module draft too short");

    const standards = buildModuleStandards(course, week, weekTheme);
    const promptHash = await sha256Hex(prompt);
    const now = new Date().toISOString();

    const { data: module, error } = await supabase
      .from("course_modules")
      .insert({
        institution_id: institutionId,
        course_id: course.id,
        title: moduleData.title || `Week ${week}: ${weekTheme.theme}`,
        content_md: contentMd,
        content_char_count: contentMd.length,
        order_index: week,
        duration_minutes: moduleData.duration_minutes || 75,
        learning_objectives: Array.isArray(moduleData.learning_objectives)
          ? moduleData.learning_objectives
          : standards.learning_objectives,
        reflective_prompt: moduleData.reflective_prompt || standards.reflective_prompt,
        formative_checkpoints: standards.formative_checkpoints,
        module_references: standards.module_references,
        content: {
          learning_objectives: Array.isArray(moduleData.learning_objectives)
            ? moduleData.learning_objectives
            : standards.learning_objectives,
          summary: `Week ${week} develops ${weekTheme.focus} with accountable practice and reflection.`,
          syllabus_unit: {
            week,
            theme: weekTheme.theme,
            assessment: "Assessment evidence is created only through the controlled assessment-authority workflow.",
          },
        },
        ai_generated: true,
        content_source: "ai_generated",
        content_model: aiConfig.model,
        content_prompt_hash: promptHash,
        content_generated_by: actorUserId,
        content_generated_at: now,
        content_changed_by: actorUserId,
        content_review_state: "draft",
        quality_verified: false,
      })
      .select()
      .single();

    if (error) throw error;
    return module;
  } catch (error) {
    console.error(`week ${week} module draft failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function callAiJson(aiConfig: AiConfig, prompt: string, maxTokens: number, temperature: number) {
  const response = await fetch(aiConfig.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiConfig.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider ${aiConfig.provider} failed (${response.status}): ${body.slice(0, 180)}`);
  }
  const data = await response.json();
  let content = String(data?.choices?.[0]?.message?.content ?? "").trim();
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(content);
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function updateProgress(supabase: any, progressId: string, updates: any) {
  await supabase
    .from("generation_progress")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", progressId);
}
