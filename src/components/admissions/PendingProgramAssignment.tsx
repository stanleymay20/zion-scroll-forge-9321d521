import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Banner shown to a student whose application is accepted but whose
 * official degree program has not yet been assigned by the Registrar.
 */
export function StudentProgramAssignmentBanner() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("students")
        .select("application_status, degree_program_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.application_status === "accepted" && !data.degree_program_id) {
        setPending(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!pending) return null;

  return (
    <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle>Program assignment pending Registrar review</AlertTitle>
      <AlertDescription>
        Your admission is accepted, but your official program assignment is pending Registrar review.
        Course enrollment, certificates, and transcripts are paused until your program is officially assigned.
      </AlertDescription>
    </Alert>
  );
}

interface FlaggedStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  student_id_code: string | null;
  created_at: string;
}

/**
 * Admin/Registrar panel listing accepted students missing a degree program
 * and providing the Registrar-only assignment form.
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
    setRows((students as FlaggedStudent[] | null) ?? []);
    setPrograms((progs as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const assign = async (userId: string) => {
    const programId = selected[userId];
    const reason = (reasons[userId] ?? "").trim();
    if (!programId) {
      toast.error("Select a degree program");
      return;
    }
    if (reason.length < 10) {
      toast.error("Provide a written reason of at least 10 characters");
      return;
    }
    setBusy(userId);
    const { error } = await supabase.rpc("registrar_assign_program" as any, {
      p_user_id: userId,
      p_program_id: programId,
      p_reason: reason,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
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
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selected[s.user_id] ?? ""}
              onChange={(e) =>
                setSelected((m) => ({ ...m, [s.user_id]: e.target.value }))
              }
            >
              <option value="">Select degree program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.faculty} — {p.title}
                </option>
              ))}
            </select>
            <Textarea
              rows={2}
              placeholder="Written justification (10+ chars) — recorded in suyas_audit_logs"
              value={reasons[s.user_id] ?? ""}
              onChange={(e) =>
                setReasons((m) => ({ ...m, [s.user_id]: e.target.value }))
              }
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => assign(s.user_id)}
                disabled={busy === s.user_id}
              >
                Assign program
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
