import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, ClipboardList } from "lucide-react";

const ThesisGovernanceAdmin = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [defenseOpen, setDefenseOpen] = useState<string | null>(null);
  const [defForm, setDefForm] = useState({ mode: "oral_public", scheduled_at: "", location: "", virtual_link: "" });

  const load = async () => {
    const { data } = await supabase
      .from("thesis_projects" as any)
      .select("id, title, project_type, status, current_stage, student_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setProjects((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const scheduleDefense = async (thesisId: string) => {
    if (!defForm.scheduled_at) return;
    const { error } = await supabase.from("thesis_defenses" as any).insert({
      thesis_id: thesisId,
      mode: defForm.mode,
      scheduled_at: defForm.scheduled_at,
      location: defForm.location,
      virtual_link: defForm.virtual_link,
      status: "scheduled",
    } as any);
    if (error) { toast({ title: "Schedule failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("thesis_projects" as any).update({ status: "defense_scheduled" }).eq("id", thesisId);
    toast({ title: "Defense scheduled" });
    setDefenseOpen(null);
    load();
  };

  const stats = {
    total: projects.length,
    in_progress: projects.filter(p => ["in_progress","proposal_approved","revisions_required"].includes(p.status)).length,
    defended: projects.filter(p => ["defended","passed"].includes(p.status)).length,
    failed: projects.filter(p => p.status === "failed").length,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <Shield className="h-7 w-7 text-primary" /> Thesis Governance
      </h1>
      <p className="text-muted-foreground mb-6">Registrar oversight for thesis & dissertation lifecycle.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total projects", value: stats.total },
          { label: "In progress", value: stats.in_progress },
          { label: "Defended/Passed", value: stats.defended },
          { label: "Failed", value: stats.failed },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-6">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" /> Active thesis projects
          </CardTitle>
          <CardDescription>Outcomes are computed from immutable votes — they cannot be set manually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No thesis projects yet.</p>
          ) : projects.map(p => (
            <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.project_type} · {p.status}</div>
              </div>
              <Dialog open={defenseOpen === p.id} onOpenChange={(o) => setDefenseOpen(o ? p.id : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Schedule defense</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Schedule defense — {p.title}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Select value={defForm.mode} onValueChange={(v) => setDefForm({ ...defForm, mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral_public">Oral · Public</SelectItem>
                        <SelectItem value="oral_closed">Oral · Closed</SelectItem>
                        <SelectItem value="virtual_public">Virtual · Public</SelectItem>
                        <SelectItem value="virtual_closed">Virtual · Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="datetime-local" value={defForm.scheduled_at} onChange={(e) => setDefForm({ ...defForm, scheduled_at: e.target.value })} />
                    <Input placeholder="Location" value={defForm.location} onChange={(e) => setDefForm({ ...defForm, location: e.target.value })} />
                    <Input placeholder="Virtual link (if applicable)" value={defForm.virtual_link} onChange={(e) => setDefForm({ ...defForm, virtual_link: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => scheduleDefense(p.id)}>Schedule</Button>
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

export default ThesisGovernanceAdmin;
