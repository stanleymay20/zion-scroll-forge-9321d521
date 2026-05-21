import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Scholarship {
  id: string;
  name: string;
  description: string | null;
  sponsor: string | null;
  award_amount: number;
  currency: string;
  eligibility: string | null;
  total_slots: number;
  opens_at: string | null;
  closes_at: string | null;
  status: string;
}
interface Application {
  id: string;
  scholarship_id: string;
  status: string;
  essay: string | null;
  requested_amount: number | null;
  submitted_at: string | null;
  decided_at: string | null;
}
interface Award {
  id: string;
  scholarship_id: string;
  amount: number;
  currency: string;
  term: string | null;
  awarded_at: string;
}

export default function Scholarships() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [essay, setEssay] = useState("");
  const [requested, setRequested] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, a, w] = await Promise.all([
      supabase.from("scholarships" as any).select("*").in("status", ["open","closed"]).order("closes_at", { ascending: true, nullsFirst: false }),
      user ? supabase.from("scholarship_applications" as any).select("*").eq("applicant_user_id", user.id) : Promise.resolve({ data: [] }),
      user ? supabase.from("scholarship_awards" as any).select("*").eq("awardee_user_id", user.id) : Promise.resolve({ data: [] }),
    ]);
    setScholarships((s.data as any) || []);
    setApps((a.data as any) || []);
    setAwards((w.data as any) || []);
  };
  useEffect(() => { load(); }, [user]);

  const myApp = (sid: string) => apps.find(a => a.scholarship_id === sid);

  const startApp = (s: Scholarship) => {
    const existing = myApp(s.id);
    setActiveId(s.id);
    setEssay(existing?.essay || "");
    setRequested(existing?.requested_amount ? String(existing.requested_amount) : String(s.award_amount));
  };

  const saveDraft = async (submit: boolean) => {
    if (!user || !activeId) return;
    setBusy(true);
    const existing = myApp(activeId);
    const payload: any = {
      scholarship_id: activeId,
      applicant_user_id: user.id,
      essay,
      requested_amount: requested ? Number(requested) : null,
      status: submit ? "submitted" : "draft",
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from("scholarship_applications" as any).update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("scholarship_applications" as any).insert(payload));
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(submit ? "Application submitted" : "Draft saved");
    setActiveId(null);
    load();
  };

  const withdraw = async (appId: string) => {
    if (!confirm("Withdraw this application?")) return;
    const { error } = await supabase.from("scholarship_applications" as any).update({ status: "withdrawn" }).eq("id", appId);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawn");
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Scholarships & Aid</h1>
      <p className="text-muted-foreground mb-6">
        Apply for scholarships funded by sponsors and the Scroll University endowment. Each application is reviewed by the bursar's office.
      </p>

      {awards.length > 0 && (
        <Card className="mb-6 border-burgundy/30">
          <CardHeader><CardTitle className="text-base">My Awards</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {awards.map(a => {
              const s = scholarships.find(x => x.id === a.scholarship_id);
              return (
                <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <div>
                    <div className="font-medium">{s?.name || "Award"}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.term && <>{a.term} · </>}Awarded {new Date(a.awarded_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge>{a.currency} {a.amount}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {scholarships.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No scholarships available right now.</CardContent></Card>
        ) : scholarships.map(s => {
          const app = myApp(s.id);
          const editing = activeId === s.id;
          const isOpen = s.status === "open";
          return (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <div>
                    <div>{s.name}</div>
                    {s.sponsor && <div className="text-xs text-muted-foreground font-normal mt-1">Sponsored by {s.sponsor}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={isOpen ? "default" : "outline"}>{s.status}</Badge>
                    <span className="text-sm font-semibold text-burgundy">{s.currency} {s.award_amount}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.description && <p className="text-sm">{s.description}</p>}
                {s.eligibility && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold">Eligibility: </span>{s.eligibility}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {s.total_slots} slot(s)
                  {s.closes_at && <> · Closes {new Date(s.closes_at).toLocaleDateString()}</>}
                </div>

                {app && !editing && (
                  <div className="flex items-center justify-between border rounded p-2 bg-muted/30">
                    <div className="text-sm">
                      Status: <Badge variant="outline">{app.status}</Badge>
                      {app.submitted_at && <span className="text-xs text-muted-foreground ml-2">Submitted {new Date(app.submitted_at).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex gap-2">
                      {app.status === "draft" && <Button size="sm" onClick={() => startApp(s)}>Continue</Button>}
                      {["submitted","under_review"].includes(app.status) && (
                        <Button size="sm" variant="ghost" onClick={() => withdraw(app.id)}>Withdraw</Button>
                      )}
                    </div>
                  </div>
                )}

                {!app && isOpen && (
                  <Button size="sm" onClick={() => startApp(s)}>Apply</Button>
                )}

                {editing && (
                  <div className="space-y-2 border-t pt-3">
                    <div>
                      <label className="text-xs font-medium">Requested amount ({s.currency})</label>
                      <Input type="number" value={requested} onChange={e => setRequested(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Personal statement / essay</label>
                      <Textarea rows={6} value={essay} onChange={e => setEssay(e.target.value)} placeholder="Why should you receive this scholarship?" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => saveDraft(false)}>Save Draft</Button>
                      <Button size="sm" disabled={busy || !essay.trim()} onClick={() => saveDraft(true)}>Submit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
