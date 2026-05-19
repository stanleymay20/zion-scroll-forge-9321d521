import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Case {
  id: string;
  student_user_id: string;
  category: string;
  summary: string;
  status: string;
  decision: string;
  created_at: string;
}
interface Appeal {
  id: string;
  case_id: string;
  status: string;
  grounds: string;
  ruling: string | null;
}

export default function ConductAdmin() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [c, a] = await Promise.all([
      supabase.from("conduct_cases" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("conduct_appeals" as any).select("*").order("filed_at", { ascending: false }).limit(100),
    ]);
    setCases((c.data as any) || []);
    setAppeals((a.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const fileCase = async () => {
    if (!user || !studentId || !category || !summary) { toast.error("Fill all fields"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("conduct_cases" as any).insert({
      student_user_id: studentId, reported_by: user.id, category, summary,
    }).select().single();
    if (!error && data) {
      await supabase.from("conduct_case_events" as any).insert({
        case_id: (data as any).id, event_kind: "reported", note: `Case opened: ${category}`, actor_id: user.id,
      });
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Case filed");
    setStudentId(""); setCategory(""); setSummary("");
    load();
  };

  const transition = async (c: Case, newStatus: string) => {
    if (!user) return;
    const patch: any = { status: newStatus };
    if (newStatus === "decided") {
      const decision = window.prompt("Decision (no_violation | warning | probation | suspension | dismissal):");
      if (!decision) return;
      const rationale = window.prompt("Decision rationale:");
      if (!rationale) return;
      patch.decision = decision;
      patch.decision_rationale = rationale;
      patch.decided_by = user.id;
    }
    const { error } = await supabase.from("conduct_cases" as any).update(patch).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("conduct_case_events" as any).insert({
      case_id: c.id, event_kind: `transition:${newStatus}`,
      note: patch.decision_rationale || `Moved to ${newStatus}`, actor_id: user.id,
    });
    toast.success("Status updated");
    load();
  };

  const ruleAppeal = async (a: Appeal, status: string) => {
    if (!user) return;
    const ruling = window.prompt("Ruling explanation:");
    if (!ruling) return;
    const { error } = await supabase.from("conduct_appeals" as any).update({
      status, ruling, ruled_by: user.id,
    }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Appeal ruled");
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Student Conduct Office</h1>
      <p className="text-muted-foreground mb-6">
        File cases, advance them through the lifecycle, and rule on appeals. All transitions and events are immutable.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">File New Case</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Student User ID</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} /></div>
          <div><Label>Category</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Academic Dishonesty" /></div>
          <div><Label>Summary</Label><Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} /></div>
          <Button onClick={fileCase} disabled={busy}>File Case</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Open Cases</CardTitle></CardHeader>
        <CardContent>
          {cases.length === 0 ? <p className="text-muted-foreground text-sm">No cases.</p> : (
            <div className="space-y-2">
              {cases.map(c => (
                <div key={c.id} className="flex items-center justify-between border-b py-2 text-sm gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{c.status}</Badge>
                      {c.decision !== "pending" && <Badge>{c.decision}</Badge>}
                      <span className="font-mono text-xs">{c.student_user_id.slice(0, 8)}…</span>
                    </div>
                    <div className="font-medium">{c.category}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.summary}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {c.status === "reported" && <Button size="sm" variant="outline" onClick={() => transition(c, "under_review")}>Review</Button>}
                    {c.status === "under_review" && <Button size="sm" variant="outline" onClick={() => transition(c, "hearing_scheduled")}>Hearing</Button>}
                    {["under_review", "hearing_scheduled"].includes(c.status) && <Button size="sm" onClick={() => transition(c, "decided")}>Decide</Button>}
                    {c.status === "decided" && <Button size="sm" variant="outline" onClick={() => transition(c, "closed")}>Close</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending Appeals</CardTitle></CardHeader>
        <CardContent>
          {appeals.filter(a => ["filed", "under_review"].includes(a.status)).length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending appeals.</p>
          ) : (
            <div className="space-y-2">
              {appeals.filter(a => ["filed", "under_review"].includes(a.status)).map(a => (
                <div key={a.id} className="border-b py-2 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{a.status}</Badge>
                    <span className="font-mono text-xs">case {a.case_id.slice(0, 8)}…</span>
                  </div>
                  <p className="mb-2">{a.grounds}</p>
                  <Select onValueChange={(v) => ruleAppeal(a, v)}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Rule…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upheld">Upheld (original stands)</SelectItem>
                      <SelectItem value="reduced">Reduced (lesser sanction)</SelectItem>
                      <SelectItem value="overturned">Overturned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
