import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet";

export default function GraduateSuccess() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState({
    employer_name: "",
    job_title: "",
    employment_type: "Full-time",
    start_date: "",
    country: "",
  });

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("employment_verifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRecords((data as any[]) ?? []);
  }
  useEffect(() => { load(); }, [user?.id]);

  async function submit() {
    if (!user) return;
    const payload: any = { ...form, user_id: user.id, verification_state: "self_reported" };
    if (!payload.start_date) delete payload.start_date;
    const { error } = await supabase.from("employment_verifications" as any).insert(payload);
    if (error) return toast({ title: "Submit failed", description: error.message, variant: "destructive" });
    toast({ title: "Submitted", description: "Your placement is now self-reported. Registrar will reach out to verify with your employer." });
    setForm({ employer_name: "", job_title: "", employment_type: "Full-time", start_date: "", country: "" });
    load();
  }

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Helmet>
        <title>Report Your Placement · Scroll University</title>
        <meta name="description" content="Graduates can self-report employment; we will verify directly with the employer before any public statistic uses your placement." />
        <link rel="canonical" href="/graduate-success" />
      </Helmet>
      <h1 className="font-serif text-3xl text-primary mb-2">Report Your Placement</h1>
      <p className="text-muted-foreground mb-6">
        Self-reported placements never appear in public outcome metrics. They become
        eligible only after the Registrar independently verifies them with your employer.
      </p>

      <Card className="mb-8">
        <CardHeader><CardTitle>Submit a placement</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Employer</Label><Input value={form.employer_name} onChange={(e) => setForm({ ...form, employer_name: e.target.value })} /></div>
          <div><Label>Job title</Label><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
          <div><Label>Employment type</Label><Input value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} /></div>
          <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Button onClick={submit} disabled={!form.employer_name || !form.job_title}>Submit (self-reported)</Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="font-serif text-xl mb-3">Your records</h2>
      {records.length === 0 ? (
        <p className="text-muted-foreground text-sm">No records yet.</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.job_title} · {r.employer_name}</p>
                  <p className="text-xs text-muted-foreground">{r.country} · {r.start_date ?? "—"}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-muted">{r.verification_state.replace("_", " ")}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
