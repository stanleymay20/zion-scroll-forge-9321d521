import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-audit-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Severity = "info" | "warning" | "critical";
type Finding = {
  check_key: string;
  severity: Severity;
  entity_type: string;
  entity_id: string | null;
  title: string;
  details_json?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const AUDIT_SECRET = Deno.env.get("AUDIT_TRIGGER_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function upsertAlert(admin: any, finding: Finding) {
  const query = admin.from("academic_integrity_alerts")
    .select("id,detection_count")
    .eq("check_key", finding.check_key)
    .eq("entity_type", finding.entity_type)
    .in("status", ["open", "acknowledged"])
    .limit(1);
  const { data: existing } = finding.entity_id
    ? await query.eq("entity_id", finding.entity_id).maybeSingle()
    : await query.is("entity_id", null).maybeSingle();

  if (existing) {
    const { error } = await admin.from("academic_integrity_alerts").update({
      severity: finding.severity,
      title: finding.title,
      details_json: finding.details_json ?? {},
      last_detected_at: new Date().toISOString(),
      detection_count: Number(existing.detection_count ?? 1) + 1,
    }).eq("id", existing.id);
    if (error) throw error;
    return "updated" as const;
  }

  const { error } = await admin.from("academic_integrity_alerts").insert({
    check_key: finding.check_key,
    severity: finding.severity,
    entity_type: finding.entity_type,
    entity_id: finding.entity_id,
    title: finding.title,
    details_json: finding.details_json ?? {},
  });
  if (error) throw error;
  return "inserted" as const;
}

async function acceptedStudentsWithoutProgram(admin: any): Promise<Finding[]> {
  const { data, error } = await admin.from("students")
    .select("id,user_id,full_name")
    .eq("application_status", "accepted")
    .is("degree_program_id", null);
  if (error) throw error;
  return (data ?? []).map((student: any) => ({
    check_key: "accepted_student_without_program",
    severity: "critical" as const,
    entity_type: "student",
    entity_id: student.id,
    title: `Accepted student ${student.full_name ?? student.id} has no degree programme assigned`,
    details_json: { user_id: student.user_id },
  }));
}

async function emptyActivePrograms(admin: any): Promise<Finding[]> {
  const { data: programs, error } = await admin.from("degree_programs")
    .select("id,title,faculty")
    .eq("is_active", true);
  if (error) throw error;
  const findings: Finding[] = [];
  for (const program of programs ?? []) {
    const { count, error: countError } = await admin.from("degree_program_courses")
      .select("id", { count: "exact", head: true })
      .eq("degree_program_id", program.id);
    if (countError) throw countError;
    if ((count ?? 0) === 0) findings.push({
      check_key: "empty_active_degree_program",
      severity: "critical",
      entity_type: "degree_program",
      entity_id: program.id,
      title: `Active programme ${program.title} has no mapped courses`,
      details_json: { faculty: program.faculty },
    });
  }
  return findings;
}

async function coursesWithoutAcademicOwnership(admin: any): Promise<Finding[]> {
  const { data: courses, error } = await admin.from("courses").select("id,title,faculty,faculty_id");
  if (error) throw error;
  const findings: Finding[] = [];
  for (const course of courses ?? []) {
    if (!course.faculty && !course.faculty_id) findings.push({
      check_key: "course_without_faculty",
      severity: "warning",
      entity_type: "course",
      entity_id: course.id,
      title: `Course ${course.title} has no faculty ownership`,
    });
    const { count, error: countError } = await admin.from("course_modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course.id);
    if (countError) throw countError;
    if ((count ?? 0) === 0) findings.push({
      check_key: "course_without_modules",
      severity: "warning",
      entity_type: "course",
      entity_id: course.id,
      title: `Course ${course.title} has no authored modules`,
    });
  }
  return findings;
}

async function certificatesWithoutVerifiedCompletion(admin: any): Promise<Finding[]> {
  const { data: certificates, error } = await admin.from("course_certificates").select("id,user_id,course_id");
  if (error) throw error;
  const findings: Finding[] = [];
  for (const cert of certificates ?? []) {
    const { data: modules, error: moduleError } = await admin.from("course_modules").select("id").eq("course_id", cert.course_id);
    if (moduleError) throw moduleError;
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    if (moduleIds.length === 0) {
      findings.push({
        check_key: "certificate_without_verified_completion",
        severity: "critical",
        entity_type: "course_certificate",
        entity_id: cert.id,
        title: "Course certificate exists for a course with no authored modules",
        details_json: { user_id: cert.user_id, course_id: cert.course_id },
      });
      continue;
    }
    const { data: progress, error: progressError } = await admin.from("student_module_progress")
      .select("module_id,status,mastery_level")
      .eq("user_id", cert.user_id)
      .in("module_id", moduleIds);
    if (progressError) throw progressError;
    const verified = new Set((progress ?? [])
      .filter((row: any) => row.status === "completed" && Number(row.mastery_level ?? 0) >= 70)
      .map((row: any) => row.module_id));
    if (verified.size !== moduleIds.length) findings.push({
      check_key: "certificate_without_verified_completion",
      severity: "critical",
      entity_type: "course_certificate",
      entity_id: cert.id,
      title: "Course certificate lacks verified mastery for every module",
      details_json: { user_id: cert.user_id, course_id: cert.course_id, verified_modules: verified.size, total_modules: moduleIds.length },
    });
  }
  return findings;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!AUDIT_SECRET) return json({ error: "Audit trigger secret is not configured" }, 503);
  if (req.headers.get("x-audit-secret") !== AUDIT_SECRET) return json({ error: "Unauthorized" }, 401);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Audit backend is not configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const findings = (await Promise.all([
      acceptedStudentsWithoutProgram(admin),
      emptyActivePrograms(admin),
      coursesWithoutAcademicOwnership(admin),
      certificatesWithoutVerifiedCompletion(admin),
    ])).flat();
    let inserted = 0;
    let updated = 0;
    for (const finding of findings) {
      const outcome = await upsertAlert(admin, finding);
      if (outcome === "inserted") inserted++; else updated++;
    }
    return json({
      ok: true,
      policy_version: "academic-integrity-audit.v2",
      findings: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      inserted,
      updated,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("academic integrity audit failed", error);
    return json({ error: "Academic integrity audit failed" }, 500);
  }
});
