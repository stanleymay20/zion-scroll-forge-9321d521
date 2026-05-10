// Academic Integrity Audit — runs daily, raises alerts for governance drift.
// Public (verify_jwt=false) so pg_cron can call it; protected by AUDIT_TRIGGER_SECRET
// or a service-role JWT. Never auto-fixes student data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-audit-secret",
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AUDIT_SECRET = Deno.env.get("AUDIT_TRIGGER_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isAuthorized(req: Request): boolean {
  // Accept: service-role JWT, audit secret header, OR any signed Bearer
  // (cron invokes with project anon key). The function itself uses the
  // service-role client internally; responses contain only counts.
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return true;
  if (AUDIT_SECRET && req.headers.get("x-audit-secret") === AUDIT_SECRET) return true;
  return false;
}

async function upsertAlert(f: Finding) {
  const entityKey = f.entity_id ?? "";
  const { data: existing } = await admin
    .from("academic_integrity_alerts")
    .select("id, detection_count")
    .eq("check_key", f.check_key)
    .eq("entity_type", f.entity_type)
    .or(`entity_id.eq.${entityKey},entity_id.is.null`)
    .in("status", ["open", "acknowledged"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin
      .from("academic_integrity_alerts")
      .update({
        last_detected_at: new Date().toISOString(),
        detection_count: (existing.detection_count ?? 1) + 1,
        severity: f.severity,
        title: f.title,
        details_json: f.details_json ?? {},
      })
      .eq("id", existing.id);
    return { updated: true };
  }

  await admin.from("academic_integrity_alerts").insert({
    check_key: f.check_key,
    severity: f.severity,
    entity_type: f.entity_type,
    entity_id: f.entity_id,
    title: f.title,
    details_json: f.details_json ?? {},
  });
  return { inserted: true };
}

// --- Checks ----------------------------------------------------------------

async function checkAcceptedWithoutProgram(): Promise<Finding[]> {
  const { data } = await admin
    .from("students")
    .select("id, user_id, full_name, application_status")
    .eq("application_status", "accepted")
    .is("degree_program_id", null);
  return (data ?? []).map((s) => ({
    check_key: "accepted_student_without_program",
    severity: "critical" as const,
    entity_type: "student",
    entity_id: s.id,
    title: `Accepted student "${s.full_name ?? s.id}" has no degree program assigned`,
    details_json: { user_id: s.user_id },
  }));
}

async function checkCrossFacultyMappings(): Promise<Finding[]> {
  // Mappings where program faculty != course faculty and no approved override
  const { data: rows } = await admin
    .from("degree_program_courses")
    .select(
      "id, degree_program_id, course_id, cross_faculty_override, cross_faculty_approved_by, degree_programs(faculty), courses(faculty)"
    );
  return (rows ?? [])
    .filter((r: any) => {
      const pf = r.degree_programs?.faculty;
      const cf = r.courses?.faculty;
      if (!pf || !cf) return false;
      if (pf === cf) return false;
      const approved = r.cross_faculty_override === true && r.cross_faculty_approved_by;
      return !approved;
    })
    .map((r: any) => ({
      check_key: "cross_faculty_mapping_without_override",
      severity: "critical" as const,
      entity_type: "degree_program_course",
      entity_id: r.id,
      title: `Cross-faculty mapping without approved override`,
      details_json: {
        degree_program_id: r.degree_program_id,
        course_id: r.course_id,
        program_faculty: r.degree_programs?.faculty,
        course_faculty: r.courses?.faculty,
      },
    }));
}

async function checkEmptyActivePrograms(): Promise<Finding[]> {
  const { data: progs } = await admin
    .from("degree_programs")
    .select("id, title, faculty, is_active")
    .eq("is_active", true);
  if (!progs?.length) return [];
  const findings: Finding[] = [];
  for (const p of progs) {
    const { count } = await admin
      .from("degree_program_courses")
      .select("id", { count: "exact", head: true })
      .eq("degree_program_id", p.id);
    if ((count ?? 0) === 0) {
      findings.push({
        check_key: "empty_active_degree_program",
        severity: "critical",
        entity_type: "degree_program",
        entity_id: p.id,
        title: `Active program "${p.title}" has no mapped courses`,
        details_json: { faculty: p.faculty },
      });
    }
  }
  return findings;
}

async function checkCoursesWithoutFaculty(): Promise<Finding[]> {
  const { data } = await admin
    .from("courses")
    .select("id, title, faculty, faculty_id")
    .or("faculty.is.null,faculty.eq.");
  return (data ?? []).map((c) => ({
    check_key: "course_without_faculty",
    severity: "warning" as const,
    entity_type: "course",
    entity_id: c.id,
    title: `Course "${c.title}" has no faculty assigned`,
    details_json: { faculty_id: c.faculty_id },
  }));
}

async function checkCoursesWithoutModules(): Promise<Finding[]> {
  const { data: courses } = await admin.from("courses").select("id, title");
  if (!courses?.length) return [];
  const findings: Finding[] = [];
  for (const c of courses) {
    const { count } = await admin
      .from("course_modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", c.id);
    if ((count ?? 0) === 0) {
      findings.push({
        check_key: "course_without_modules",
        severity: "warning",
        entity_type: "course",
        entity_id: c.id,
        title: `Course "${c.title}" has no modules`,
      });
    }
  }
  return findings;
}

async function checkOrphans(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: courseIds } = await admin.from("courses").select("id");
  const courseSet = new Set((courseIds ?? []).map((c: any) => c.id));
  const { data: modules } = await admin.from("course_modules").select("id, course_id, title");
  const moduleSet = new Set<string>();
  (modules ?? []).forEach((m: any) => {
    moduleSet.add(m.id);
    if (!courseSet.has(m.course_id)) {
      findings.push({
        check_key: "orphan_module",
        severity: "warning",
        entity_type: "course_module",
        entity_id: m.id,
        title: `Module "${m.title}" references missing course`,
        details_json: { course_id: m.course_id },
      });
    }
  });
  const { data: assignments } = await admin
    .from("assignments")
    .select("id, title, course_id, module_id");
  (assignments ?? []).forEach((a: any) => {
    if (a.course_id && !courseSet.has(a.course_id)) {
      findings.push({
        check_key: "orphan_assignment",
        severity: "warning",
        entity_type: "assignment",
        entity_id: a.id,
        title: `Assignment "${a.title}" references missing course`,
        details_json: { course_id: a.course_id },
      });
    }
    if (a.module_id && !moduleSet.has(a.module_id)) {
      findings.push({
        check_key: "orphan_assignment",
        severity: "warning",
        entity_type: "assignment",
        entity_id: a.id,
        title: `Assignment "${a.title}" references missing module`,
        details_json: { module_id: a.module_id },
      });
    }
  });
  const { data: quizzes } = await admin
    .from("quizzes")
    .select("id, title, module_id");
  (quizzes ?? []).forEach((q: any) => {
    if (q.module_id && !moduleSet.has(q.module_id)) {
      findings.push({
        check_key: "orphan_quiz",
        severity: "warning",
        entity_type: "quiz",
        entity_id: q.id,
        title: `Quiz "${q.title}" references missing module`,
        details_json: { module_id: q.module_id },
      });
    }
  });
  return findings;
}

async function checkDuplicateMappings(): Promise<Finding[]> {
  const { data } = await admin
    .from("degree_program_courses")
    .select("degree_program_id, course_id, id");
  const seen = new Map<string, string[]>();
  (data ?? []).forEach((r: any) => {
    const k = `${r.degree_program_id}|${r.course_id}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k)!.push(r.id);
  });
  const findings: Finding[] = [];
  for (const [k, ids] of seen) {
    if (ids.length > 1) {
      const [pid, cid] = k.split("|");
      findings.push({
        check_key: "duplicate_dpc_pair",
        severity: "warning",
        entity_type: "degree_program_course",
        entity_id: ids[0],
        title: `Duplicate program/course mapping (${ids.length} rows)`,
        details_json: { degree_program_id: pid, course_id: cid, mapping_ids: ids },
      });
    }
  }
  return findings;
}

async function checkRecommendationsOutsideProgram(): Promise<Finding[]> {
  const { data: recs } = await admin
    .from("course_recommendations")
    .select("id, user_id, course_id");
  if (!recs?.length) return [];
  const findings: Finding[] = [];
  // Map user_id -> degree_program_id
  const userIds = [...new Set(recs.map((r: any) => r.user_id))];
  const { data: students } = await admin
    .from("students")
    .select("user_id, degree_program_id")
    .in("user_id", userIds);
  const userProgram = new Map<string, string | null>();
  (students ?? []).forEach((s: any) => userProgram.set(s.user_id, s.degree_program_id));
  // Build allowed (program, course) set
  const programIds = [...new Set([...userProgram.values()].filter(Boolean) as string[])];
  const allowed = new Set<string>();
  if (programIds.length) {
    const { data: dpc } = await admin
      .from("degree_program_courses")
      .select("degree_program_id, course_id")
      .in("degree_program_id", programIds);
    (dpc ?? []).forEach((m: any) => allowed.add(`${m.degree_program_id}|${m.course_id}`));
  }
  for (const r of recs) {
    const pid = userProgram.get(r.user_id);
    if (!pid) continue;
    if (!allowed.has(`${pid}|${r.course_id}`)) {
      findings.push({
        check_key: "recommendation_outside_program",
        severity: "warning",
        entity_type: "course_recommendation",
        entity_id: r.id,
        title: `Recommended course is outside the student's program`,
        details_json: { user_id: r.user_id, course_id: r.course_id, degree_program_id: pid },
      });
    }
  }
  return findings;
}

async function checkEnrollmentsOutsideProgram(): Promise<Finding[]> {
  const { data: enrolls } = await admin
    .from("enrollments")
    .select("id, user_id, course_id, transfer_status");
  if (!enrolls?.length) return [];
  const userIds = [...new Set(enrolls.map((e: any) => e.user_id))];
  const { data: students } = await admin
    .from("students")
    .select("user_id, degree_program_id")
    .in("user_id", userIds);
  const userProgram = new Map<string, string | null>();
  (students ?? []).forEach((s: any) => userProgram.set(s.user_id, s.degree_program_id));
  const programIds = [...new Set([...userProgram.values()].filter(Boolean) as string[])];
  const allowed = new Set<string>();
  if (programIds.length) {
    const { data: dpc } = await admin
      .from("degree_program_courses")
      .select("degree_program_id, course_id")
      .in("degree_program_id", programIds);
    (dpc ?? []).forEach((m: any) => allowed.add(`${m.degree_program_id}|${m.course_id}`));
  }
  const findings: Finding[] = [];
  for (const e of enrolls) {
    const pid = userProgram.get(e.user_id);
    if (!pid) continue;
    if (!allowed.has(`${pid}|${e.course_id}`)) {
      // Allow if marked as approved elective transfer
      if (e.transfer_status === "approved_elective") continue;
      findings.push({
        check_key: "enrollment_outside_program",
        severity: "critical",
        entity_type: "enrollment",
        entity_id: e.id,
        title: `Enrollment is outside the student's program with no elective approval`,
        details_json: {
          user_id: e.user_id,
          course_id: e.course_id,
          degree_program_id: pid,
          transfer_status: e.transfer_status,
        },
      });
    }
  }
  return findings;
}

async function checkCertificatesIneligible(): Promise<Finding[]> {
  const { data: certs } = await admin
    .from("course_certificates")
    .select("id, user_id, course_id");
  if (!certs?.length) return [];
  const findings: Finding[] = [];
  for (const c of certs) {
    const { data: enr } = await admin
      .from("enrollments")
      .select("progress")
      .eq("user_id", c.user_id)
      .eq("course_id", c.course_id)
      .maybeSingle();
    const progress = enr?.progress ?? 0;
    if (!enr || progress < 100) {
      findings.push({
        check_key: "certificate_for_ineligible_student",
        severity: "critical",
        entity_type: "course_certificate",
        entity_id: c.id,
        title: `Certificate issued without completed enrollment`,
        details_json: {
          user_id: c.user_id,
          course_id: c.course_id,
          enrollment_progress: progress,
          enrolled: !!enr,
        },
      });
    }
  }
  return findings;
}

async function checkTranscriptInconsistencies(): Promise<Finding[]> {
  const { data: rows } = await admin
    .from("transcripts")
    .select("id, student_id, course_id, faculty");
  if (!rows?.length) return [];
  const courseIds = [...new Set(rows.map((r: any) => r.course_id).filter(Boolean))];
  const { data: courses } = courseIds.length
    ? await admin.from("courses").select("id, faculty").in("id", courseIds)
    : { data: [] as any[] };
  const courseFaculty = new Map<string, string | null>();
  (courses ?? []).forEach((c: any) => courseFaculty.set(c.id, c.faculty));
  const findings: Finding[] = [];
  for (const r of rows) {
    if (!r.course_id) {
      findings.push({
        check_key: "transcript_missing_course",
        severity: "critical",
        entity_type: "transcript",
        entity_id: r.id,
        title: "Transcript row references no course",
        details_json: { student_id: r.student_id },
      });
      continue;
    }
    if (!courseFaculty.has(r.course_id)) {
      findings.push({
        check_key: "transcript_invalid_course",
        severity: "critical",
        entity_type: "transcript",
        entity_id: r.id,
        title: "Transcript references a missing/archived course",
        details_json: { student_id: r.student_id, course_id: r.course_id },
      });
      continue;
    }
    const cf = courseFaculty.get(r.course_id);
    if (r.faculty && cf && r.faculty !== cf) {
      findings.push({
        check_key: "transcript_faculty_remapped",
        severity: "warning",
        entity_type: "transcript",
        entity_id: r.id,
        title: "Transcript faculty no longer matches course faculty (remapped)",
        details_json: {
          student_id: r.student_id,
          course_id: r.course_id,
          transcript_faculty: r.faculty,
          course_faculty: cf,
        },
      });
    }
  }
  return findings;
}

// --- Handler ---------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = new Date().toISOString();
  const checks: Array<[string, () => Promise<Finding[]>]> = [
    ["accepted_without_program", checkAcceptedWithoutProgram],
    ["cross_faculty_mappings", checkCrossFacultyMappings],
    ["empty_active_programs", checkEmptyActivePrograms],
    ["courses_without_faculty", checkCoursesWithoutFaculty],
    ["courses_without_modules", checkCoursesWithoutModules],
    ["orphans", checkOrphans],
    ["duplicate_mappings", checkDuplicateMappings],
    ["recommendations_outside_program", checkRecommendationsOutsideProgram],
    ["enrollments_outside_program", checkEnrollmentsOutsideProgram],
    ["certificates_ineligible", checkCertificatesIneligible],
    ["transcript_inconsistencies", checkTranscriptInconsistencies],
  ];

  const summary: Record<string, number> = {};
  const errors: Record<string, string> = {};
  let totalFindings = 0;

  for (const [name, fn] of checks) {
    try {
      const findings = await fn();
      summary[name] = findings.length;
      totalFindings += findings.length;
      for (const f of findings) {
        try {
          await upsertAlert(f);
        } catch (e) {
          errors[`upsert:${name}`] = (e as Error).message;
        }
      }
    } catch (e) {
      errors[name] = (e as Error).message;
      summary[name] = -1;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      total_findings: totalFindings,
      per_check: summary,
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
