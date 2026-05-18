import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, FileText, Users, ShieldAlert, GraduationCap } from "lucide-react";

interface ThesisProject {
  id: string;
  title: string;
  abstract: string | null;
  project_type: string;
  status: string;
  current_stage: string;
  verified_similarity_score: number | null;
  ai_assistance_disclosure: string | null;
  final_outcome: string | null;
  created_at: string;
}

const StudentThesisCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ThesisProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", abstract: "", project_type: "thesis", ai_disclosure: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("thesis_projects" as any)
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setProjects((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user || !form.title.trim()) return;
    const { error } = await supabase.from("thesis_projects" as any).insert({
      student_id: user.id,
      title: form.title,
      abstract: form.abstract,
      project_type: form.project_type,
      ai_assistance_disclosure: form.ai_disclosure,
      status: "proposal_draft",
    } as any);
    if (error) {
      toast({ title: "Could not create", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Proposal draft created" });
    setOpen(false);
    setForm({ title: "", abstract: "", project_type: "thesis", ai_disclosure: "" });
    load();
  };

  const statusTone = (s: string) =>
    s === "passed" ? "default" : s === "failed" ? "destructive" : "secondary";

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> My Thesis & Dissertation
          </h1>
          <p className="text-muted-foreground">
            Scholarly work is governed end-to-end: proposal, committee, defense, integrity.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Proposal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Thesis Proposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="capstone">Capstone</SelectItem>
                  <SelectItem value="thesis">Thesis</SelectItem>
                  <SelectItem value="dissertation">Dissertation</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Working title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Abstract (research questions, methods, expected contribution)" rows={5} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} />
              <Textarea placeholder="AI assistance disclosure (required — describe any AI use)" rows={3} value={form.ai_disclosure} onChange={(e) => setForm({ ...form, ai_disclosure: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={!form.title.trim() || !form.ai_disclosure.trim()}>Create draft</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Truthfulness covenant
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Submissions are immutable once made — versions are preserved.</p>
          <p>• Committee reviews and defense votes cannot be edited or deleted.</p>
          <p>• Defenses fail closed if integrity flags are unresolved.</p>
          <p>• Self-reported originality is shown separately from verified similarity scores.</p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No thesis projects yet. Start a proposal to begin.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {p.title}
                    </CardTitle>
                    <CardDescription>{p.project_type} · stage: {p.current_stage}</CardDescription>
                  </div>
                  <Badge variant={statusTone(p.status) as any}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.abstract && <p className="text-muted-foreground line-clamp-3">{p.abstract}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Committee governed</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Versions immutable</span>
                  {p.verified_similarity_score !== null && (
                    <span>Verified similarity: {p.verified_similarity_score}%</span>
                  )}
                  {p.final_outcome && <Badge variant="outline">{p.final_outcome}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentThesisCenter;
