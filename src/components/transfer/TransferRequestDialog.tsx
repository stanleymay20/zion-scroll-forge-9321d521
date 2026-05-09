import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMyTransferRequests } from "@/hooks/useProgramTransfer";

interface Program { id: string; name: string }

interface Props {
  currentProgramId: string | null;
  trigger?: React.ReactNode;
}

const STAGE_LABEL: Record<string, string> = {
  submitted: "Submitted",
  advisor_review: "Advisor review",
  faculty_review: "Faculty review",
  registrar_review: "Registrar review",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
  archived: "Archived",
};

export function TransferRequestDialog({ currentProgramId, trigger }: Props) {
  const { toast } = useToast();
  const { openRequest, requests, submit, withdraw } = useMyTransferRequests();
  const [open, setOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [toProgram, setToProgram] = useState<string>("");
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [effectiveTerm, setEffectiveTerm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("degree_programs")
        .select("id,name")
        .order("name");
      setPrograms(((data as any[]) ?? []).filter(p => p.id !== currentProgramId) as Program[]);
    })();
  }, [open, currentProgramId]);

  const onSubmit = async () => {
    if (!toProgram || reason.trim().length < 10) {
      toast({ title: "Missing details", description: "Pick a program and provide a reason of at least 10 characters.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await submit({
        to_program_id: toProgram, reason: reason.trim(),
        academic_justification: justification.trim() || undefined,
        effective_term: effectiveTerm.trim() || undefined,
      });
      toast({ title: "Transfer request submitted", description: "Your request will be reviewed by your advisor, faculty, then the registrar." });
      setOpen(false);
      setReason(""); setJustification(""); setEffectiveTerm(""); setToProgram("");
    } catch (e: any) {
      toast({ title: "Could not submit", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const onWithdraw = async () => {
    if (!openRequest) return;
    setBusy(true);
    try {
      await withdraw(openRequest.id);
      toast({ title: "Request withdrawn" });
    } catch (e: any) {
      toast({ title: "Could not withdraw", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const recent = requests.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Request Program Transfer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Program Transfer Request</DialogTitle>
          <DialogDescription>
            Your academic identity is locked. Transfers go through advisor, faculty, then registrar review and are recorded in the academic audit log.
          </DialogDescription>
        </DialogHeader>

        {openRequest ? (
          <div className="space-y-3">
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-medium">{openRequest.to_program?.name ?? "Program"}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(openRequest.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">{STAGE_LABEL[openRequest.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{openRequest.reason}</p>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              You may only have one open transfer request at a time. You can withdraw it before a final decision.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              <Button variant="destructive" onClick={onWithdraw} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Withdraw request
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Target degree program</Label>
              <Select value={toProgram} onValueChange={setToProgram}>
                <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason (required, 10+ characters)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why are you seeking this change?" />
            </div>
            <div className="space-y-1">
              <Label>Academic justification (optional)</Label>
              <Textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Career fit, prior coursework, calling, etc." />
            </div>
            <div className="space-y-1">
              <Label>Preferred effective term (optional)</Label>
              <Input value={effectiveTerm} onChange={e => setEffectiveTerm(e.target.value)} placeholder="e.g. 2026-Spring" />
            </div>

            {recent.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recent requests</p>
                <ul className="text-xs space-y-1">
                  {recent.map(r => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <span className="truncate">{r.to_program?.name ?? "—"}</span>
                      <Badge variant="outline" className="text-[10px]">{STAGE_LABEL[r.status]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onSubmit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit for review
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
