import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PlayCircle, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Stage = {
  id: string;
  stage: string;
  stage_order: number;
  rows_touched: number;
  duration_ms: number;
  errors: number;
  detail: Record<string, unknown>;
};

type Run = {
  id: string;
  label: string;
  student_count: number;
  status: string;
  verdict: string | null;
  duration_ms: number | null;
  totals: Record<string, number>;
  integrity: Record<string, number>;
  blockers: Array<Record<string, unknown>>;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
};

const VERDICT_STYLE: Record<string, string> = {
  ready_limited_prod: "bg-emerald-100 text-emerald-900 border-emerald-300",
  ready_pilot:        "bg-amber-100  text-amber-900  border-amber-300",
  needs_stabilization:"bg-red-100    text-red-900    border-red-300",
};

export default function CohortSimulationPage() {
  const [size, setSize] = useState(100);
  const [label, setLabel] = useState("");
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);

  async function loadRuns() {
    const { data } = await supabase
      .from("cohort_simulation_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(25);
    setRuns((data ?? []) as Run[]);
    if (data?.[0] && !selected) selectRun(data[0] as Run);
  }

  async function selectRun(r: Run) {
    setSelected(r);
    const { data } = await supabase
      .from("cohort_simulation_stage_metrics")
      .select("*")
      .eq("run_id", r.id)
      .order("stage_order");
    setStages((data ?? []) as Stage[]);
  }

  useEffect(() => { loadRuns(); }, []);

  async function runSimulation() {
    if (size > 1000) {
      toast.error("10k+ runs are reserved for targeted load testing, not full lifecycle.");
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("cohort-simulation", {
        body: { size, label: label || undefined },
      });
      if (error) throw error;
      toast.success(`Simulation complete: ${data?.run?.verdict ?? "no verdict"}`);
      await loadRuns();
      if (data?.run_id) {
        const r = (await supabase.from("cohort_simulation_runs").select("*").eq("id", data.run_id).single()).data as Run;
        if (r) selectRun(r);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Simulation failed");
    } finally {
      setRunning(false);
    }
  }

  async function cleanup(runId: string) {
    if (!confirm("Delete all synthetic students and cascaded rows for this run?")) return;
    const { data, error } = await supabase.functions.invoke("cohort-simulation", {
      body: { cleanup: true, run_id: runId },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${data?.deleted ?? 0} synthetic users`);
    await loadRuns();
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cohort Simulation</h1>
          <p className="text-muted-foreground mt-1">
            Drives the full academic lifecycle through real production RPCs and reports a readiness verdict.
          </p>
        </div>
        <Card className="w-full md:w-auto">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="size">Student count</Label>
              <Input id="size" type="number" min={1} max={1000} value={size}
                onChange={(e) => setSize(Number(e.target.value))} className="w-32" />
            </div>
            <div>
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. phase-c-100-smoke" className="w-72" />
            </div>
            <Button onClick={runSimulation} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Run simulation
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-auto">
            {runs.length === 0 && <div className="text-sm text-muted-foreground">No runs yet.</div>}
            {runs.map((r) => (
              <button key={r.id}
                onClick={() => selectRun(r)}
                className={`w-full text-left p-3 rounded-md border hover:bg-accent transition ${
                  selected?.id === r.id ? "bg-accent border-primary" : ""
                }`}>
                <div className="font-medium text-sm truncate">{r.label}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{r.student_count} students</span>
                  {r.verdict && (
                    <Badge variant="outline" className={VERDICT_STYLE[r.verdict] ?? ""}>
                      {r.verdict.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!selected && <Card><CardContent className="p-6 text-muted-foreground">Select or run a simulation.</CardContent></Card>}
          {selected && <RunDetail run={selected} stages={stages} onCleanup={() => cleanup(selected.id)} />}
        </div>
      </div>
    </div>
  );
}

function RunDetail({ run, stages, onCleanup }: { run: Run; stages: Stage[]; onCleanup: () => void }) {
  const Icon = run.verdict === "ready_limited_prod" ? CheckCircle2
             : run.verdict === "ready_pilot" ? ShieldAlert
             : AlertTriangle;
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {run.label}
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {run.student_count} students · {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"} ·
              status: {run.status}
              {run.error_message && <span className="text-destructive ml-2">· {run.error_message}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {run.verdict && (
              <Badge className={VERDICT_STYLE[run.verdict] ?? ""} variant="outline">
                {run.verdict.replace(/_/g, " ")}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onCleanup}>Cleanup synthetic users</Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-semibold mb-2">Totals</div>
            <dl className="text-sm space-y-1">
              {Object.entries(run.totals ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1">
                  <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-mono">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <div className="font-semibold mb-2">Integrity invariants</div>
            <dl className="text-sm space-y-1">
              {Object.entries(run.integrity ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1">
                  <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                  <dd className={`font-mono ${Number(v) > 0 ? "text-destructive" : "text-emerald-700"}`}>{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stage metrics</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Stage</th>
                <th className="py-2 pr-3 text-right">Rows</th>
                <th className="py-2 pr-3 text-right">Duration</th>
                <th className="py-2 pr-3 text-right">Errors</th>
                <th className="py-2 pr-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-3 font-mono">{s.stage_order}</td>
                  <td className="py-2 pr-3">{s.stage}</td>
                  <td className="py-2 pr-3 text-right font-mono">{s.rows_touched}</td>
                  <td className="py-2 pr-3 text-right font-mono">{s.duration_ms} ms</td>
                  <td className={`py-2 pr-3 text-right font-mono ${s.errors > 0 ? "text-destructive" : ""}`}>{s.errors}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground truncate max-w-md">
                    {JSON.stringify(s.detail)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {run.blockers && run.blockers.length > 0 && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-base text-destructive">Blockers</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">{JSON.stringify(run.blockers, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
