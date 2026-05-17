import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldAlert, MessageSquare, Clock } from "lucide-react";

type Hold = {
  id: string;
  hold_type: string;
  reason: string | null;
  lifecycle_state: string;
  severity: string;
  placed_at: string;
  review_due_at: string | null;
  sanction_type: string | null;
  reinstatement_conditions: string | null;
  is_active: boolean;
};

type Appeal = {
  id: string;
  hold_id: string;
  state: string;
  outcome: string | null;
  outcome_rationale_public: string | null;
  submitted_at: string;
  decision_due_at: string | null;
};

type Notif = {
  id: string;
  hold_id: string;
  subject: string;
  body: string;
  sent_at: string;
};

const severityColor = (s: string) =>
  s === "severe" ? "destructive" : s === "major" ? "destructive" : s === "moderate" ? "secondary" : "outline";

const StudentIntegrityCenter = () => {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [h, a, n] = await Promise.all([
      supabase.from("student_holds").select("*").order("placed_at", { ascending: false }),
      supabase.from("integrity_appeals").select("*").order("submitted_at", { ascending: false }),
      supabase.from("integrity_notifications").select("*").order("sent_at", { ascending: false }),
    ]);
    setHolds((h.data ?? []) as Hold[]);
    setAppeals((a.data ?? []) as Appeal[]);
    setNotifs((n.data ?? []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Academic Integrity Center";
    load();
  }, []);

  const submitAppeal = async (holdId: string) => {
    const statement = drafts[holdId]?.trim() ?? "";
    if (statement.length < 30) {
      toast.error("Statement must be at least 30 characters.");
      return;
    }
    setSubmitting(holdId);
    const { error } = await supabase.rpc("submit_integrity_appeal", {
      _hold_id: holdId,
      _statement: statement,
    });
    setSubmitting(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Appeal submitted. You will be notified of the decision.");
      setDrafts((d) => ({ ...d, [holdId]: "" }));
      load();
    }
  };

  if (loading) return <div className="container p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-7 w-7" /> Academic Integrity Center
        </h1>
        <p className="text-muted-foreground">
          Transparent record of any holds on your account, the right to appeal, and a written outcome.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your Holds</h2>
        {holds.length === 0 ? (
          <Card><CardContent className="py-8 text-muted-foreground">No holds on your account.</CardContent></Card>
        ) : holds.map((h) => {
          const activeAppeal = appeals.find((a) => a.hold_id === h.id && !["decided", "closed"].includes(a.state));
          const decidedAppeal = appeals.find((a) => a.hold_id === h.id && a.state === "decided");
          return (
            <Card key={h.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="capitalize">{h.hold_type.replace(/_/g, " ")}</span>
                  <div className="flex gap-2">
                    <Badge variant={severityColor(h.severity) as any}>{h.severity}</Badge>
                    <Badge variant="outline" className="capitalize">{h.lifecycle_state.replace(/_/g, " ")}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {h.reason && <div><span className="text-muted-foreground">Reason: </span>{h.reason}</div>}
                {h.sanction_type && <div><span className="text-muted-foreground">Sanction: </span>{h.sanction_type}</div>}
                {h.reinstatement_conditions && (
                  <div><span className="text-muted-foreground">Reinstatement: </span>{h.reinstatement_conditions}</div>
                )}
                {h.review_due_at && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> Review due {new Date(h.review_due_at).toLocaleDateString()}
                  </div>
                )}

                {decidedAppeal && (
                  <div className="rounded border bg-muted/40 p-3">
                    <div className="font-semibold capitalize">Appeal {decidedAppeal.outcome}</div>
                    <div className="text-muted-foreground mt-1">{decidedAppeal.outcome_rationale_public}</div>
                  </div>
                )}

                {!activeAppeal && !decidedAppeal && h.is_active && (
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-sm font-medium">File an appeal</label>
                    <Textarea
                      value={drafts[h.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [h.id]: e.target.value }))}
                      placeholder="Explain your position. Minimum 30 characters."
                      rows={4}
                    />
                    <Button size="sm" disabled={submitting === h.id} onClick={() => submitAppeal(h.id)}>
                      {submitting === h.id ? "Submitting…" : "Submit Appeal"}
                    </Button>
                  </div>
                )}

                {activeAppeal && (
                  <div className="rounded border bg-secondary/30 p-3">
                    <div className="font-semibold capitalize">Appeal {activeAppeal.state.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">
                      Submitted {new Date(activeAppeal.submitted_at).toLocaleDateString()}
                      {activeAppeal.decision_due_at && ` · decision due ${new Date(activeAppeal.decision_due_at).toLocaleDateString()}`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Notification History
        </h2>
        {notifs.length === 0 ? (
          <Card><CardContent className="py-6 text-muted-foreground">No notifications yet.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {notifs.map((n) => (
              <Card key={n.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{n.subject}</div>
                    <div className="text-xs text-muted-foreground">{new Date(n.sent_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{n.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentIntegrityCenter;
