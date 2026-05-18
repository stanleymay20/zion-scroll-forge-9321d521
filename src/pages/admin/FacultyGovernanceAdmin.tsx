import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, BookCheck, ClipboardList, Plus } from "lucide-react";

// 12 Supreme Scroll Faculties — keep aligned with project memory
const DOMAINS = [
  { code: "SSF-01", label: "Theology & Scripture" },
  { code: "SSF-02", label: "Prophetic Studies" },
  { code: "SSF-03", label: "Pastoral Ministry" },
  { code: "SSF-04", label: "Apostolic Leadership" },
  { code: "SSF-05", label: "Intercession & Spiritual Warfare" },
  { code: "SSF-06", label: "Worship & Arts" },
  { code: "SSF-07", label: "Missions & Cultures" },
  { code: "SSF-08", label: "Marketplace & Economics" },
  { code: "SSF-09", label: "Education & Discipleship" },
  { code: "SSF-10", label: "Healing & Wholeness" },
  { code: "SSF-11", label: "Governance & Statesmanship" },
  { code: "SSF-12", label: "Science, Technology & AI" },
];

const FacultyGovernanceAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"creds" | "domains" | "assignments">("creds");
  const [creds, setCreds] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [verifyOpen, setVerifyOpen] = useState<string | null>(null);
  const [verifyForm, setVerifyForm] = useState({ action: "verified", method: "document_review", rationale: "" });
  const [domainOpen, setDomainOpen] = useState(false);
  const [domainForm, setDomainForm] = useState({ faculty_user_id: "", domain_code: DOMAINS[0].code, level: "lecturer" });
  const [asnOpen, setAsnOpen] = useState(false);
  const [asnForm, setAsnForm] = useState({ faculty_user_id: "", course_title: "", course_code: "", domain_code: DOMAINS[0].code, term_label: "", workload_weight: "1.0" });

  const load = async () => {
    const [c, d, a] = await Promise.all([
      supabase.from("faculty_credentials" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("faculty_competency_domains" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("faculty_teaching_assignments" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setCreds((c.data as any) || []);
    setDomains((d.data as any) || []);
    setAssignments((a.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const verifyCred = async (credId: string) => {
    if (!user || !verifyForm.rationale.trim()) return;
    const { error: vErr } = await supabase.from("faculty_credential_verifications" as any).insert({
      credential_id: credId,
      action: verifyForm.action, method: verifyForm.method, rationale: verifyForm.rationale,
      reviewer_id: user.id, reviewer_role: "registrar",
    } as any);
    if (vErr) { toast({ title: "Failed", description: vErr.message, variant: "destructive" }); return; }
    const newState = verifyForm.action === "verified" ? "verified" : verifyForm.action === "rejected" ? "rejected" : "expired";
    await supabase.from("faculty_credentials" as any).update({
      verification_state: newState, verified_by: user.id, verified_at: new Date().toISOString(),
    }).eq("id", credId);
    toast({ title: `Credential ${verifyForm.action} (immutable record created)` });
    setVerifyOpen(null); setVerifyForm({ action: "verified", method: "document_review", rationale: "" });
    load();
  };

  const approveDomain = async () => {
    if (!user || !domainForm.faculty_user_id) return;
    const dom = DOMAINS.find(d => d.code === domainForm.domain_code)!;
    const { error } = await supabase.from("faculty_competency_domains" as any).upsert({
      faculty_user_id: domainForm.faculty_user_id,
      domain_code: dom.code, domain_label: dom.label,
      level: domainForm.level, status: "approved",
      approved_by: user.id, approved_at: new Date().toISOString(),
    } as any, { onConflict: "faculty_user_id,domain_code" });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Domain approved" });
    setDomainOpen(false); load();
  };

  const createAssignment = async () => {
    if (!user || !asnForm.faculty_user_id || !asnForm.course_title) return;
    const { data, error } = await supabase.from("faculty_teaching_assignments" as any).insert({
      faculty_user_id: asnForm.faculty_user_id,
      course_title: asnForm.course_title, course_code: asnForm.course_code,
      domain_code: asnForm.domain_code, term_label: asnForm.term_label,
      workload_weight: Number(asnForm.workload_weight),
      state: "approved", assigned_by: user.id, assigned_at: new Date().toISOString(),
    } as any).select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    if ((data as any)?.state === "blocked") {
      toast({ title: "Auto-blocked by governance", description: (data as any).block_reason, variant: "destructive" });
    } else {
      await supabase.from("faculty_assignment_audit" as any).insert({
        assignment_id: (data as any).id, prior_state: null, new_state: "approved",
        actor_id: user.id, actor_role: "registrar", rationale: "initial assignment",
      } as any);
      toast({ title: "Assignment approved" });
    }
    setAsnOpen(false); load();
  };

  const pending = creds.filter(c => c.verification_state === "pending");
  const blocked = assignments.filter(a => a.state === "blocked").length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <Shield className="h-7 w-7 text-primary" /> Faculty Governance
      </h1>
      <p className="text-muted-foreground mb-6">Verify credentials, approve teaching domains, assign courses.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{creds.length}</div><div className="text-xs text-muted-foreground">Total credentials</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{pending.length}</div><div className="text-xs text-muted-foreground">Pending verification</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{assignments.filter(a => a.state === "active").length}</div><div className="text-xs text-muted-foreground">Active assignments</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive">{blocked}</div><div className="text-xs text-muted-foreground">Auto-blocked assignments</div></CardContent></Card>
      </div>

      <div className="flex gap-2 mb-4 border-b">
        {[
          { k: "creds", l: "Credentials" },
          { k: "domains", l: "Domains" },
          { k: "assignments", l: "Assignments" },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-4 py-2 text-sm border-b-2 ${tab === t.k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}>{t.l}</button>
        ))}
      </div>

      {tab === "creds" && (
        <Card>
          <CardHeader><CardTitle className="text-base">All credentials</CardTitle><CardDescription>Verification actions create immutable governance records.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {creds.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">None.</p> : creds.map(c => (
              <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.credential_type} · {c.issuing_institution} · faculty {c.faculty_user_id.slice(0, 8)}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={c.verification_state === "verified" ? "default" : c.verification_state === "rejected" ? "destructive" : "secondary"}>{c.verification_state}</Badge>
                  {c.verification_state === "pending" && (
                    <Dialog open={verifyOpen === c.id} onOpenChange={(o) => setVerifyOpen(o ? c.id : null)}>
                      <DialogTrigger asChild><Button size="sm" variant="outline">Review</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Review credential: {c.title}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <select className="w-full rounded-md border bg-background p-2 text-sm" value={verifyForm.action} onChange={(e) => setVerifyForm({ ...verifyForm, action: e.target.value })}>
                            <option value="verified">Verify</option>
                            <option value="rejected">Reject</option>
                            <option value="expired">Mark expired</option>
                          </select>
                          <select className="w-full rounded-md border bg-background p-2 text-sm" value={verifyForm.method} onChange={(e) => setVerifyForm({ ...verifyForm, method: e.target.value })}>
                            <option value="document_review">Document review</option>
                            <option value="issuer_contact">Direct issuer contact</option>
                            <option value="registry_lookup">Registry lookup</option>
                            <option value="attestation">Trusted attestation</option>
                          </select>
                          <Textarea rows={4} placeholder="Rationale (becomes immutable)" value={verifyForm.rationale} onChange={(e) => setVerifyForm({ ...verifyForm, rationale: e.target.value })} />
                        </div>
                        <DialogFooter><Button onClick={() => verifyCred(c.id)} disabled={!verifyForm.rationale.trim()}>Submit decision</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "domains" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><BookCheck className="h-4 w-4" /> Competency domains</CardTitle>
                <CardDescription>Approved domains unlock teaching in that subject area.</CardDescription>
              </div>
              <Dialog open={domainOpen} onOpenChange={setDomainOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Approve domain</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Approve faculty domain</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Faculty user_id (UUID)" value={domainForm.faculty_user_id} onChange={(e) => setDomainForm({ ...domainForm, faculty_user_id: e.target.value })} />
                    <select className="w-full rounded-md border bg-background p-2 text-sm" value={domainForm.domain_code} onChange={(e) => setDomainForm({ ...domainForm, domain_code: e.target.value })}>
                      {DOMAINS.map(d => <option key={d.code} value={d.code}>{d.code} — {d.label}</option>)}
                    </select>
                    <select className="w-full rounded-md border bg-background p-2 text-sm" value={domainForm.level} onChange={(e) => setDomainForm({ ...domainForm, level: e.target.value })}>
                      <option value="assistant">Assistant</option>
                      <option value="lecturer">Lecturer</option>
                      <option value="senior_lecturer">Senior Lecturer</option>
                      <option value="professor">Professor</option>
                    </select>
                  </div>
                  <DialogFooter><Button onClick={approveDomain}>Approve</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {domains.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No domain approvals yet.</p> : domains.map(d => (
              <div key={d.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium">{d.domain_label}</div>
                  <div className="text-xs text-muted-foreground">{d.domain_code} · {d.level} · faculty {d.faculty_user_id.slice(0, 8)}</div>
                </div>
                <Badge variant={d.status === "approved" ? "default" : "secondary"}>{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "assignments" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Teaching assignments</CardTitle>
                <CardDescription>Gated by verified credentials + approved domain. Auto-blocked otherwise.</CardDescription>
              </div>
              <Dialog open={asnOpen} onOpenChange={setAsnOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> New assignment</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign faculty to a course</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Faculty user_id (UUID)" value={asnForm.faculty_user_id} onChange={(e) => setAsnForm({ ...asnForm, faculty_user_id: e.target.value })} />
                    <Input placeholder="Course title" value={asnForm.course_title} onChange={(e) => setAsnForm({ ...asnForm, course_title: e.target.value })} />
                    <Input placeholder="Course code" value={asnForm.course_code} onChange={(e) => setAsnForm({ ...asnForm, course_code: e.target.value })} />
                    <select className="w-full rounded-md border bg-background p-2 text-sm" value={asnForm.domain_code} onChange={(e) => setAsnForm({ ...asnForm, domain_code: e.target.value })}>
                      {DOMAINS.map(d => <option key={d.code} value={d.code}>{d.code} — {d.label}</option>)}
                    </select>
                    <Input placeholder="Term label (e.g. 2026 Spring)" value={asnForm.term_label} onChange={(e) => setAsnForm({ ...asnForm, term_label: e.target.value })} />
                    <Input type="number" step="0.1" placeholder="Workload weight" value={asnForm.workload_weight} onChange={(e) => setAsnForm({ ...asnForm, workload_weight: e.target.value })} />
                  </div>
                  <DialogFooter><Button onClick={createAssignment}>Create (governance-gated)</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No assignments.</p> : assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium">{a.course_title} <span className="text-xs text-muted-foreground">({a.course_code || "—"})</span></div>
                  <div className="text-xs text-muted-foreground">{a.term_label} · {a.domain_code} · weight {a.workload_weight}</div>
                  {a.block_reason && <div className="text-xs text-destructive">Blocked: {a.block_reason}</div>}
                </div>
                <Badge variant={a.state === "active" ? "default" : a.state === "blocked" ? "destructive" : "secondary"}>{a.state}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FacultyGovernanceAdmin;
