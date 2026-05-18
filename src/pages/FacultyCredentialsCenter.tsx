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
import { Award, ShieldCheck, BookOpen, AlertTriangle } from "lucide-react";

const FacultyCredentialsCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creds, setCreds] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    credential_type: "degree", title: "", issuing_institution: "",
    field: "", level: "", issued_date: "", document_url: "", notes: "",
  });

  const load = async () => {
    if (!user) return;
    const [c, d, a] = await Promise.all([
      supabase.from("faculty_credentials" as any).select("*").eq("faculty_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("faculty_competency_domains" as any).select("*").eq("faculty_user_id", user.id),
      supabase.from("faculty_teaching_assignments" as any).select("*").eq("faculty_user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setCreds((c.data as any) || []);
    setDomains((d.data as any) || []);
    setAssignments((a.data as any) || []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const submit = async () => {
    if (!user || !form.title || !form.issuing_institution) return;
    const { error } = await supabase.from("faculty_credentials" as any).insert({
      faculty_user_id: user.id,
      credential_type: form.credential_type,
      title: form.title,
      issuing_institution: form.issuing_institution,
      field: form.field || null,
      level: form.level || null,
      issued_date: form.issued_date || null,
      document_url: form.document_url || null,
      notes: form.notes || null,
      verification_state: "pending",
    } as any);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Credential submitted for verification" });
    setOpen(false);
    setForm({ credential_type: "degree", title: "", issuing_institution: "", field: "", level: "", issued_date: "", document_url: "", notes: "" });
    load();
  };

  const verifiedCount = creds.filter(c => c.verification_state === "verified").length;
  const approvedDomains = domains.filter(d => d.status === "approved");

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-display flex items-center gap-2 mb-2">
        <Award className="h-7 w-7 text-primary" /> My Faculty Credentials
      </h1>
      <p className="text-muted-foreground mb-6">
        Submit credentials for verification. Verified credentials and approved domains unlock teaching assignments.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{verifiedCount}</div>
          <div className="text-xs text-muted-foreground">Verified credentials</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{approvedDomains.length}</div>
          <div className="text-xs text-muted-foreground">Approved teaching domains</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{assignments.filter(a => a.state === "active").length}</div>
          <div className="text-xs text-muted-foreground">Active assignments</div>
        </CardContent></Card>
      </div>

      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Verification covenant</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Self-reported credentials do not authorise you to teach.</p>
          <p>• Verified credentials become immutable governance records.</p>
          <p>• Teaching assignments are blocked unless you hold a verified credential and an approved domain match.</p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-display">Credentials</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">Submit credential</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit a credential for verification</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={form.credential_type} onChange={(e) => setForm({ ...form, credential_type: e.target.value })}>
                <option value="degree">Degree</option>
                <option value="license">License</option>
                <option value="certification">Certification</option>
                <option value="ordination">Ordination</option>
                <option value="professional_membership">Professional membership</option>
                <option value="award">Award</option>
              </select>
              <Input placeholder="Title (e.g. PhD in Theology)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Issuing institution" value={form.issuing_institution} onChange={(e) => setForm({ ...form, issuing_institution: e.target.value })} />
              <Input placeholder="Field" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
              <Input placeholder="Level (e.g. Doctoral)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              <Input type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} />
              <Input placeholder="Evidence document URL" value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
              <Textarea rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={submit}>Submit for review</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-2">
          {creds.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No credentials submitted yet.</p> : creds.map(c => (
            <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.credential_type} · {c.issuing_institution} {c.issued_date && `· ${c.issued_date}`}</div>
              </div>
              <Badge variant={c.verification_state === "verified" ? "default" : c.verification_state === "rejected" ? "destructive" : "secondary"}>
                {c.verification_state}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="text-xl font-display flex items-center gap-2 mb-3"><BookOpen className="h-5 w-5" /> Approved teaching domains</h2>
      <Card className="mb-6">
        <CardContent className="pt-6">
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No domains assigned. The registrar approves domains after credential review.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {domains.map(d => (
                <Badge key={d.id} variant={d.status === "approved" ? "default" : "outline"}>
                  {d.domain_label} · {d.level} · {d.status}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-display mb-3">Teaching assignments</h2>
      <Card>
        <CardContent className="pt-6 space-y-2">
          {assignments.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No assignments yet.</p> : assignments.map(a => (
            <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{a.course_title} <span className="text-xs text-muted-foreground">({a.course_code || "—"})</span></div>
                <div className="text-xs text-muted-foreground">{a.term_label} · domain {a.domain_code}</div>
                {a.state === "blocked" && (
                  <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" /> Blocked: {a.block_reason}
                  </div>
                )}
              </div>
              <Badge variant={a.state === "active" ? "default" : a.state === "blocked" ? "destructive" : "secondary"}>{a.state}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacultyCredentialsCenter;
