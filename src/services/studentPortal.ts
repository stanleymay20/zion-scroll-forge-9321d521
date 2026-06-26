import { supabase } from "@/integrations/supabase/client";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}
export { uid as currentUserId };

export async function getGpa(studentId?: string) {
  const id = studentId ?? (await uid());
  const { data, error } = await supabase.rpc("compute_student_gpa", { _student_id: id });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return row
    ? {
        gpa: Number(row.gpa ?? row.cumulative_gpa ?? 0),
        credits: Number(row.total_credit_hours ?? row.cumulative_credits_earned ?? 0),
      }
    : { gpa: 0, credits: 0 };
}

export async function getTermGpa(termId: string) {
  const id = await uid();
  const { data, error } = await supabase.rpc("compute_student_gpa", { _student_id: id, _term_id: termId });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return row ? Number(row.gpa ?? row.cumulative_gpa ?? 0) : 0;
}

export async function getMySchedule() {
  const id = await uid();
  const { data, error } = await supabase
    .from("student_schedule_v" as any)
    .select("*")
    .eq("student_user_id", id);
  if (error) throw error;
  return (data as any[]) || [];
}

export async function getMyEnrollments() {
  const id = await uid();
  const { data, error } = await supabase
    .from("section_enrollments")
    .select("*")
    .eq("student_user_id", id)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMyGrades() {
  const id = await uid();
  const { data, error } = await (supabase as any)
    .from("grade_records")
    .select("*")
    .eq("student_id", id)
    .order("finalized_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMyStanding() {
  const id = await uid();
  const { data, error } = await (supabase as any)
    .from("student_academic_standing")
    .select("*")
    .eq("student_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMyAttendance() {
  const id = await uid();
  const { data, error } = await supabase
    .from("section_attendance_records")
    .select("id, status, marked_at, session_id, section_attendance_sessions(section_id, session_date, topic)")
    .eq("student_user_id", id)
    .order("marked_at", { ascending: false });
  if (error) throw error;
  return (data as any[]) || [];
}

export async function getMyAdvisingNotes() {
  const id = await uid();
  const { data, error } = await supabase
    .from("student_advising_notes")
    .select("*")
    .eq("student_user_id", id)
    .eq("visibility", "student_visible")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMyAdvisingFlags() {
  const id = await uid();
  const { data, error } = await supabase
    .from("student_advising_flags")
    .select("*")
    .eq("student_user_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMyInterventions() {
  const id = await uid();
  const { data, error } = await supabase
    .from("outcome_intervention")
    .select("*")
    .eq("scope", "student")
    .eq("scope_id", id)
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMyOutcomeMastery() {
  const id = await uid();
  const { data, error } = await supabase
    .from("student_outcome_mastery")
    .select("*")
    .eq("user_id", id);
  if (error) throw error;
  return (data as any[]) || [];
}

export async function getMyDegreeEnrollment() {
  const id = await uid();
  const { data, error } = await supabase
    .from("student_degree_enrollments")
    .select("*, degree_programs:degree_id(id, name, total_credit_hours)")
    .eq("user_id", id)
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function runDegreeAudit() {
  const id = await uid();
  const enrollment: any = await getMyDegreeEnrollment();
  if (!enrollment?.degree_id) return null;
  const { data, error } = await supabase.rpc("run_degree_audit", {
    _student_id: id,
    _program_id: enrollment.degree_id,
  });
  if (error) throw error;
  return { audit: data, program: enrollment };
}

export async function generateTranscript() {
  const id = await uid();
  const { data, error } = await supabase.rpc("generate_transcript", { _student_id: id });
  if (error) throw error;
  return data;
}

export async function evaluateGraduation() {
  const id = await uid();
  const { data, error } = await supabase.rpc("evaluate_graduation_candidate", { _student_id: id });
  if (error) throw error;
  return data;
}

export async function getCurrentTerm() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("academic_terms")
    .select("*")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}
