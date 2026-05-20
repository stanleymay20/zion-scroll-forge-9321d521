import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Plan {
  id: string;
  student_user_id: string;
  title: string;
  target_term: string | null;
  status: string;
  submitted_at: string | null;
}
interface Item {
  id: string;
  plan_id: string;
  term_label: string;
  course_code: string;
  course_title: string | null;
  credit_hours: number;
  sequence: number;
}

export default function AdvisorPlanReviews() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: assigns } = await supabase
      .from("advising_assignments" as any)
      .select("student_user_id")
      .eq("advisor_user_id", user.id)
      .eq("active", true);
    const studentIds = (assigns as any || []).map((a: any) => a.student_user_id);
    if (studentIds.length === 0) { setPlans([]); setLoading(false); return; }
    const [p, i] = await Promise.all([
      supabase.from("degree_plans" as any).select("*").in("student_user_id", studentIds).order("submitted_at", { ascending: false, nullsFirst: false }),
      supabase.from("degree_plan_items" as any).select("*").order("sequence"),
    ]);
    setPlans((p.data as any) || []);
    setItems((i.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const decide = async (plan: Plan, action: "approved" | "rejected") => {
    if (!user) return;
    const rationale = window.prompt(`Rationale for ${action}:`);
    if (!rationale || rationale.length < 10) { toast.error("Rationale required (10+ chars)"); return; }
    const newStatus = action === "approved" ? "approved" : "rejected";
    const { error } = await supabase.from("degree_plans" as any).update({
      status: newStatus, decided_at: new Date().toISOString(), decided_by: user.id,
    }).eq("id", plan.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("degree_plan_reviews" as any).insert({
      plan_id: plan.id, action, rationale, actor_id: user.id,
    });
    toast.success(`Plan ${action}`);
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Advisee Degree Plans</h1>
      <p className="text-muted-foreground mb-6">
        Review and approve or reject plans submitted by your assigned advisees.
      </p>

      {loading ? <p className="text-muted-foreground">Loading…</p> :
        plans.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No plans from your advisees.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {plans.map(p => {
              const planItems = items.filter(i => i.plan_id === p.id);
              const totalCredits = planItems.reduce((s, i) => s + Number(i.credit_hours || 0), 0);
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{p.title}</span>
                      <Badge variant={p.status === "approved" ? "default" : "outline"}>{p.status}</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Student {p.student_user_id.slice(0, 8)}… · {planItems.length} courses · {totalCredits.toFixed(1)} credits
                      {p.target_term && ` · Target: ${p.target_term}`}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {planItems.map(it => (
                        <div key={it.id} className="text-sm border-b py-1">
                          <span className="font-mono">{it.course_code}</span>
                          {it.course_title && <span className="text-muted-foreground"> — {it.course_title}</span>}
                          <span className="text-xs text-muted-foreground ml-2">[{it.term_label}, {it.credit_hours}cr]</span>
                        </div>
                      ))}
                    </div>
                    {p.status === "submitted" && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" onClick={() => decide(p, "approved")}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => decide(p, "rejected")}>Reject</Button>
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
