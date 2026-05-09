import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TransferStatus =
  | "submitted"
  | "advisor_review"
  | "faculty_review"
  | "registrar_review"
  | "approved"
  | "denied"
  | "withdrawn"
  | "archived";

export interface TransferRequest {
  id: string;
  student_user_id: string;
  from_program_id: string | null;
  to_program_id: string;
  reason: string;
  academic_justification: string | null;
  status: TransferStatus;
  effective_term: string | null;
  submitted_at: string;
  decided_at: string | null;
  to_program?: { name: string } | null;
  from_program?: { name: string } | null;
}

export interface TransferNote {
  id: string;
  request_id: string;
  reviewer_id: string;
  reviewer_role: string;
  stage: string;
  note: string;
  created_at: string;
}

const OPEN: TransferStatus[] = ["submitted", "advisor_review", "faculty_review", "registrar_review"];

export function useMyTransferRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("program_transfer_requests" as any)
      .select("*, to_program:degree_programs!program_transfer_requests_to_program_id_fkey(name:title), from_program:degree_programs!program_transfer_requests_from_program_id_fkey(name:title)")
      .eq("student_user_id", user.id)
      .order("submitted_at", { ascending: false });
    setRequests(((data as any[]) ?? []) as TransferRequest[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const openRequest = requests.find(r => OPEN.includes(r.status)) ?? null;

  const submit = useCallback(async (params: {
    to_program_id: string;
    reason: string;
    academic_justification?: string;
    effective_term?: string;
  }) => {
    const { data, error } = await supabase.rpc("submit_transfer_request" as any, {
      p_to_program_id: params.to_program_id,
      p_reason: params.reason,
      p_academic_justification: params.academic_justification ?? null,
      p_supporting_docs: [],
      p_effective_term: params.effective_term ?? null,
    });
    if (error) throw error;
    await refresh();
    return data as string;
  }, [refresh]);

  const withdraw = useCallback(async (request_id: string) => {
    const { error } = await supabase.rpc("withdraw_transfer_request" as any, { p_request_id: request_id });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { requests, openRequest, loading, refresh, submit, withdraw };
}

export function useTransferRequestsAdmin() {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("program_transfer_requests" as any)
      .select("*, to_program:degree_programs!program_transfer_requests_to_program_id_fkey(name:title), from_program:degree_programs!program_transfer_requests_from_program_id_fkey(name:title)")
      .order("submitted_at", { ascending: false });
    setRequests(((data as any[]) ?? []) as TransferRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const advance = useCallback(async (request_id: string, next: TransferStatus, note?: string) => {
    const { error } = await supabase.rpc("advance_transfer_request" as any, {
      p_request_id: request_id, p_next_status: next, p_note: note ?? null,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const decide = useCallback(async (request_id: string, decision: "approved" | "denied", rationale?: string) => {
    const { error } = await supabase.rpc("decide_transfer_request" as any, {
      p_request_id: request_id, p_decision: decision, p_credit_remap: [], p_rationale: rationale ?? null,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  return { requests, loading, refresh, advance, decide };
}

export function useTransferNotes(request_id: string | null | undefined) {
  const [notes, setNotes] = useState<TransferNote[]>([]);
  useEffect(() => {
    if (!request_id) { setNotes([]); return; }
    (async () => {
      const { data } = await supabase
        .from("transfer_review_notes" as any)
        .select("*")
        .eq("request_id", request_id)
        .order("created_at", { ascending: true });
      setNotes(((data as any[]) ?? []) as TransferNote[]);
    })();
  }, [request_id]);
  return notes;
}
