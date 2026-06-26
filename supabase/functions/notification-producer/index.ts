// Notification Producer — emits academic events that aren't covered by row triggers.
// Triggered on a cron schedule. Uses deterministic event_key per (user_id, event_type, scope)
// to guarantee at-most-once delivery.
//
// Emits:
//   registration_opened        — when a registration_window flips to open
//   registration_closing_soon  — 48h before window closes
//   attendance_warning         — student attendance drops below 75% in active section
//   degree_audit_updated       — degree_audit_log row inserted in last cycle
//   graduation_eligibility_changed — graduation_candidates.eligible flipped
//
// Idempotency: writes to notifications with a unique event_key (per user). Re-runs no-op.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface EmitArgs {
  user_id: string;
  event_type: string;
  scope: string; // disambiguates within an event_type, e.g. window_id, term_id, section_id
  title: string;
  message: string;
  link?: string;
}

async function emit({ user_id, event_type, scope, title, message, link }: EmitArgs): Promise<boolean> {
  const event_key = `${event_type}:${scope}:${user_id}`;
  // Skip if we already emitted this exact event
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", user_id)
    .eq("event_key", event_key)
    .maybeSingle();
  if (existing) return false;

  const { error } = await supabase.from("notifications").insert({
    user_id,
    type: event_type,
    title,
    message,
    link: link ?? null,
    event_key,
    is_read: false,
  });
  if (error) {
    console.error(`[notification-producer] insert failed`, error);
    return false;
  }
  return true;
}

async function emitRegistrationOpened(): Promise<number> {
  const { data: openWindows } = await supabase
    .from("registration_windows")
    .select("id, term_id, opens_at, closes_at")
    .lte("opens_at", new Date().toISOString())
    .gte("closes_at", new Date().toISOString());
  if (!openWindows?.length) return 0;

  let count = 0;
  for (const w of openWindows) {
    const { data: students } = await supabase
      .from("students")
      .select("user_id")
      .not("user_id", "is", null)
      .eq("status", "enrolled");
    for (const s of students ?? []) {
      const ok = await emit({
        user_id: s.user_id as string,
        event_type: "registration_opened",
        scope: w.id,
        title: "Registration is open",
        message: `Course registration for the current term is now open. Closes ${new Date(w.closes_at).toLocaleDateString()}.`,
        link: "/student/courses",
      });
      if (ok) count++;
    }
  }
  return count;
}

async function emitRegistrationClosingSoon(): Promise<number> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
  const { data: closing } = await supabase
    .from("registration_windows")
    .select("id, closes_at")
    .lte("opens_at", now.toISOString())
    .gte("closes_at", now.toISOString())
    .lte("closes_at", in48h.toISOString());
  if (!closing?.length) return 0;

  let count = 0;
  for (const w of closing) {
    const { data: students } = await supabase
      .from("students")
      .select("user_id")
      .not("user_id", "is", null)
      .eq("status", "enrolled");
    for (const s of students ?? []) {
      const ok = await emit({
        user_id: s.user_id as string,
        event_type: "registration_closing_soon",
        scope: w.id,
        title: "Registration closes soon",
        message: `Registration closes ${new Date(w.closes_at).toLocaleString()}. Finalize your schedule.`,
        link: "/student/courses",
      });
      if (ok) count++;
    }
  }
  return count;
}

async function emitAttendanceWarning(): Promise<number> {
  // Aggregate attendance per (student, section). Warn at <75% across ≥3 sessions.
  const { data: rows } = await supabase.rpc("section_attendance_summary").select("*").maybeSingle().then(
    async () => {
      // Fallback: raw aggregate
      const { data } = await supabase
        .from("section_attendance_records")
        .select("section_id, student_id, status");
      return { data };
    },
  );
  // Simple aggregation
  const summary = new Map<string, { user_id?: string; section_id: string; total: number; present: number }>();
  const { data: raw } = await supabase
    .from("section_attendance_records")
    .select("student_id, section_id, status");
  for (const r of raw ?? []) {
    const k = `${r.student_id}:${r.section_id}`;
    const s = summary.get(k) ?? { section_id: r.section_id as string, total: 0, present: 0 };
    s.total++;
    if (r.status === "present" || r.status === "late") s.present++;
    summary.set(k, s);
  }
  let count = 0;
  for (const [k, s] of summary) {
    if (s.total < 3) continue;
    const pct = s.present / s.total;
    if (pct >= 0.75) continue;
    const [studentId] = k.split(":");
    // Resolve user_id via students or enrollments
    const { data: stu } = await supabase
      .from("students")
      .select("user_id")
      .eq("id", studentId)
      .maybeSingle();
    if (!stu?.user_id) continue;
    const ok = await emit({
      user_id: stu.user_id,
      event_type: "attendance_warning",
      scope: s.section_id,
      title: "Attendance below 75%",
      message: `Your attendance has dropped to ${Math.round(pct * 100)}% in one of your sections.`,
      link: "/student/attendance",
    });
    if (ok) count++;
  }
  return count;
}

async function emitDegreeAuditUpdated(sinceMin = 60): Promise<number> {
  const since = new Date(Date.now() - sinceMin * 60_000).toISOString();
  const { data: rows } = await supabase
    .from("degree_audit_log")
    .select("id, student_id, created_at")
    .gte("created_at", since);
  if (!rows?.length) return 0;

  let count = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.student_id as string)) continue;
    seen.add(r.student_id as string);
    const { data: stu } = await supabase
      .from("students")
      .select("user_id")
      .eq("id", r.student_id)
      .maybeSingle();
    if (!stu?.user_id) continue;
    const ok = await emit({
      user_id: stu.user_id,
      event_type: "degree_audit_updated",
      scope: r.id as string,
      title: "Your degree audit was updated",
      message: "New progress was recorded against your degree plan.",
      link: "/student/degree-audit",
    });
    if (ok) count++;
  }
  return count;
}

async function emitGraduationEligibility(): Promise<number> {
  const { data: rows } = await supabase
    .from("graduation_candidates")
    .select("id, student_id, eligible, last_evaluated_at");
  if (!rows?.length) return 0;

  let count = 0;
  for (const r of rows) {
    if (!r.eligible) continue;
    const { data: stu } = await supabase
      .from("students")
      .select("user_id")
      .eq("id", r.student_id)
      .maybeSingle();
    if (!stu?.user_id) continue;
    const ok = await emit({
      user_id: stu.user_id,
      event_type: "graduation_eligibility_changed",
      scope: r.id as string,
      title: "You are eligible to graduate",
      message: "All requirements are met. Visit your graduation page to apply.",
      link: "/student/graduation",
    });
    if (ok) count++;
  }
  return count;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Allow either service_role calls (cron) or admin user
  const auth = req.headers.get("authorization") ?? "";
  const isService = auth.includes(SERVICE_ROLE);
  if (!isService) {
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  const start = Date.now();
  try {
    const [opened, closing, attendance, audit, grad] = await Promise.all([
      emitRegistrationOpened().catch((e) => { console.error(e); return 0; }),
      emitRegistrationClosingSoon().catch((e) => { console.error(e); return 0; }),
      emitAttendanceWarning().catch((e) => { console.error(e); return 0; }),
      emitDegreeAuditUpdated().catch((e) => { console.error(e); return 0; }),
      emitGraduationEligibility().catch((e) => { console.error(e); return 0; }),
    ]);
    return json({
      ok: true,
      ms: Date.now() - start,
      emitted: {
        registration_opened: opened,
        registration_closing_soon: closing,
        attendance_warning: attendance,
        degree_audit_updated: audit,
        graduation_eligibility_changed: grad,
      },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "internal" }, 500);
  }
});
