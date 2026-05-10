import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProgramOption { id: string; title: string; faculty: string }
interface OwnConfirmation { id: string; status: string; requested_program_id: string; student_reason: string; created_at: string; degree_programs?: { title: string; faculty: string } | null }

/**
 * Banner + program-confirmation form shown to a student whose application is
 * accepted but whose official degree program has not yet been assigned.
 */
export function StudentProgramAssignmentBanner() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [own, setOwn] = useState<OwnConfirmation | null>(null);
  const [programId, setProgramId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: student } = await supabase
      .from("students")
      .select("application_status, degree_program_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const isPending = student?.application_status === "accepted" && !student.degree_program_id;
    setPending(!!isPending);
    if (!isPending) return;

    const [{ data: progs }, { data: confs }] = await Promise.all([
      supabase.from("degree_programs").select("id, title, faculty").eq("is_active", true).order("faculty").order("title"),
      supabase
        .from("program_assignment_confirmations" as any)
        .select("id, status, requested_program_id, student_reason, created_at, degree_programs:requested_program_id(title, faculty)")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setPrograms((progs as any) ?? []);
    setOwn((confs as any) ?? null);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!programId) { toast.error("Select your intended program"); return; }
    if (reason.trim().length < 10) { toast.error("Provide a written reason of at least 10 characters"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("student_confirm_program_intent" as any, {
      p_program_id: programId,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmation submitted. Pending Registrar approval.");
    setReason(""); setProgramId("");
    await load();
  };

  if (!pending) return null;

  return (
    <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Program assignment requires your confirmation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTitle>Action required</AlertTitle>
          <AlertDescription>
            Your admission is accepted, but your official program assignment requires confirmation.
            Course enrollment, certificates, and transcripts remain paused until the Registrar approves.
          </AlertDescription>
        </Alert>

        {own?.status === "pending" ? (
          <div className="rounded-md border bg-background p-4 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">Confirmation submitted — awaiting Registrar review</span>
              <Badge variant="secondary" className="ml-auto">Pending</Badge>
            </div>
            <div className="text-muted-foreground">
              Requested: {own.degree_programs?.faculty} — {own.degree_programs?.title}
            </div>
            <div className="text-muted-foreground italic">"{own.student_reason}"</div>
            <Button variant="outline" size="sm" onClick={() => setOwn(null)}>Submit a different program</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium">Your intended degree program</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">Select degree program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.faculty} — {p.title}</option>
              ))}
            </select>
            <Textarea
              rows={3}
              placeholder="Briefly explain why this program (10+ characters). Sent to the Registrar with your confirmation."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={submit} disabled={busy}>Submit confirmation</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FlaggedStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  student_id_code: string | null;
  created_at: string;
  confirmation?: {
    id: string;
    requested_program_id: string;
    student_reason: string;
    created_at: string;
    program_title?: string | null;
    program_faculty?: string | null;
  } | null;
}

/**
 * Admin/Registrar panel listing accepted students missing a degree program
 * and providing the Registrar-only assignment form. When the student has
 * submitted a program confirmation, it is shown and pre-selected.
 */
export function PendingProgramAssignmentsAdmin() {
  const [rows, setRows] = useState<FlaggedStudent[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; title: string; faculty: string }>>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: students }, { data: progs }] = await Promise.all([
      supabase
        .from("students")
        .select("user_id, full_name, email, student_id_code, created_at")
        .eq("application_status", "accepted")
        .is("degree_program_id", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("degree_programs")
        .select("id, title, faculty")
        .eq("is_active", true)
        .order("faculty")
        .order("title"),
    ]);

    const baseRows = (students as FlaggedStudent[] | null) ?? [];
    const userIds = baseRows.map((s) => s.user_id);
    let confirmationMap: Record<string, FlaggedStudent["confirmation"]> = {};
    if (userIds.length) {
      const { data: confs } = await supabase
        .from("program_assignment_confirmations" as any)
        .select("id, user_id, requested_program_id, student_reason, created_at, degree_programs:requested_program_id(title, faculty)")
        .in("user_id", userIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      for (const c of (confs as any[]) ?? []) {
        if (!confirmationMap[c.user_id]) {
          confirmationMap[c.user_id] = {
            id: c.id,
            requested_program_id: c.requested_program_id,
            student_reason: c.student_reason,
            created_at: c.created_at,
            program_title: c.degree_programs?.title ?? null,
            program_faculty: c.degree_programs?.faculty ?? null,
          };
        }
      }
    }
    const enriched = baseRows.map((s) => ({ ...s, confirmation: confirmationMap[s.user_id] ?? null }));
    setRows(enriched);
    // Pre-select confirmed program
    const initial: Record<string, string> = {};
    for (const r of enriched) if (r.confirmation) initial[r.user_id] = r.confirmation.requested_program_id;
    setSelected((m) => ({ ...initial, ...m }));
    setPrograms((progs as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const assign = async (userId: string) => {
    const programId = selected[userId];
    const reason = (reasons[userId] ?? "").trim();
    if (!programId) { toast.error("Select a degree program"); return; }
    if (reason.length < 10) { toast.error("Provide a written reason of at least 10 characters"); return; }
    setBusy(userId);
    const { error } = await supabase.rpc("registrar_assign_program" as any, {
      p_user_id: userId,
      p_program_id: programId,
      p_reason: reason,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Program assigned. Hold released and audit log written.");
    await load();
  };

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          Registrar action required — accepted students without a degree program ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((s) => (
          <div key={s.user_id} className="rounded-lg border bg-background p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <div className="font-medium">{s.full_name ?? "—"}</div>
                <div className="text-muted-foreground">
                  {s.email} {s.student_id_code ? `• ${s.student_id_code}` : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Accepted {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>

            {s.confirmation ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Student confirmed intended program</span>
                  <Badge variant="secondary" className="ml-auto">{new Date(s.confirmation.created_at).toLocaleDateString()}</Badge>
                </div>
                <div>{s.confirmation.program_faculty} — {s.confirmation.program_title}</div>
                <div className="text-muted-foreground italic">"{s.confirmation.student_reason}"</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No student confirmation submitted yet.</div>
            )}

            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selected[s.user_id] ?? ""}
              onChange={(e) => setSelected((m) => ({ ...m, [s.user_id]: e.target.value }))}
            >
              <option value="">Select degree program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.faculty} — {p.title}</option>
              ))}
            </select>
            <Textarea
              rows={2}
              placeholder="Written Registrar justification (10+ chars) — recorded in suyas_audit_logs"
              value={reasons[s.user_id] ?? ""}
              onChange={(e) => setReasons((m) => ({ ...m, [s.user_id]: e.target.value }))}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => assign(s.user_id)} disabled={busy === s.user_id}>
                Approve & assign program
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
