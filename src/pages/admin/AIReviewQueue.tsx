import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Scale } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Status = "pending" | "reviewing" | "upheld" | "overturned" | "withdrawn";
interface ReviewRequest {
  id: string;
  user_id: string;
  decision_type: string;
  decision_reference: string | null;
  ai_system: string | null;
  ai_output: Record<string, unknown>;
  user_explanation: string;
  status: Status;
  reviewer_notes: string | null;
  reviewer_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  reviewing: "default",
  upheld: "outline",
  overturned: "destructive",
  withdrawn: "outline",
};

const AIReviewQueue = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [items, setItems] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      let q: any = (supabase as any).from("human_review_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data ?? []) as ReviewRequest[]);
    } catch (e) {
      toast({ title: "Could not load review queue", description: getUserFriendlyError(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const update = async (id: string, status: Status) => {
    setSavingId(id);
    try {
      const { error } = await (supabase as any).from("human_review_requests").update({
        status,
        reviewer_notes: notes[id] ?? null,
        reviewer_id: user?.id ?? null,
        resolved_at: ["upheld", "overturned"].includes(status) ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: `Marked as ${status}` });
      await load();
    } catch (e) {
      toast({ title: "Update failed", description: getUserFriendlyError(e), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <PageTemplate title="AI Review Queue" description="Human review of AI-assisted decisions (EU AI Act Art. 86).">
      <Helmet><title>AI Review Queue — ScrollUniversity</title></Helmet>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
            <TabsTrigger value="upheld">Upheld</TabsTrigger>
            <TabsTrigger value="overturned">Overturned</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />No requests in this view.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base capitalize">{r.decision_type.replace("_", " ")}</CardTitle>
                    <CardDescription className="text-xs">
                      {r.ai_system ?? "unspecified system"}{r.decision_reference ? ` · ref ${r.decision_reference}` : ""} · submitted {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Learner's concern</div>
                  <p className="whitespace-pre-wrap">{r.user_explanation}</p>
                </div>
                {r.ai_output && Object.keys(r.ai_output).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">AI output</div>
                    <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(r.ai_output, null, 2)}</pre>
                  </div>
                )}
                {["pending", "reviewing"].includes(r.status) && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="Reviewer notes (will be saved with the decision)…"
                      value={notes[r.id] ?? r.reviewer_notes ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={savingId === r.id} onClick={() => update(r.id, "reviewing")}>Mark reviewing</Button>
                      <Button size="sm" variant="outline" disabled={savingId === r.id} onClick={() => update(r.id, "upheld")}>Uphold AI decision</Button>
                      <Button size="sm" disabled={savingId === r.id} onClick={() => update(r.id, "overturned")}>Overturn — human decision wins</Button>
                    </div>
                  </div>
                )}
                {r.reviewer_notes && !["pending", "reviewing"].includes(r.status) && (
                  <div className="border-t pt-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reviewer notes</div>
                    <p className="text-muted-foreground whitespace-pre-wrap">{r.reviewer_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTemplate>
  );
};

export default AIReviewQueue;
