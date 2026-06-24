/**
 * Pedagogy Remediation Admin
 * Surfaces every module failing the hardened QualityGates evaluator and
 * lets admins trigger AI-powered remediation per-module or in batches.
 */
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldAlert, ShieldCheck, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ModuleRow {
  id: string;
  title: string;
  course_id: string;
  progression_level: number | null;
  content_char_count: number | null;
  quality_verified: boolean;
  quality_issues: string[];
  courses?: { title: string | null } | null;
}

interface IssueAggregate {
  issue: string;
  count: number;
}

const ISSUE_LABEL: Record<string, string> = {
  content_too_thin: "Thin content",
  flow_markers_missing: "6-step flow missing",
  objective_templated: "Templated objectives",
  quiz_insufficient: "Quiz < 5 questions",
  quiz_untagged: "Quiz untagged",
  tutor_context_missing: "No tutor context",
  no_clo_mapping: "No CLO mapping",
  reflective_prompt_missing: "No reflective prompt",
  formative_checkpoints_missing: "No formative checkpoints",
  no_objectives: "No objectives",
  module_not_found: "Module not found",
};

export default function PedagogyRemediationAdmin() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [aggregates, setAggregates] = useState<IssueAggregate[]>([]);
  const [totals, setTotals] = useState<{ passing: number; failing: number }>({ passing: 0, failing: 0 });
  const [loading, setLoading] = useState(true);
  const [remediating, setRemediating] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { count: pass }, { count: fail }] = await Promise.all([
      supabase
        .from("course_modules")
        .select("id,title,course_id,progression_level,content_char_count,quality_verified,quality_issues,courses(title)")
        .eq("quality_verified", false)
        .order("course_id")
        .limit(200),
      supabase.from("course_modules").select("*", { count: "exact", head: true }).eq("quality_verified", true),
      supabase.from("course_modules").select("*", { count: "exact", head: true }).eq("quality_verified", false),
    ]);
    setModules((rows as ModuleRow[]) ?? []);
    setTotals({ passing: pass ?? 0, failing: fail ?? 0 });

    // Aggregate issue counts from the loaded sample (live counts)
    const { data: agg } = await supabase.rpc("array_agg_issues" as any).select?.() ?? { data: null };
    if (!agg) {
      // Fallback: compute client-side aggregation across loaded rows
      const map = new Map<string, number>();
      (rows as ModuleRow[] | null)?.forEach((m) =>
        (m.quality_issues ?? []).forEach((i) => map.set(i, (map.get(i) ?? 0) + 1)),
      );
      setAggregates([...map.entries()].map(([issue, count]) => ({ issue, count })).sort((a, b) => b.count - a.count));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remediateOne = async (id: string) => {
    setRemediating(id);
    const { data, error } = await supabase.functions.invoke("remediate-module-pedagogy", {
      body: { module_id: id },
    });
    setRemediating(null);
    if (error) {
      toast({ title: "Remediation failed", description: error.message, variant: "destructive" });
      return;
    }
    const result = (data as any)?.results?.[0];
    toast({
      title: result?.status === "remediated" ? "Module remediated" : "Remediation issue",
      description: result?.status === "remediated"
        ? `Wrote ${result.chars} chars + ${result.questions} questions`
        : result?.error ?? result?.status ?? "Unknown result",
      variant: result?.status === "remediated" ? "default" : "destructive",
    });
    if (result?.status === "remediated") load();
  };

  const remediateBatch = async (limit: number) => {
    setBatchRunning(true);
    const { data, error } = await supabase.functions.invoke("remediate-module-pedagogy", {
      body: { limit },
    });
    setBatchRunning(false);
    if (error) {
      toast({ title: "Batch failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Batch queued",
      description: (data as any)?.message ?? `Queued ${(data as any)?.queued ?? limit} modules`,
    });
    setTimeout(load, 8000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Helmet>
        <title>Pedagogy Remediation | ScrollUniversity Admin</title>
        <meta name="description" content="Audit and remediate modules failing the ScrollUniversity pedagogy quality gate." />
      </Helmet>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif">Pedagogy Remediation</h1>
          <p className="text-muted-foreground mt-1">
            Modules failing the hardened QualityGates evaluator. AI remediation rewrites objectives, content,
            tutor context, reflective prompt, formative checkpoints, and quiz questions in one pass.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Passing</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-3xl font-bold">{totals.passing}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Failing</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <span className="text-3xl font-bold">{totals.failing}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Batch remediate</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => remediateBatch(5)} disabled={batchRunning} size="sm">
              {batchRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />} 5
            </Button>
            <Button onClick={() => remediateBatch(20)} disabled={batchRunning} size="sm" variant="secondary">
              20
            </Button>
            <Button onClick={() => remediateBatch(50)} disabled={batchRunning} size="sm" variant="secondary">
              50
            </Button>
          </CardContent>
        </Card>
      </div>

      {aggregates.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Top issues (current page sample)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {aggregates.map((a) => (
                <Badge key={a.issue} variant="outline" className="text-sm">
                  {ISSUE_LABEL[a.issue] ?? a.issue} · <span className="ml-1 font-bold">{a.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Failing modules ({modules.length} shown, max 200)</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
          ) : modules.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">No failing modules. Pedagogy gate is clean. 🎉</p>
          ) : (
            <div className="space-y-2">
              {modules.map((m) => (
                <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {m.courses?.title ?? "—"} · L{m.progression_level ?? "?"} · {m.content_char_count ?? 0} chars
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(m.quality_issues ?? []).map((i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {ISSUE_LABEL[i] ?? i}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => remediateOne(m.id)} disabled={remediating === m.id}>
                    {remediating === m.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    Remediate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
