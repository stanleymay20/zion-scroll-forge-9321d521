import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AdvisingVisibility = 'faculty_only' | 'registrar_visible' | 'student_visible';
export type FlagType = 'at_risk' | 'needs_support' | 'academic_warning' | 'attendance' | 'outcome_gap' | 'other';
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function writeAudit(opts: {
  action: string;
  target_kind?: string;
  target_id?: string;
  section_id?: string;
  student_user_id?: string;
  payload?: Record<string, unknown>;
}) {
  const actor = await uid();
  await supabase.from('faculty_audit_log').insert([{
    actor_user_id: actor,
    action: opts.action,
    target_kind: opts.target_kind ?? undefined,
    target_id: opts.target_id ?? undefined,
    section_id: opts.section_id ?? undefined,
    student_user_id: opts.student_user_id ?? undefined,
    payload: (opts.payload ?? null) as any,
  }]);

}

// Sections assigned to current faculty
export async function listMySections() {
  const me = await uid();
  const { data, error } = await supabase
    .from('course_sections')
    .select('id, section_code, course_code, course_title, term_label, term_id, course_id, enrolled_count, seat_capacity, section_status, meets_days, meets_start, meets_end, room')
    .eq('instructor_user_id', me)
    .order('term_label', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSection(sectionId: string) {
  const { data, error } = await supabase
    .from('course_sections').select('*').eq('id', sectionId).single();
  if (error) throw error;
  return data;
}

export async function getSectionRoster(sectionId: string) {
  const { data, error } = await supabase
    .from('section_enrollments')
    .select('id, student_user_id, status, credit_hours, enrolled_at')
    .eq('section_id', sectionId)
    .eq('status', 'enrolled');
  if (error) throw error;
  return data ?? [];
}

// Grades
export async function submitCourseGrade(opts: {
  studentId: string;
  sectionId: string;
  percentage: number;
  notes?: string;
  finalize?: boolean;
}) {
  const { data, error } = await supabase.rpc('submit_course_grade', {
    _student_id: opts.studentId,
    _section_id: opts.sectionId,
    _percentage: opts.percentage,
    _notes: opts.notes ?? null,
    _finalize: opts.finalize ?? false,
  });
  if (error) throw error;
  await writeAudit({
    action: opts.finalize ? 'grade_finalized' : 'grade_submitted',
    target_kind: 'grade_record',
    target_id: data as string,
    section_id: opts.sectionId,
    student_user_id: opts.studentId,
    payload: { percentage: opts.percentage, notes: opts.notes ?? null },
  });
  return data as string;
}

// Sprint D3.4 — bulk publish wrapper for the inline gradebook UI.
// Calls the new gradebook_publish_grades RPC which is itself a thin
// wrapper around submit_course_grade (one transaction, shared
// correlation_id, ops_log batch).
export type BulkPublishMode = 'publish' | 'provisional' | 'finalize';
export type BulkPublishRow = {
  studentId: string;
  percentage: number;
  notes?: string;
  finalize?: boolean; // honored only in 'publish' mode
};
export type BulkPublishResult = {
  correlation_id: string;
  section_id: string;
  publish_mode: BulkPublishMode;
  total: number;
  published: number;
  rows: { student_id: string; grade_id: string; finalize: boolean }[];
};

export async function gradebookPublishGrades(opts: {
  sectionId: string;
  rows: BulkPublishRow[];
  mode?: BulkPublishMode;
}): Promise<BulkPublishResult> {
  const payload = opts.rows.map((r) => ({
    student_id: r.studentId,
    percentage: r.percentage,
    notes: r.notes ?? null,
    finalize: r.finalize ?? false,
  }));
  const { data, error } = await (supabase as any).rpc('gradebook_publish_grades', {
    _section_id: opts.sectionId,
    _rows: payload,
    _publish_mode: opts.mode ?? 'publish',
  });
  if (error) throw error;
  await writeAudit({
    action: 'gradebook_bulk_published',
    target_kind: 'section',
    target_id: opts.sectionId,
    section_id: opts.sectionId,
    payload: { mode: opts.mode ?? 'publish', count: opts.rows.length,
               correlation_id: (data as any)?.correlation_id ?? null },
  });
  return data as BulkPublishResult;
}

export async function getSectionGrades(sectionId: string) {
  const { data, error } = await supabase
    .from('grade_records')
    .select('id, student_id, percentage, letter_grade, grade_points, status, is_final, posted_at, finalized_at, notes, source')
    .eq('section_id', sectionId)
    .order('posted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Attendance
export async function listAttendanceSessions(sectionId: string) {
  const { data, error } = await supabase
    .from('section_attendance_sessions')
    .select('id, session_date, topic, meets_start, meets_end')
    .eq('section_id', sectionId)
    .order('session_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAttendanceSession(opts: {
  sectionId: string;
  date: string;
  topic?: string;
}) {
  const me = await uid();
  const { data, error } = await supabase
    .from('section_attendance_sessions')
    .insert({
      section_id: opts.sectionId,
      session_date: opts.date,
      topic: opts.topic ?? null,
      created_by: me,
    })
    .select('*').single();
  if (error) throw error;
  await writeAudit({
    action: 'attendance_session_created',
    target_kind: 'attendance_session',
    target_id: data.id,
    section_id: opts.sectionId,
    payload: { date: opts.date, topic: opts.topic ?? null },
  });
  return data;
}

export async function listAttendanceRecords(sessionId: string) {
  const { data, error } = await supabase
    .from('section_attendance_records')
    .select('id, student_user_id, status, notes, marked_at')
    .eq('session_id', sessionId);
  if (error) throw error;
  return data ?? [];
}

export async function markAttendance(opts: {
  sessionId: string;
  sectionId: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}) {
  const me = await uid();
  const { error } = await supabase
    .from('section_attendance_records')
    .upsert({
      session_id: opts.sessionId,
      student_user_id: opts.studentId,
      status: opts.status,
      notes: opts.notes ?? null,
      marked_by: me,
      marked_at: new Date().toISOString(),
    }, { onConflict: 'session_id,student_user_id' });
  if (error) throw error;
  await writeAudit({
    action: 'attendance_marked',
    target_kind: 'attendance_record',
    section_id: opts.sectionId,
    student_user_id: opts.studentId,
    payload: { session_id: opts.sessionId, status: opts.status },
  });
}

export async function attendanceSummary(sectionId: string) {
  const { data, error } = await supabase.rpc('section_attendance_summary', { _section_id: sectionId });
  if (error) throw error;
  return (data ?? []) as Array<{
    student_user_id: string;
    total_sessions: number;
    present: number; absent: number; late: number; excused: number;
    attendance_pct: number | null;
  }>;
}

// Advising
export async function addAdvisingNote(opts: {
  studentId: string;
  note: string;
  visibility: AdvisingVisibility;
  sectionId?: string;
  courseId?: string;
  programId?: string;
}) {
  const me = await uid();
  const { data, error } = await supabase
    .from('student_advising_notes')
    .insert({
      student_user_id: opts.studentId,
      faculty_user_id: me,
      note: opts.note,
      visibility: opts.visibility,
      section_id: opts.sectionId ?? null,
      course_id: opts.courseId ?? null,
      program_id: opts.programId ?? null,
    }).select('*').single();
  if (error) throw error;
  await writeAudit({
    action: 'advising_note_added',
    target_kind: 'advising_note',
    target_id: data.id,
    section_id: opts.sectionId,
    student_user_id: opts.studentId,
    payload: { visibility: opts.visibility },
  });
  return data;
}

export async function listMyAdvisingNotes() {
  const me = await uid();
  const { data, error } = await supabase
    .from('student_advising_notes').select('*')
    .eq('faculty_user_id', me).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function raiseAdvisingFlag(opts: {
  studentId: string;
  flagType: FlagType;
  severity: FlagSeverity;
  reason?: string;
  recommendedAction?: string;
  sectionId?: string;
}) {
  const me = await uid();
  const { data, error } = await supabase
    .from('student_advising_flags')
    .insert({
      student_user_id: opts.studentId,
      flagged_by: me,
      flag_type: opts.flagType,
      severity: opts.severity,
      reason: opts.reason ?? null,
      recommended_action: opts.recommendedAction ?? null,
      section_id: opts.sectionId ?? null,
    }).select('*').single();
  if (error) throw error;
  await writeAudit({
    action: 'advising_flag_raised',
    target_kind: 'advising_flag',
    target_id: data.id,
    section_id: opts.sectionId,
    student_user_id: opts.studentId,
    payload: { flag_type: opts.flagType, severity: opts.severity },
  });
  return data;
}

export async function listAdvisingFlags(status: 'open' | 'in_progress' | 'resolved' | 'dismissed' | 'all' = 'open') {
  let q = supabase.from('student_advising_flags').select('*').order('created_at', { ascending: false });
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateFlagStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'dismissed') {
  const me = await uid();
  const patch: TablesUpdate<'student_advising_flags'> = { status };
  if (status === 'resolved') { patch.resolved_by = me; patch.resolved_at = new Date().toISOString(); }
  const { error } = await supabase.from('student_advising_flags').update(patch).eq('id', id);
  if (error) throw error;
  await writeAudit({ action: 'advising_flag_updated', target_kind: 'advising_flag', target_id: id, payload: { status } });
}

// Outcome interventions
export async function listInterventions(scopeId?: string) {
  let q = supabase.from('outcome_intervention').select('*').order('opened_at', { ascending: false });
  if (scopeId) q = q.eq('scope_id', scopeId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function openIntervention(opts: {
  scope: 'student' | 'course' | 'program' | 'section';
  scopeId: string;
  finding: string;
  recommendation: string;
  baseline?: number;
  target?: number;
  notes?: string;
}) {
  const me = await uid();
  const { data, error } = await supabase
    .from('outcome_intervention')
    .insert({
      scope: opts.scope,
      scope_id: opts.scopeId,
      finding: opts.finding,
      recommendation: opts.recommendation,
      baseline_metric: opts.baseline ?? null,
      target_metric: opts.target ?? null,
      notes: opts.notes ?? null,
      opened_by: me,
      status: 'open',
    }).select('*').single();
  if (error) throw error;
  await writeAudit({ action: 'intervention_opened', target_kind: 'outcome_intervention', target_id: data.id, payload: { scope: opts.scope, scope_id: opts.scopeId } });
  return data;
}

export async function closeIntervention(id: string, currentMetric?: number, notes?: string) {
  const me = await uid();
  const { error } = await supabase
    .from('outcome_intervention')
    .update({
      status: 'closed',
      closed_by: me,
      closed_at: new Date().toISOString(),
      current_metric: currentMetric ?? null,
      notes: notes ?? null,
    }).eq('id', id);
  if (error) throw error;
  await writeAudit({ action: 'intervention_closed', target_kind: 'outcome_intervention', target_id: id, payload: { current_metric: currentMetric ?? null } });
}

// Outcome mastery
export async function courseOutcomeAttainment(courseId: string) {
  const { data, error } = await supabase.rpc('course_outcome_attainment', { _course_id: courseId });
  if (error) throw error;
  return data as unknown;
}

export async function recomputeCLO(studentId: string, courseId?: string) {
  const { data, error } = await supabase.rpc('recompute_student_clo_mastery', { _student_id: studentId, _course_id: courseId ?? null });
  if (error) throw error;
  return data as number;
}

// Profiles helper for display
export async function profilesByIds(ids: string[]) {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('profiles').select('id, full_name, email').in('id', ids);
  if (error) throw error;
  const map: Record<string, { display_name?: string | null; email?: string | null }> = {};
  for (const p of data ?? []) map[(p as any).id] = { display_name: (p as any).full_name, email: (p as any).email };
  return map;
}

