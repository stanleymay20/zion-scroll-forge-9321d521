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
import { Briefcase, Clock, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Placement {
  id: string; site_id: string; status: string;
  required_hours: number; completed_hours: number;
  start_date: string | null; end_date: string | null;
  final_outcome: string | null; term_label: string | null;
}

const StudentPracticumCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [logs, setLogs] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ log_date: "", hours: "", activity_summary: "", competencies: "" });
  const [incidentOpen, setIncidentOpen] = useState<string | null>(null);
  const [incident, setIncident] = useState({ category: "safety", severity: "minor", summary: "", details: "" });

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase
      .from("practicum_placements" as any).select("*").eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setPlacements((p as any) || []);
    if (p?.length) {
      const { data: l } = await supabase
        .from("practicum_hour_logs" as any).select("*")
        .in("placement_id", (p as any).map((x: any) => x.id))
        .order("log_date", { ascending: false });
      const grouped: Record<string, any[]> = {};
      ((l as any) || []).forEach((row: any) => {
        (grouped[row.placement_id] = grouped[row.placement_id] || []).push(row);
      });
      setLogs(grouped);
    }
  };
  useEffect(() => { load(); }, [user?.id]);

  const submitLog = async (placementId: string) => {
    if (!user || !form.log_date || !form.hours || !form.activity_summary.trim()) return;
    const { error } = await supabase.from("practicum_hour_logs" as any).insert({
      placement_id: placementId, student_id: user.id,
      log_date: form.log_date, hours: Number(form.hours),
      activity_summary: form.activity_summary,
      competencies_practiced: form.competencies.split(",").map(s => s.trim()).filter(Boolean),
    } as any);
    if (error) { toast({ title: "Submit failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hours submitted for supervisor attestation" });
    setOpen(null); setForm({ log_date: "", hours: "", activity_summary: "", competencies: "" });
    load();
  };

  const reportIncident = async (placementId: string, siteId: string) => {
    if (!user || !incident.summary.trim()) return;
    const { error } = await supabase.from("practicum_incidents" as any).insert({
      placement_id: placementId, site_id: siteId,
      reporter_id: user.id, reporter_role: "student",
      category: incident.category, severity: incident.severity,
      summary: incident.summary, details: incident.details,
    } as any);
    if (error) { toast({ title: "Report failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Incident reported", description: "Registrar will review." });
    setIncidentOpen(null); setIncident({ category: "safety", severity: "minor", summary: "", details: "" });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <Briefcase className="h-7 w-7 text-primary" /> My Practicum / Clinical Placement
      </h1>
      <p className="text-muted-foreground mb-6">
        Field hours are governed: supervisor attestation is required, and attested logs become immutable.
      </p>

      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Placement integrity covenant
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Self-logged hours do not count until your supervisor attests them.</p>
          <p>• Attested hours and competency sign-offs cannot be edited or deleted.</p>
          <p>• Critical unresolved incidents fail the placement closed.</p>
          <p>• You can report safety, conduct, or scope incidents directly to the registrar.</p>
        </CardContent>
      </Card>

      {placements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No active placements. The registrar will assign placements once site approvals are complete.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {placements.map(p => {
            const pct = p.required_hours > 0 ? Math.min(100, (Number(p.completed_hours) / p.required_hours) * 100) : 0;
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Placement · {p.term_label || "current term"}</CardTitle>
                      <CardDescription>
                        {p.start_date || "—"} → {p.end_date || "—"} · {p.completed_hours} / {p.required_hours} hrs attested
                      </CardDescription>
                    </div>
                    <Badge variant={p.final_outcome === "pass" ? "default" : "secondary"}>{p.final_outcome || p.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} />
                  <div className="flex gap-2">
                    <Dialog open={open === p.id} onOpenChange={(o) => setOpen(o ? p.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Clock className="h-3 w-3 mr-1" /> Log hours</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Submit field hours</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <Input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} />
                          <Input type="number" step="0.25" placeholder="Hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                          <Textarea rows={4} placeholder="Activity summary" value={form.activity_summary} onChange={(e) => setForm({ ...form, activity_summary: e.target.value })} />
                          <Input placeholder="Competencies practiced (comma separated codes)" value={form.competencies} onChange={(e) => setForm({ ...form, competencies: e.target.value })} />
                          <p className="text-xs text-muted-foreground italic">Submission is not counted until your supervisor attests it.</p>
                        </div>
                        <DialogFooter><Button onClick={() => submitLog(p.id)}>Submit</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={incidentOpen === p.id} onOpenChange={(o) => setIncidentOpen(o ? p.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><AlertTriangle className="h-3 w-3 mr-1" /> Report incident</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Report a placement incident</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <select className="w-full rounded-md border bg-background p-2 text-sm" value={incident.category} onChange={(e) => setIncident({ ...incident, category: e.target.value })}>
                            <option value="safety">Safety</option>
                            <option value="conduct">Conduct</option>
                            <option value="integrity">Integrity</option>
                            <option value="scope">Scope</option>
                            <option value="other">Other</option>
                          </select>
                          <select className="w-full rounded-md border bg-background p-2 text-sm" value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}>
                            <option value="minor">Minor</option>
                            <option value="moderate">Moderate</option>
                            <option value="serious">Serious</option>
                            <option value="critical">Critical</option>
                          </select>
                          <Input placeholder="Summary" value={incident.summary} onChange={(e) => setIncident({ ...incident, summary: e.target.value })} />
                          <Textarea rows={4} placeholder="Details" value={incident.details} onChange={(e) => setIncident({ ...incident, details: e.target.value })} />
                        </div>
                        <DialogFooter><Button onClick={() => reportIncident(p.id, p.site_id)}>Submit report</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {(logs[p.id] || []).length > 0 && (
                    <div className="border-t pt-3 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Recent submissions</div>
                      {(logs[p.id] || []).slice(0, 5).map(l => (
                        <div key={l.id} className="flex items-center justify-between text-xs">
                          <span>{l.log_date} · {l.hours}h · {l.activity_summary.slice(0, 60)}</span>
                          <Badge variant={l.status === "attested" ? "default" : "secondary"} className="gap-1">
                            {l.status === "attested" && <CheckCircle2 className="h-3 w-3" />}
                            {l.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentPracticumCenter;
