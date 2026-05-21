import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Site { id: string; name: string; sector: string | null; country: string | null; }
interface Placement {
  id: string; student_user_id: string; site_id: string; supervisor_external_email: string | null;
  role_title: string; term: string | null; hours_target: number; hours_logged: number;
  status: string; start_date: string | null; end_date: string | null;
}
interface Log {
  id: string; placement_id: string; log_date: string; hours: number;
  narrative: string | null; status: string; rejection_reason: string | null;
}

export default function MyPlacements() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [activePlacement, setActivePlacement] = useState<string | null>(null);
  const [propose, setPropose] = useState({
    site_id: "", supervisor_external_email: "", role_title: "",
    term: "", hours_target: 120, start_date: "", end_date: "",
  });
  const [logForm, setLogForm] = useState({ log_date: "", hours: 4, narrative: "" });

  const load = async () => {
    if (!user) return;
    const [s, p] = await Promise.all([
      supabase.from("placement_sites" as any).select("*").eq("active", true).order("name"),
      supabase.from("placements" as any).select("*").eq("student_user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSites((s.data as any) || []);
    setPlacements((p.data as any) || []);
    if ((p.data as any)?.length) {
      const ids = (p.data as any).map((x: Placement) => x.id);
      const { data: ld } = await supabase.from("placement_hours_logs" as any).select("*").in("placement_id", ids).order("log_date", { ascending: false });
      setLogs((ld as any) || []);
    } else setLogs([]);
  };
  useEffect(() => { load(); }, [user]);

  const submitPropose = async () => {
    if (!user || !propose.site_id || !propose.role_title) { toast.error("Site & role required"); return; }
    const { error } = await supabase.from("placements" as any).insert({
      ...propose,
      student_user_id: user.id,
      start_date: propose.start_date || null,
      end_date: propose.end_date || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Placement proposed");
    setPropose({ site_id: "", supervisor_external_email: "", role_title: "", term: "", hours_target: 120, start_date: "", end_date: "" });
    load();
  };

  const submitLog = async (placementId: string) => {
    if (!logForm.log_date || !logForm.hours) { toast.error("Date & hours required"); return; }
    const { error } = await supabase.from("placement_hours_logs" as any).insert({
      placement_id: placementId,
      log_date: logForm.log_date,
      hours: logForm.hours,
      narrative: logForm.narrative,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Hours submitted");
    setLogForm({ log_date: "", hours: 4, narrative: "" });
    setActivePlacement(null);
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">My Internships & Placements</h1>
      <p className="text-muted-foreground mb-6">
        Propose a field placement, log your hours weekly, and complete the term with a supervisor evaluation.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Propose New Placement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <Label>Site</Label>
              <Select value={propose.site_id} onValueChange={v => setPropose({ ...propose, site_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.country ? ` · ${s.country}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Role Title</Label><Input value={propose.role_title} onChange={e => setPropose({ ...propose, role_title: e.target.value })} /></div>
            <div><Label>Supervisor Email</Label><Input value={propose.supervisor_external_email} onChange={e => setPropose({ ...propose, supervisor_external_email: e.target.value })} /></div>
            <div><Label>Term</Label><Input value={propose.term} onChange={e => setPropose({ ...propose, term: e.target.value })} placeholder="2026-Spring" /></div>
            <div><Label>Hours Target</Label><Input type="number" value={propose.hours_target} onChange={e => setPropose({ ...propose, hours_target: Number(e.target.value) })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={propose.start_date} onChange={e => setPropose({ ...propose, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={propose.end_date} onChange={e => setPropose({ ...propose, end_date: e.target.value })} /></div>
          </div>
          <Button onClick={submitPropose}>Propose</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {placements.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No placements yet.</CardContent></Card>
        ) : placements.map(p => {
          const site = sites.find(s => s.id === p.site_id);
          const myLogs = logs.filter(l => l.placement_id === p.id);
          const pct = Math.min(100, (Number(p.hours_logged) / p.hours_target) * 100);
          const canLog = ["approved","in_progress"].includes(p.status);
          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-start justify-between">
                  <div>
                    <div>{p.role_title}</div>
                    <div className="text-xs text-muted-foreground font-normal">{site?.name || p.site_id.slice(0,8)} {p.term && `· ${p.term}`}</div>
                  </div>
                  <Badge variant="outline">{p.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Hours: {Number(p.hours_logged).toFixed(1)} / {p.hours_target}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                {canLog && activePlacement !== p.id && (
                  <Button size="sm" onClick={() => setActivePlacement(p.id)}>Log Hours</Button>
                )}
                {activePlacement === p.id && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="grid md:grid-cols-3 gap-2">
                      <div><Label>Date</Label><Input type="date" value={logForm.log_date} onChange={e => setLogForm({ ...logForm, log_date: e.target.value })} /></div>
                      <div><Label>Hours</Label><Input type="number" step="0.25" value={logForm.hours} onChange={e => setLogForm({ ...logForm, hours: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Narrative</Label><Textarea rows={2} value={logForm.narrative} onChange={e => setLogForm({ ...logForm, narrative: e.target.value })} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitLog(p.id)}>Submit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setActivePlacement(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {myLogs.length > 0 && (
                  <div className="border-t pt-2">
                    <div className="text-xs font-medium mb-1">Recent logs</div>
                    <div className="space-y-1">
                      {myLogs.slice(0,8).map(l => (
                        <div key={l.id} className="flex items-center justify-between text-xs">
                          <span>{l.log_date} · {l.hours}h</span>
                          <Badge variant="outline" className="text-[10px]">{l.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
