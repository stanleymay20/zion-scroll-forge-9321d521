import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useTransferRequestsAdmin, useTransferNotes, type TransferStatus } from "@/hooks/useProgramTransfer";
import { useToast } from "@/hooks/use-toast";

const NEXT: Partial<Record<TransferStatus, TransferStatus>> = {
  submitted: "advisor_review",
  advisor_review: "faculty_review",
  faculty_review: "registrar_review",
};

const LABEL: Record<string, string> = {
  submitted: "Submitted",
  advisor_review: "Advisor review",
  faculty_review: "Faculty review",
  registrar_review: "Registrar review",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
  archived: "Archived",
};

export default function TransferRequestsAdmin() {
  const { requests, loading, advance, decide } = useTransferRequestsAdmin();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = useTransferNotes(activeId);
  const active = requests.find(r => r.id === activeId) ?? null;

  const open = requests.filter(r => !["approved", "denied", "withdrawn", "archived"].includes(r.status));
  const finalized = requests.filter(r => ["approved", "denied", "withdrawn", "archived"].includes(r.status));

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); setNote(""); }
    catch (e: any) { toast({ title: "Failed", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-serif">Program Transfer Requests</h1>
        <p className="text-sm text-muted-foreground">Governed academic identity workflow — every advance and decision is audit-logged.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Open queue ({open.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!loading && open.length === 0 && <p className="text-sm text-muted-foreground">No open requests.</p>}
            {open.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={`w-full text-left rounded-md border p-3 hover:bg-muted/40 transition ${activeId === r.id ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{r.from_program?.name ?? "—"} → {r.to_program?.name ?? "—"}</p>
                  <Badge variant="secondary" className="text-[10px]">{LABEL[r.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.reason}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.submitted_at).toLocaleString()}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detail</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!active && <p className="text-sm text-muted-foreground">Select a request to review.</p>}
            {active && (
              <>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Transfer</p>
                  <p className="font-medium">{active.from_program?.name ?? "—"} → {active.to_program?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Reason</p>
                  <p className="text-sm whitespace-pre-wrap">{active.reason}</p>
                </div>
                {active.academic_justification && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Justification</p>
                    <p className="text-sm whitespace-pre-wrap">{active.academic_justification}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Review notes</p>
                  {notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
                  <ul className="space-y-1">
                    {notes.map(n => (
                      <li key={n.id} className="text-xs rounded border p-2">
                        <div className="flex justify-between text-muted-foreground"><span>{n.reviewer_role} · {LABEL[n.stage] ?? n.stage}</span><span>{new Date(n.created_at).toLocaleString()}</span></div>
                        <p className="mt-1">{n.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Textarea rows={2} placeholder="Add a review note (optional for advance, optional rationale for decide)" value={note} onChange={e => setNote(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    {NEXT[active.status as TransferStatus] && (
                      <Button size="sm" variant="secondary" disabled={busy}
                        onClick={() => run(() => advance(active.id, NEXT[active.status as TransferStatus]!, note || undefined), "Advanced")}>
                        Advance to {LABEL[NEXT[active.status as TransferStatus]!]} <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                    <Button size="sm" disabled={busy}
                      onClick={() => run(() => decide(active.id, "approved", note || undefined), "Approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busy}
                      onClick={() => run(() => decide(active.id, "denied", note || undefined), "Denied")}>
                      <XCircle className="h-4 w-4 mr-1" /> Deny
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Approve atomically updates program, archives prior enrollments, and writes a SUYAS audit entry.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Finalized ({finalized.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {finalized.length === 0 && <p className="text-sm text-muted-foreground">No finalized requests yet.</p>}
          {finalized.slice(0, 25).map(r => (
            <div key={r.id} className="flex items-center justify-between text-xs border-b py-1">
              <span className="truncate">{r.from_program?.name ?? "—"} → {r.to_program?.name ?? "—"}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{LABEL[r.status]}</Badge>
                <span className="text-muted-foreground">{r.decided_at ? new Date(r.decided_at).toLocaleDateString() : ""}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
