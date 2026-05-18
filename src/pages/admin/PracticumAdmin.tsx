import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Shield, AlertTriangle, ClipboardCheck } from "lucide-react";

const PracticumAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sites, setSites] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [siteOpen, setSiteOpen] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: "", site_type: "ministry", description: "", country: "", contact_email: "", capacity: "10" });
  const [approveOpen, setApproveOpen] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");

  const load = async () => {
    const [s, i, p] = await Promise.all([
      supabase.from("practicum_sites" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("practicum_incidents" as any).select("*").in("status", ["open", "under_review", "escalated"]).order("occurred_at", { ascending: false }),
      supabase.from("practicum_placements" as any).select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setSites((s.data as any) || []);
    setIncidents((i.data as any) || []);
    setPlacements((p.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const createSite = async () => {
    if (!user || !siteForm.name) return;
    const { error } = await supabase.from("practicum_sites" as any).insert({
      ...siteForm, capacity: Number(siteForm.capacity), created_by: user.id, status: "pending_review",
    } as any);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Site created" });
    setSiteOpen(false); setSiteForm({ name: "", site_type: "ministry", description: "", country: "", contact_email: "", capacity: "10" });
    load();
  };

  const approveSite = async (siteId: string) => {
    if (!user || !rationale.trim()) return;
    const { error: aErr } = await supabase.from("practicum_site_approvals" as any).insert({
      site_id: siteId, action: "approved", rationale,
      reviewer_id: user.id, reviewer_role: "registrar",
      effective_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    } as any);
    if (aErr) { toast({ title: "Failed", description: aErr.message, variant: "destructive" }); return; }
    await supabase.from("practicum_sites" as any).update({ status: "approved", safety_reviewed_at: new Date().toISOString(), safety_reviewer_id: user.id }).eq("id", siteId);
    toast({ title: "Site approved (immutable record created)" });
    setApproveOpen(null); setRationale("");
    load();
  };

  const resolveIncident = async (id: string) => {
    if (!user) return;
    const summary = window.prompt("Resolution summary (will be permanent):");
    if (!summary) return;
    const { error } = await supabase.from("practicum_incidents" as any).update({
      status: "resolved", resolution_summary: summary, resolved_by: user.id, resolved_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Incident resolved (record now immutable)" });
    load();
  };

  const recomputeOutcome = async (placementId: string) => {
    const { data, error } = await supabase.rpc("compute_practicum_outcome" as any, { _placement_id: placementId } as any);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Computed outcome", description: JSON.stringify(data) });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <Shield className="h-7 w-7 text-primary" /> Practicum Governance
      </h1>
      <p className="text-muted-foreground mb-6">Sites, approvals, placements, and incident oversight.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{sites.length}</div><div className="text-xs text-muted-foreground">Total sites</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{sites.filter(s => s.status === "approved").length}</div><div className="text-xs text-muted-foreground">Approved</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{placements.filter(p => p.status === "active").length}</div><div className="text-xs text-muted-foreground">Active placements</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive">{incidents.length}</div><div className="text-xs text-muted-foreground">Open incidents</div></CardContent></Card>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-display flex items-center gap-2"><Building2 className="h-5 w-5" /> Sites</h2>
        <Dialog open={siteOpen} onOpenChange={setSiteOpen}>
          <DialogTrigger asChild><Button size="sm">Add site</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register a placement site</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Site name" value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} />
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={siteForm.site_type} onChange={(e) => setSiteForm({ ...siteForm, site_type: e.target.value })}>
                <option value="ministry">Ministry</option>
                <option value="clinical">Clinical</option>
                <option value="education">Education</option>
                <option value="ngo">NGO</option>
                <option value="corporate">Corporate</option>
                <option value="research">Research</option>
              </select>
              <Input placeholder="Country" value={siteForm.country} onChange={(e) => setSiteForm({ ...siteForm, country: e.target.value })} />
              <Input placeholder="Contact email" value={siteForm.contact_email} onChange={(e) => setSiteForm({ ...siteForm, contact_email: e.target.value })} />
              <Input type="number" placeholder="Capacity" value={siteForm.capacity} onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })} />
              <Textarea rows={3} placeholder="Description" value={siteForm.description} onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={createSite}>Create (pending review)</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-2">
          {sites.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No sites yet.</p> : sites.map(s => (
            <div key={s.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{s.name} <Badge variant="outline" className="ml-2">{s.site_type}</Badge></div>
                <div className="text-xs text-muted-foreground">{s.country || "—"} · capacity {s.capacity}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status}</Badge>
                {s.status !== "approved" && (
                  <Dialog open={approveOpen === s.id} onOpenChange={(o) => setApproveOpen(o ? s.id : null)}>
                    <DialogTrigger asChild><Button size="sm" variant="outline">Approve</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Approve site: {s.name}</DialogTitle></DialogHeader>
                      <Textarea rows={4} placeholder="Approval rationale (becomes immutable governance record)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
                      <DialogFooter><Button onClick={() => approveSite(s.id)} disabled={!rationale.trim()}>Approve site</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="text-xl font-display flex items-center gap-2 mb-3"><AlertTriangle className="h-5 w-5" /> Open incidents</h2>
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-2">
          {incidents.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No open incidents.</p> : incidents.map(i => (
            <div key={i.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{i.summary}</div>
                <div className="text-xs text-muted-foreground">{i.category} · severity: <strong>{i.severity}</strong></div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={i.severity === "critical" ? "destructive" : "secondary"}>{i.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => resolveIncident(i.id)}>Resolve</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="text-xl font-display flex items-center gap-2 mb-3"><ClipboardCheck className="h-5 w-5" /> Placements</h2>
      <Card>
        <CardContent className="pt-6 space-y-2">
          {placements.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No placements.</p> : placements.map(p => (
            <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
              <div className="text-sm">
                <div className="font-medium">{p.term_label || "Placement"} · {p.completed_hours}/{p.required_hours} hrs</div>
                <div className="text-xs text-muted-foreground">student {p.student_id.slice(0, 8)} · {p.status}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => recomputeOutcome(p.id)}>Compute outcome</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticumAdmin;
