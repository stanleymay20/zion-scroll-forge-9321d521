import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, UserCheck, Stamp } from "lucide-react";

const SupervisorPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<any[]>([]);
  const [attestOpen, setAttestOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [comp, setComp] = useState({ placement_id: "", code: "", label: "", level: "developing", evidence: "" });
  const [compOpen, setCompOpen] = useState(false);
  const [myPlacements, setMyPlacements] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: sup } = await supabase
      .from("practicum_supervisors" as any).select("id").eq("user_id", user.id);
    const supIds = ((sup as any) || []).map((s: any) => s.id);
    if (!supIds.length) { setPending([]); setMyPlacements([]); return; }
    const { data: pls } = await supabase
      .from("practicum_placements" as any).select("*").in("supervisor_id", supIds);
    setMyPlacements((pls as any) || []);
    const plIds = ((pls as any) || []).map((p: any) => p.id);
    if (!plIds.length) return;
    const { data: logs } = await supabase
      .from("practicum_hour_logs" as any).select("*")
      .in("placement_id", plIds).eq("status", "submitted")
      .order("log_date", { ascending: false });
    setPending((logs as any) || []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const attest = async (logId: string, decision: "attested" | "rejected") => {
    if (!user) return;
    const { error } = await supabase.from("practicum_hour_logs" as any).update({
      status: decision, attested_by: user.id, attested_at: new Date().toISOString(), attestation_note: note,
    } as any).eq("id", logId);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: decision === "attested" ? "Hours attested (immutable)" : "Hours rejected" });
    setAttestOpen(null); setNote("");
    load();
  };

  const submitCompetency = async () => {
    if (!user || !comp.placement_id || !comp.code || !comp.label || !comp.evidence.trim()) return;
    const { error } = await supabase.from("practicum_competency_attestations" as any).insert({
      placement_id: comp.placement_id,
      competency_code: comp.code, competency_label: comp.label,
      attained_level: comp.level, evidence_notes: comp.evidence,
      attested_by: user.id, attested_by_role: "supervisor",
    } as any);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Competency attested (immutable)" });
    setCompOpen(false); setComp({ placement_id: "", code: "", label: "", level: "developing", evidence: "" });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <UserCheck className="h-7 w-7 text-primary" /> Field Supervisor Portal
      </h1>
      <p className="text-muted-foreground mb-6">Attest hours and sign off competencies. Attestations are immutable.</p>

      <Card className="mb-6 border-primary/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Supervisor duty</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Only attest hours you personally observed or verified.</p>
          <p>• Competency attestations require concrete evidence.</p>
          <p>• Once submitted, attestations cannot be edited or deleted.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end mb-3">
        <Dialog open={compOpen} onOpenChange={setCompOpen}>
          <DialogTrigger asChild><Button size="sm"><Stamp className="h-3 w-3 mr-1" /> New competency attestation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Attest a competency</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={comp.placement_id} onChange={(e) => setComp({ ...comp, placement_id: e.target.value })}>
                <option value="">Select placement…</option>
                {myPlacements.map(p => <option key={p.id} value={p.id}>{p.term_label || p.id.slice(0, 8)} · {p.student_id.slice(0, 8)}</option>)}
              </select>
              <Input placeholder="Competency code (e.g. CL-204)" value={comp.code} onChange={(e) => setComp({ ...comp, code: e.target.value })} />
              <Input placeholder="Competency label" value={comp.label} onChange={(e) => setComp({ ...comp, label: e.target.value })} />
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={comp.level} onChange={(e) => setComp({ ...comp, level: e.target.value })}>
                <option value="introductory">Introductory</option>
                <option value="developing">Developing</option>
                <option value="proficient">Proficient</option>
                <option value="mastery">Mastery</option>
              </select>
              <Textarea rows={4} placeholder="Concrete evidence (what you observed)" value={comp.evidence} onChange={(e) => setComp({ ...comp, evidence: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={submitCompetency}>Submit attestation</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending hour submissions</CardTitle><CardDescription>{pending.length} awaiting your attestation</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing pending.</p>
          ) : pending.map(l => (
            <div key={l.id} className="border rounded-md p-3">
              <div className="flex justify-between items-start mb-1">
                <div className="text-sm">
                  <div className="font-medium">{l.log_date} · {l.hours} hours</div>
                  <div className="text-muted-foreground text-xs">{l.activity_summary}</div>
                </div>
                <Badge variant="secondary">submitted</Badge>
              </div>
              <Dialog open={attestOpen === l.id} onOpenChange={(o) => setAttestOpen(o ? l.id : null)}>
                <DialogTrigger asChild><Button size="sm" variant="outline">Review & attest</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Review submission</DialogTitle></DialogHeader>
                  <p className="text-sm"><strong>{l.log_date}</strong> · {l.hours}h</p>
                  <p className="text-sm text-muted-foreground">{l.activity_summary}</p>
                  <Textarea rows={3} placeholder="Attestation note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <p className="text-xs italic text-muted-foreground">Your decision is immutable once submitted.</p>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => attest(l.id, "rejected")}>Reject</Button>
                    <Button onClick={() => attest(l.id, "attested")}>Attest as observed</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorPortal;
