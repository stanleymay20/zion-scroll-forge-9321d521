import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { VerifiedClaimBadge } from "@/components/trust/VerifiedClaimBadge";

const claimTypes = [
  "accreditation","faculty","curriculum","practicum","employment",
  "research","ai_tutor","infrastructure","partnership","transcript_equivalency",
];
const subjectKinds = [
  "program","course","faculty","institution","partnership","infrastructure","ai_capability",
];
const states = [
  "not_yet_verified","under_review","pilot","experimental","internal_only","verified","expired","retracted",
];

export default function PublicClaimsAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    claim_type: "curriculum",
    subject_kind: "program",
    subject_id: "",
    subject_label: "",
    statement: "",
    verification_state: "under_review",
    reviewer_role: "registrar",
    is_published: false,
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("public_claims" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setClaims((data as any[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createClaim() {
    const payload: any = { ...form, proposed_by: user?.id };
    if (form.verification_state === "verified") {
      payload.reviewer_user_id = user?.id;
      payload.verified_at = new Date().toISOString();
      payload.reviewed_at = new Date().toISOString();
    }
    if (!payload.subject_id) delete payload.subject_id;
    const { error } = await supabase.from("public_claims" as any).insert(payload);
    if (error) return toast({ title: "Insert failed", description: error.message, variant: "destructive" });
    toast({ title: "Claim created" });
    setForm({ ...form, statement: "", subject_label: "", subject_id: "" });
    load();
  }

  async function setState(id: string, st: string, publish = false) {
    const patch: any = { verification_state: st };
    if (st === "verified") {
      patch.reviewer_user_id = user?.id;
      patch.reviewed_at = new Date().toISOString();
      patch.verified_at = new Date().toISOString();
    }
    if (publish) patch.is_published = true;
    const { error } = await supabase.from("public_claims" as any).update(patch).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <h1 className="font-serif text-3xl text-primary mb-2">Public Claims Registry</h1>
      <p className="text-muted-foreground mb-6">
        Every public claim must resolve to reviewed evidence. Verification requires a reviewer attribution.
      </p>

      <Card className="mb-8">
        <CardHeader><CardTitle>Propose / create a claim</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={form.claim_type} onValueChange={(v) => setForm({ ...form, claim_type: v })}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>{claimTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.subject_kind} onValueChange={(v) => setForm({ ...form, subject_kind: v })}>
            <SelectTrigger><SelectValue placeholder="Subject kind" /></SelectTrigger>
            <SelectContent>{subjectKinds.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Subject label (public)" value={form.subject_label} onChange={(e) => setForm({ ...form, subject_label: e.target.value })} />
          <Input placeholder="Subject UUID (optional)" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Statement (no marketing puffery)" value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} />
          <Select value={form.verification_state} onValueChange={(v) => setForm({ ...form, verification_state: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{states.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Reviewer role" value={form.reviewer_role} onChange={(e) => setForm({ ...form, reviewer_role: e.target.value })} />
          <Button onClick={createClaim} disabled={!form.statement || !form.subject_label} className="md:col-span-2">
            Create claim
          </Button>
        </CardContent>
      </Card>

      <h2 className="font-serif text-xl mb-3">Existing claims</h2>
      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4 flex flex-col md:flex-row gap-3 md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{c.subject_label}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.claim_type}</span>
                    <VerifiedClaimBadge claimId={c.id} state={c.verification_state} compact />
                    {c.is_published ? (
                      <span className="text-xs text-emerald-700">published</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">draft</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.statement}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setState(c.id, "under_review")}>Review</Button>
                  <Button size="sm" onClick={() => setState(c.id, "verified", true)}>Verify & Publish</Button>
                  <Button size="sm" variant="destructive" onClick={() => setState(c.id, "retracted")}>Retract</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
