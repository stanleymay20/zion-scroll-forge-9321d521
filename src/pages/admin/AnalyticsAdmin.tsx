import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Snapshot {
  id: string;
  program_label: string;
  cohort_year: number;
  cohort_size: number;
  retention_rate: number | null;
  completion_rate: number | null;
  median_gpa: number | null;
  is_publishable: boolean;
  insufficient_reason: string | null;
  computed_at: string;
}
interface RiskRow {
  id: string;
  student_id: string;
  signal_kind: string;
  severity: string;
  detail: string | null;
  detected_at: string;
  resolved_at: string | null;
}

export default function AnalyticsAdmin() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [form, setForm] = useState({ degree_id: "", cohort_year: new Date().getFullYear(), program_label: "" });

  const refresh = async () => {
    const [s, r] = await Promise.all([
      supabase.from("retention_snapshots").select("*").order("computed_at", { ascending: false }).limit(50),
      supabase.from("at_risk_signals").select("*").is("resolved_at", null).order("detected_at", { ascending: false }).limit(100),
    ]);
    setSnapshots((s.data as Snapshot[]) || []);
    setRisks((r.data as RiskRow[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  const compute = async () => {
    const { error } = await supabase.rpc("compute_retention_snapshot", {
      p_degree_id: form.degree_id || null,
      p_cohort_year: Number(form.cohort_year),
      p_label: form.program_label || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Snapshot computed"); refresh(); }
  };

  const recomputeRisk = async () => {
    const { error } = await supabase.rpc("recompute_at_risk_signals");
    if (error) toast.error(error.message);
    else { toast.success("Risk signals recomputed"); refresh(); }
  };

  const resolveRisk = async (id: string) => {
    const note = prompt("Resolution note:");
    if (!note) return;
    const { error } = await supabase.from("at_risk_signals")
      .update({ resolved_at: new Date().toISOString(), resolution_note: note })
      .eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="font-serif text-4xl">Institutional Analytics</h1>
      <p className="text-muted-foreground">
        Cohort retention and risk intelligence. Snapshots from cohorts smaller than 10 are stored but never marked publishable.
      </p>

      <Tabs defaultValue="retention">
        <TabsList>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="risk">At-Risk Signals</TabsTrigger>
        </TabsList>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Compute Snapshot</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div><Label>Degree ID (optional)</Label><Input value={form.degree_id} onChange={e => setForm({ ...form, degree_id: e.target.value })} placeholder="leave blank for all" /></div>
              <div><Label>Cohort year</Label><Input type="number" value={form.cohort_year} onChange={e => setForm({ ...form, cohort_year: Number(e.target.value) })} /></div>
              <div><Label>Program label</Label><Input value={form.program_label} onChange={e => setForm({ ...form, program_label: e.target.value })} placeholder="e.g. BTh — 2026" /></div>
              <div className="md:col-span-3"><Button onClick={compute}>Compute & store</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Snapshots</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Program</TableHead><TableHead>Year</TableHead><TableHead>N</TableHead>
                  <TableHead>Retention</TableHead><TableHead>Completion</TableHead>
                  <TableHead>Median GPA</TableHead><TableHead>Publishable</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {snapshots.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.program_label}</TableCell>
                      <TableCell>{s.cohort_year}</TableCell>
                      <TableCell>{s.cohort_size}</TableCell>
                      <TableCell>{s.retention_rate != null ? `${s.retention_rate}%` : "—"}</TableCell>
                      <TableCell>{s.completion_rate != null ? `${s.completion_rate}%` : "—"}</TableCell>
                      <TableCell>{s.median_gpa ?? "—"}</TableCell>
                      <TableCell>
                        {s.is_publishable
                          ? <Badge>Public-safe</Badge>
                          : <Badge variant="destructive">{s.insufficient_reason ?? "Withheld"}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Recompute</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={recomputeRisk}>Recompute at-risk signals</Button>
              <p className="text-xs text-muted-foreground mt-2">
                Generates auto-signals for stalled progress (&lt;25% after 30 days) and GPA risk (&lt;2.0).
                Manual signals are preserved.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Open signals</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student</TableHead><TableHead>Kind</TableHead>
                  <TableHead>Severity</TableHead><TableHead>Detail</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {risks.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.student_id.slice(0,8)}</TableCell>
                      <TableCell>{r.signal_kind}</TableCell>
                      <TableCell><Badge variant={r.severity === "high" ? "destructive" : "secondary"}>{r.severity}</Badge></TableCell>
                      <TableCell className="text-xs">{r.detail}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => resolveRisk(r.id)}>Resolve</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
