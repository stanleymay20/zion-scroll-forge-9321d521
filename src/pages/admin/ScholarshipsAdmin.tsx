import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Scholarship {
  id: string; name: string; sponsor: string | null; award_amount: number;
  currency: string; total_slots: number; opens_at: string | null;
  closes_at: string | null; status: string;
}
interface Application {
  id: string; scholarship_id: string; applicant_user_id: string;
  status: string; essay: string | null; requested_amount: number | null;
  submitted_at: string | null;
}

export default function ScholarshipsAdmin() {
  const { user } = useAuth();
  const [list, setList] = useState<Scholarship[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [form, setForm] = useState({
    name: "", description: "", sponsor: "", award_amount: 1000,
    currency: "USD", eligibility: "", total_slots: 1,
    opens_at: "", closes_at: "", status: "draft",
  });
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [s, a] = await Promise.all([
      supabase.from("scholarships" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("scholarship_applications" as any).select("*").in("status", ["submitted","under_review","awarded","rejected"]).order("submitted_at", { ascending: false }).limit(200),
    ]);
    setList((s.data as any) || []);
    setApps((a.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const payload: any = { ...form };
    if (!payload.opens_at) payload.opens_at = null;
    if (!payload.closes_at) payload.closes_at = null;
    const { error } = await supabase.from("scholarships" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Scholarship created");
    setForm({ ...form, name: "", description: "", sponsor: "", eligibility: "" });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("scholarships" as any).update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    load();
  };

  const decide = async (app: Application, to: string) => {
    const rationale = window.prompt(`Rationale for "${to}":`);
    if (!rationale) return;
    setBusy(app.id);
    const { error } = await supabase.from("scholarship_applications" as any).update({ status: to }).eq("id", app.id);
    if (error) { setBusy(null); toast.error(error.message); return; }

    // log review
    await supabase.from("scholarship_application_reviews" as any).insert({
      application_id: app.id,
      reviewer_user_id: user!.id,
      from_status: app.status,
      to_status: to,
      rationale,
    });

    if (to === "awarded") {
      const sch = list.find(x => x.id === app.scholarship_id);
      const term = window.prompt("Term (e.g. 2026-Spring):", "") || null;
      const { error: ae } = await supabase.from("scholarship_awards" as any).insert({
        application_id: app.id,
        scholarship_id: app.scholarship_id,
        awardee_user_id: app.applicant_user_id,
        amount: app.requested_amount ?? sch?.award_amount ?? 0,
        currency: sch?.currency ?? "USD",
        term,
        notes: rationale,
        awarded_by: user!.id,
      });
      if (ae) toast.error(`Award failed: ${ae.message}`);
      else toast.success("Award recorded");
    } else {
      toast.success("Updated");
    }
    setBusy(null);
    load();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Scholarships Admin</h1>
      <p className="text-muted-foreground mb-6">
        Publish scholarship opportunities, review applications, and record awards.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Create Scholarship</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Sponsor</Label><Input value={form.sponsor} onChange={e => setForm({ ...form, sponsor: e.target.value })} /></div>
            <div><Label>Award Amount</Label><Input type="number" value={form.award_amount} onChange={e => setForm({ ...form, award_amount: Number(e.target.value) })} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div><Label>Total Slots</Label><Input type="number" value={form.total_slots} onChange={e => setForm({ ...form, total_slots: Number(e.target.value) })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","open","closed","archived"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Opens At</Label><Input type="datetime-local" value={form.opens_at} onChange={e => setForm({ ...form, opens_at: e.target.value })} /></div>
            <div><Label>Closes At</Label><Input type="datetime-local" value={form.closes_at} onChange={e => setForm({ ...form, closes_at: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Eligibility</Label><Textarea rows={2} value={form.eligibility} onChange={e => setForm({ ...form, eligibility: e.target.value })} /></div>
          <Button onClick={create}>Create</Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Pending Applications</CardTitle></CardHeader>
        <CardContent>
          {apps.length === 0 ? <p className="text-sm text-muted-foreground">No applications.</p> : (
            <div className="space-y-2">
              {apps.map(a => {
                const s = list.find(x => x.id === a.scholarship_id);
                return (
                  <div key={a.id} className="border rounded p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{s?.name || "Scholarship"}</div>
                        <div className="text-xs text-muted-foreground">
                          Applicant {a.applicant_user_id.slice(0,8)}… · Requested {a.requested_amount ?? "—"}
                        </div>
                      </div>
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                    {a.essay && <p className="text-xs whitespace-pre-wrap line-clamp-4">{a.essay}</p>}
                    <div className="flex gap-2 flex-wrap">
                      {a.status === "submitted" && (
                        <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => decide(a, "under_review")}>Move to Review</Button>
                      )}
                      {["submitted","under_review"].includes(a.status) && (
                        <>
                          <Button size="sm" disabled={busy === a.id} onClick={() => decide(a, "awarded")}>Award</Button>
                          <Button size="sm" variant="destructive" disabled={busy === a.id} onClick={() => decide(a, "rejected")}>Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All Scholarships ({list.length})</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <div className="space-y-1">
              {list.map(s => (
                <div key={s.id} className="flex items-center gap-3 text-sm border-b py-2">
                  <Badge variant="outline">{s.status}</Badge>
                  <span className="font-medium flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.currency} {s.award_amount} · {s.total_slots} slot(s)</span>
                  {s.status === "draft" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "open")}>Open</Button>}
                  {s.status === "open" && <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "closed")}>Close</Button>}
                  {s.status === "closed" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "archived")}>Archive</Button>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
