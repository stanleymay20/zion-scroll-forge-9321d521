import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Plan {
  id: string;
  title: string;
  target_term: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}
interface Item {
  id: string;
  plan_id: string;
  term_label: string;
  course_code: string;
  course_title: string | null;
  credit_hours: number;
  sequence: number;
  required: boolean;
}
interface Review {
  id: string;
  plan_id: string;
  action: string;
  rationale: string;
  created_at: string;
}

export default function MyDegreePlan() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [title, setTitle] = useState("");
  const [targetTerm, setTargetTerm] = useState("");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ term_label: "", course_code: "", course_title: "", credit_hours: 3 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [p, i, r] = await Promise.all([
      supabase.from("degree_plans" as any).select("*").eq("student_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("degree_plan_items" as any).select("*").order("sequence"),
      supabase.from("degree_plan_reviews" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setPlans((p.data as any) || []);
    setItems((i.data as any) || []);
    setReviews((r.data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const createPlan = async () => {
    if (!user || !title) { toast.error("Enter a title"); return; }
    const { error } = await supabase.from("degree_plans" as any).insert({
      student_user_id: user.id, title, target_term: targetTerm || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Draft plan created");
    setTitle(""); setTargetTerm("");
    load();
  };

  const addItem = async (planId: string) => {
    if (!newItem.term_label || !newItem.course_code) { toast.error("Term and course code required"); return; }
    const { error } = await supabase.from("degree_plan_items" as any).insert({
      plan_id: planId, ...newItem,
      sequence: items.filter(x => x.plan_id === planId).length,
    });
    if (error) { toast.error(error.message); return; }
    setNewItem({ term_label: "", course_code: "", course_title: "", credit_hours: 3 });
    load();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("degree_plan_items" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const submit = async (plan: Plan) => {
    if (!user) return;
    const rationale = window.prompt("Brief summary for your advisor:");
    if (!rationale) return;
    const { error } = await supabase.from("degree_plans" as any).update({
      status: "submitted", submitted_at: new Date().toISOString(),
    }).eq("id", plan.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("degree_plan_reviews" as any).insert({
      plan_id: plan.id, action: "submitted", rationale, actor_id: user.id,
    });
    toast.success("Submitted for advisor review");
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">My Degree Plan</h1>
      <p className="text-muted-foreground mb-6">
        Draft your multi-term plan, submit it for your advisor's approval, and view their review history.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">New Draft Plan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MDiv Track — Spring 2027" /></div>
          <div><Label>Target Term (optional)</Label><Input value={targetTerm} onChange={e => setTargetTerm(e.target.value)} placeholder="e.g. Spring 2028" /></div>
          <Button onClick={createPlan}>Create Draft</Button>
        </CardContent>
      </Card>

      {loading ? <p className="text-muted-foreground">Loading…</p> :
        plans.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No plans yet.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {plans.map(p => {
              const planItems = items.filter(i => i.plan_id === p.id);
              const planReviews = reviews.filter(r => r.plan_id === p.id);
              const editable = p.status === "draft";
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{p.title}</span>
                      <Badge variant={p.status === "approved" ? "default" : "outline"}>{p.status}</Badge>
                    </CardTitle>
                    {p.target_term && <p className="text-xs text-muted-foreground">Target: {p.target_term}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {planItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No courses planned.</p>
                    ) : (
                      <div className="space-y-1">
                        {planItems.map(it => (
                          <div key={it.id} className="flex items-center justify-between text-sm border-b py-1">
                            <div>
                              <span className="font-mono">{it.course_code}</span>
                              {it.course_title && <span className="text-muted-foreground"> — {it.course_title}</span>}
                              <span className="text-xs text-muted-foreground ml-2">[{it.term_label}, {it.credit_hours}cr]</span>
                            </div>
                            {editable && <Button size="sm" variant="ghost" onClick={() => removeItem(it.id)}>Remove</Button>}
                          </div>
                        ))}
                      </div>
                    )}

                    {editable && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Term (Fall 2026)" value={activePlanId === p.id ? newItem.term_label : ""}
                            onChange={e => { setActivePlanId(p.id); setNewItem(n => ({ ...n, term_label: e.target.value })); }} />
                          <Input placeholder="Course code" value={activePlanId === p.id ? newItem.course_code : ""}
                            onChange={e => { setActivePlanId(p.id); setNewItem(n => ({ ...n, course_code: e.target.value })); }} />
                          <Input placeholder="Title (optional)" value={activePlanId === p.id ? newItem.course_title : ""}
                            onChange={e => { setActivePlanId(p.id); setNewItem(n => ({ ...n, course_title: e.target.value })); }} />
                          <Input type="number" step="0.5" placeholder="Credits" value={activePlanId === p.id ? newItem.credit_hours : 3}
                            onChange={e => { setActivePlanId(p.id); setNewItem(n => ({ ...n, credit_hours: Number(e.target.value) })); }} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => addItem(p.id)}>Add Course</Button>
                          {planItems.length > 0 && <Button size="sm" onClick={() => submit(p)}>Submit for Review</Button>}
                        </div>
                      </div>
                    )}

                    {planReviews.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-xs text-muted-foreground mb-1">Review History</div>
                        {planReviews.map(r => (
                          <div key={r.id} className="text-sm border-l-2 border-gold pl-3 mb-2">
                            <Badge variant="outline" className="mr-2">{r.action}</Badge>
                            {r.rationale}
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
}
