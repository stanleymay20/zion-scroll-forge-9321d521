import { supabase } from "@/integrations/supabase/client";

export type ExecScopeType = "institution" | "faculty" | "department" | "program";
export type ExecRole =
  | "vice_chancellor"
  | "registrar"
  | "dean"
  | "hod"
  | "qa_officer"
  | "provost";

export interface ExecutiveScope {
  scope_type: ExecScopeType;
  scope_id: string;
  exec_role: ExecRole;
  label: string | null;
}

export interface InstitutionalKPIs {
  scope: { type: ExecScopeType; id: string };
  as_of: string;
  sections_in_scope: number;
  programs_in_scope: number;
  enrollment: { total: number; active: number };
  academic: {
    avg_gpa: number;
    probation_rate_pct: number;
    at_risk_students: number;
  };
  faculty: { avg_grade_turnaround_hours: number };
  quality: { outcome_attainment_pct: number };
  graduation: { pending_candidates: number };
}

/**
 * Returns every executive scope the current user is granted.
 * Drives the scope picker in the Executive Portal.
 */
export async function listMyExecutiveScopes(): Promise<ExecutiveScope[]> {
  const { data, error } = await supabase.rpc("list_my_executive_scopes");
  if (error) throw error;
  return (data ?? []) as ExecutiveScope[];
}

/**
 * THE single source of truth for executive dashboards.
 * Frontend MUST NOT compute KPIs from raw tables — always go through this RPC.
 * Authorization is enforced inside the function; unauthorized callers get a 42501 error.
 */
export async function getInstitutionalKPIs(
  scopeType: ExecScopeType,
  scopeId: string
): Promise<InstitutionalKPIs> {
  const { data, error } = await supabase.rpc("get_institutional_kpis", {
    p_scope_type: scopeType,
    p_scope_id: scopeId,
  });
  if (error) throw error;
  return data as unknown as InstitutionalKPIs;
}
