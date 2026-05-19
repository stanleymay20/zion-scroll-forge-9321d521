import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Case {
  id: string;
  category: string;
  summary: string;
  status: string;
  decision: string;
  decision_rationale: string | null;
  decided_at: string | null;
  created_at: string;
}
interface Appeal {
  id: string;
  case_id: string;
  status: string;
  grounds: string;
  ruling: string | null;
  filed_at: string;
}

export default function MyConductCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealGrounds, setAppealGrounds] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    const [c, a] = await Promise.all([
      supabase.from("conduct_cases" as any).select("*").eq("student_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("conduct_appeals" as any).select("*").eq("student_user_id", user.id),
    ]);
    setCases((c.data as any) || []);
    setAppeals((a.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const fileAppeal = async (caseId: string) => {
    if (!user) return;
    const grounds = appealGrounds[caseId];
    if (!grounds || grounds.length < 20) { toast.error("Provide detailed grounds (20+ chars)"); return; }
    const { error } = await supabase.from("conduct_appeals" as any).insert({
      case_id: caseId, student_user_id: user.id, grounds,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Appeal filed");
    load();
  };

  const appealFor = (caseId: string) => appeals.find(a => a.case_id === caseId);
  const isAppealable = (c: Case) =>
    c.status === "decided" && c.decided_at &&
    new Date(c.decided_at) > new Date(Date.now() - 14 * 86400000) &&
    !appealFor(c.id);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">My Conduct Record</h1>
      <p className="text-muted-foreground mb-6">
        Reported incidents and their full audit trail. Appeals must be filed within 14 days of a decision.
      </p>

      {loading ? <p className="text-muted-foreground">Loading…</p> :
        cases.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No conduct cases on record.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {cases.map(c => {
              const appeal = appealFor(c.id);
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{c.category}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{c.status}</Badge>
                        {c.decision !== "pending" && <Badge>{c.decision}</Badge>}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>{c.summary}</p>
                    {c.decision_rationale && (
                      <div className="bg-muted/30 p-3 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Decision Rationale</div>
                        {c.decision_rationale}
                      </div>
                    )}
                    {appeal && (
                      <div className="border-l-2 border-gold pl-3">
                        <div className="text-xs text-muted-foreground">Appeal — {appeal.status}</div>
                        <p className="text-sm">{appeal.grounds}</p>
                        {appeal.ruling && <p className="text-sm mt-1"><strong>Ruling:</strong> {appeal.ruling}</p>}
                      </div>
                    )}
                    {isAppealable(c) && (
                      <div className="space-y-2 pt-2 border-t">
                        <Textarea
                          placeholder="Grounds for appeal…"
                          value={appealGrounds[c.id] || ""}
                          onChange={e => setAppealGrounds(g => ({ ...g, [c.id]: e.target.value }))}
                          rows={3}
                        />
                        <Button size="sm" onClick={() => fileAppeal(c.id)}>File Appeal</Button>
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
}
