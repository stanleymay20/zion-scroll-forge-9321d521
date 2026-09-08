// ScrollUniversity — Controlled Admissions Decision Engine
// Admin/superadmin only. Acceptance stops at the canonical ADMITTED state.
// Orientation, matriculation, learning profile, registration, and activation are
// separate governed lifecycle stages and are never bypassed by admissions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    const [{ data: isAdmin }, { data: isSuperadmin }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "superadmin" }),
    ]);
    if (!isAdmin && !isSuperadmin) return json({ error: "admin or superadmin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const studentId: string | undefined = body.student_id;
    const action: "accept" | "waitlist" | "reject" = body.action ?? "accept";
    const reason: string = body.reason ?? "";
    if (!studentId) return json({ error: "student_id required" }, 400);

    const { data: student, error: sErr } = await supabase.from("students").select("id, user_id, full_name, email, application_status, degree_program_id, student_id_code, institutional_email").eq("id", studentId).maybeSingle();
    if (sErr || !student) return json({ error: "student not found" }, 404);

    if (action === "waitlist") {
      await supabase.from("students").update({ application_status: "waitlisted", waitlisted_at: new Date().toISOString(), rejection_reason: null }).eq("id", studentId);
      const { data: pos } = await supabase.rpc("waitlist_position", { p_student_id: studentId });
      await supabase.from("notifications").insert({ user_id: student.user_id, title: "📋 You've been waitlisted", body: `Your ScrollUniversity application is on the waitlist. ${reason || "We'll notify you as seats free up."}`, type: "admission" });
      return json({ ok: true, action, waitlist_position: pos });
    }

    if (action === "reject") {
      await supabase.from("students").update({ application_status: "rejected", rejection_reason: reason || "Application not advanced at this time." }).eq("id", studentId);
      await supabase.from("notifications").insert({ user_id: student.user_id, title: "Application Decision", body: reason || "Thank you for applying. We're unable to advance your application at this time.", type: "admission" });
      return json({ ok: true, action });
    }

    if (student.application_status === "accepted") return json({ ok: true, already_admitted: true, student_id_code: student.student_id_code, institutional_email: student.institutional_email });

    const { data: cohort } = await supabase.rpc("beta_cohort_status");
    if (cohort && cohort.is_open === false) {
      await supabase.from("students").update({ application_status: "waitlisted", waitlisted_at: new Date().toISOString() }).eq("id", studentId);
      const { data: pos } = await supabase.rpc("waitlist_position", { p_student_id: studentId });
      await supabase.from("notifications").insert({ user_id: student.user_id, title: "📋 Cohort full — added to waitlist", body: `${cohort.cohort_label} is at capacity. You're #${pos} on the waitlist.`, type: "admission" });
      return json({ ok: false, auto_waitlisted: true, waitlist_position: pos, cohort });
    }

    const cohortNumber = (cohort?.admitted ?? 0) + 1;
    const { data: identity, error: idErr } = await supabase.rpc("generate_student_identity", { p_student_id: studentId });
    if (idErr) return json({ error: `identity generation failed: ${idErr.message}` }, 500);

    const { error: upErr } = await supabase.from("students").update({ application_status: "accepted", cohort_number: cohortNumber, rejection_reason: null }).eq("id", studentId);
    if (upErr) throw upErr;

    const { error: transitionError } = await supabase.rpc("transition_student_status", { p_user_id: student.user_id, p_new_status: "admitted", p_reason: `admissions accepted; cohort ${cohortNumber}` });
    if (transitionError) {
      await supabase.from("students").update({ application_status: "submitted" }).eq("id", studentId);
      return json({ error: `admission lifecycle transition failed: ${transitionError.message}` }, 500);
    }

    try { await supabase.functions.invoke("generate-admission-letter", { body: { studentId: student.id } }); } catch (e) { console.error("admission letter failed", e); }
    await supabase.from("notifications").insert({
      user_id: student.user_id,
      title: "🎓 You've been admitted to ScrollUniversity",
      body: `Welcome to ${cohort?.cohort_label ?? "the admitted cohort"}.\n\nStudent ID: ${(identity as any)?.student_id_code}\nInstitutional Email: ${(identity as any)?.institutional_email}\n\nYour next required stage is Orientation. Academic registration and course access follow only after the governed onboarding milestones are complete.`,
      type: "admission",
    });

    return json({ ok: true, action: "accept", lifecycle_status: "admitted", next_route: "/orientation", student_id: studentId, cohort_number: cohortNumber, ...(identity as object) });
  } catch (e: any) {
    console.error("cohort-onboard error", e);
    return json({ error: e.message ?? "internal error" }, 500);
  }
});
