import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Site { id: string; name: string; sector: string | null; country: string | null; active: boolean; }
interface Placement {
  id: string; student_user_id: string; site_id: string; role_title: string;
  term: string | null; hours_target: number; hours_logged: number; status: string;
  supervisor_user_id: string | null; supervisor_external_email: string | null;
}
interface Log {
  id: string; placement_id: string; log_date: string; hours: number;
  narrative: string | null; status: string;
}

export default function PlacementsAdmin() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [siteForm, setSiteForm] = useState({ name: "", sector: "", country: "", contact_name: "", contact_email: "" });
  const [evalForm, setEvalForm] = useState<Record<string, any>>({});

  const load = async () => {
    const [s, p, l] = await Promise.all([
      supabase.from("placement_sites" as any).select("*").order("name"),
      supabase.from("placements" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("placement_hours_logs" as any).select("*").eq("status", "pending").order("log_date", { ascending: false }).limit(100),
    ]);
    setSites((s.data as any) || []);
    setPlacements((p.data as any) || []);
    setLogs((l.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const addSite = async () => {
    if (!siteForm.name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("placement_sites" as any).insert(siteForm);
    if (error) { toast.error(error.message); return; }
    toast.success("Site added");
    setSiteForm({ name: "", sector: "", country: "", contact_name: "", contact_email: "" });
    load();
  };

  const setStatus = async (p: Placement, status: string) => {
    const { error } = await supabase.from("placements" as any).update({ status }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    load();
  };

  const reviewLog = async (id: string, to: "approved" | "rejected") => {
    let reason: string | null = null;
    if (to === "rejected") {
      reason = window.prompt("Rejection reason:") || null;
      if (!reason) return;
    }
    const { error } = await supabase.from("placement_hours_logs" as any)
      .update({ status: to, rejection_reason: reason }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(to);
    load();
  };

  const submitEval = async (p: Placement) => {
    const f = evalForm[p.id] || {};
    if (!f.narrative || !f.outcome) { toast.error("Narrative & outcome required"); return; }
    const { error } = await supabase.from("placement_evaluations" as any).insert({
      placement_id: p.id,
      evaluator_user_id: user!.id,
      professionalism: f.professionalism ?? 4,
      competence: f.competence ?? 4,
      initiative: f.initiative ?? 4,
      spiritual_alignment: f.spiritual_alignment ?? 4,
      narrative: f.narrative,
      outcome: f.outcome,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Evaluation recorded");
    setEvalForm({ ...evalForm, [p.id]: undefined });
    load();
  };

  const setEval = (id: string, k: string, v: any) =>
    setEvalForm(s => ({ ...s, [id]: { ...(s[id] || {}), [k]: v } }));

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Placements Admin</h1>
      <p className="text-muted-foreground mb-6">
        Manage approved sites, approve student placements, review hour logs, and record final evaluations.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Add Site</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <div><Label>Name</Label><Input value={siteForm.name} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} /></div>
            <div><Label>Sector</Label><Input value={siteForm.sector} onChange={e => setSiteForm({ ...siteForm, sector: e.target.value })} /></div>
            <div><Label>Country</Label><Input value={siteForm.country} onChange={e => setSiteForm({ ...siteForm, country: e.target.value })} /></div>
            <div><Label>Contact Name</Label><Input value={siteForm.contact_name} onChange={e => setSiteForm({ ...siteForm, contact_name: e.target.value })} /></div>
            <div><Label>Contact Email</Label><Input value={siteForm.contact_email} onChange={e => setSiteForm({ ...siteForm, contact_email: e.target.value })} /></div>
          </div>
          <Button onClick={addSite}>Add Site</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Pending Hour Logs ({logs.length})</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">No pending logs.</p> : (
            <div className="space-y-2">
              {logs.map(l => {
                const p = placements.find(x => x.id === l.placement_id);
                return (
                  <div key={l.id} className="flex items-center justify-between border-b py-2 text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p?.role_title || "Placement"} · {l.hours}h on {l.log_date}</div>
                      {l.narrative && <div className="text-xs text-muted-foreground truncate">{l.narrative}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => reviewLog(l.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => reviewLog(l.id, "rejected")}>Reject</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Placements ({placements.length})</CardTitle></CardHeader>
        <CardContent>
          {placements.length === 0 ? <p className="text-sm text-muted-foreground">No placements.</p> : (
            <div className="space-y-3">
              {placements.map(p => {
                const site = sites.find(s => s.id === p.site_id);
                const f = evalForm[p.id];
                return (
                  <div key={p.id} className="border rounded p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.role_title} @ {site?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Student {p.student_user_id.slice(0,8)}… · {Number(p.hours_logged).toFixed(1)}/{p.hours_target}h
                          {p.term && ` · ${p.term}`}
                        </div>
                      </div>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {p.status === "proposed" && <Button size="sm" onClick={() => setStatus(p, "approved")}>Approve</Button>}
                      {p.status === "approved" && <Button size="sm" onClick={() => setStatus(p, "in_progress")}>Mark In Progress</Button>}
                      {["approved","in_progress"].includes(p.status) && <Button size="sm" variant="outline" onClick={() => setStatus(p, "completed")}>Complete</Button>}
                      {!["completed","canceled"].includes(p.status) && <Button size="sm" variant="ghost" onClick={() => setStatus(p, "canceled")}>Cancel</Button>}
                      {!f && p.status === "completed" && <Button size="sm" variant="outline" onClick={() => setEval(p.id, "outcome", "pass")}>Add Evaluation</Button>}
                    </div>
                    {f && (
                      <div className="border-t pt-2 grid md:grid-cols-2 gap-2">
                        {(["professionalism","competence","initiative","spiritual_alignment"] as const).map(k => (
                          <div key={k}>
                            <Label className="capitalize">{k.replace("_"," ")} (1-5)</Label>
                            <Input type="number" min={1} max={5} value={f[k] ?? 4} onChange={e => setEval(p.id, k, Number(e.target.value))} />
                          </div>
                        ))}
                        <div className="md:col-span-2">
                          <Label>Outcome</Label>
                          <Select value={f.outcome || "pass"} onValueChange={v => setEval(p.id, "outcome", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Narrative</Label>
                          <Textarea rows={3} value={f.narrative || ""} onChange={e => setEval(p.id, "narrative", e.target.value)} />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <Button size="sm" onClick={() => submitEval(p)}>Save Evaluation</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEvalForm({ ...evalForm, [p.id]: undefined })}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sites ({sites.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sites.map(s => (
              <div key={s.id} className="flex items-center gap-3 text-sm border-b py-1">
                <Badge variant={s.active ? "default" : "outline"}>{s.active ? "active" : "inactive"}</Badge>
                <span className="font-medium flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.sector || "—"} · {s.country || "—"}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
