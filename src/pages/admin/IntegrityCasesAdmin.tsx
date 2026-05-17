import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Appeal = {
  id: string;
  hold_id: string;
  student_user_id: string;
  state: string;
  statement: string;
  submitted_at: string;
  decision_due_at: string | null;
  outcome: string | null;
};

type Hold = {
  id: string;
  hold_type: string;
  severity: string;
  lifecycle_state: string;
  reason: string | null;
  triggered_by_ai: boolean;
  user_id: string;
};

const IntegrityCasesAdmin = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [holds, setHolds] = useState<Record<string, Hold>>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { outcome: string; pub: string; intern: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: aps } = await supabase
      .from("integrity_appeals")
      .select("*")
      .not("state", "in", "(decided,closed)")
      .order("submitted_at", { ascending: true });
    const list = (aps ?? []) as Appeal[];
    setAppeals(list);
    if (list.length > 0) {
      const { data: hs } = await supabase
        .from("student_holds")
        .select("id,hold_type,severity,lifecycle_state,reason,triggered_by_ai,user_id")
        .in("id", list.map((a) => a.hold_id));
      const map: Record<string, Hold> = {};
      (hs ?? []).forEach((h: any) => (map[h.id] = h));
      setHolds(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Integrity Cases — Review Queue";
    load();
  }, []);

  const decide = async (appeal: Appeal) => {
    const d = drafts[appeal.id];
    if (!d?.outcome || (d.pub?.trim().length ?? 0) < 20) {
      toast.error("Outcome and a public rationale (≥20 chars) are required.");
      return;
    }
    setBusy(appeal.id);
    const { error } = await supabase.rpc("decide_integrity_appeal", {
      _appeal_id: appeal.id,
      _outcome: d.outcome,
      _public_rationale: d.pub,
      _internal_notes: d.intern || null,
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Decision recorded and student notified.");
      load();
    }
  };

  if (loading) return <div className="container p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Integrity Cases — Review Queue</h1>
        <p className="text-muted-foreground">
          AI may flag anomalies, but only a human reviewer can issue a final decision.
        </p>
      </header>

      {appeals.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No pending appeals.</CardContent></Card>
      ) : appeals.map((a) => {
        const h = holds[a.hold_id];
        const d = drafts[a.id] ?? { outcome: "", pub: "", intern: "" };
        const overdue = a.decision_due_at && new Date(a.decision_due_at) < new Date();
        return (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Appeal · {h?.hold_type ?? "—"}</span>
                <div className="flex gap-2">
                  {h?.triggered_by_ai && <Badge variant="outline">AI-flagged</Badge>}
                  {h && <Badge variant="secondary">{h.severity}</Badge>}
                  <Badge variant="outline" className="capitalize">{a.state.replace(/_/g, " ")}</Badge>
                  {overdue && <Badge variant="destructive">Overdue</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {h?.reason && <div><span className="text-muted-foreground">Hold reason: </span>{h.reason}</div>}
              <div className="rounded border bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground mb-1">Student statement</div>
                <div className="whitespace-pre-wrap">{a.statement}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Submitted {new Date(a.submitted_at).toLocaleString()}
                {a.decision_due_at && ` · due ${new Date(a.decision_due_at).toLocaleDateString()}`}
              </div>

              <div className="grid gap-3 pt-3 border-t md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Outcome</label>
                  <Select
                    value={d.outcome}
                    onValueChange={(v) => setDrafts((s) => ({ ...s, [a.id]: { ...d, outcome: v } }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upheld">Upheld (hold stands)</SelectItem>
                      <SelectItem value="reduced">Reduced sanction</SelectItem>
                      <SelectItem value="overturned">Overturned (hold removed)</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Public rationale (shown to student)</label>
                <Textarea
                  value={d.pub}
                  onChange={(e) => setDrafts((s) => ({ ...s, [a.id]: { ...d, pub: e.target.value } }))}
                  rows={3}
                  placeholder="Minimum 20 characters. This becomes part of the student's record."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Confidential notes (staff only)</label>
                <Textarea
                  value={d.intern}
                  onChange={(e) => setDrafts((s) => ({ ...s, [a.id]: { ...d, intern: e.target.value } }))}
                  rows={2}
                />
              </div>
              <Button disabled={busy === a.id} onClick={() => decide(a)}>
                {busy === a.id ? "Recording…" : "Record decision"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default IntegrityCasesAdmin;
