import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck, GraduationCap } from "lucide-react";

export default function Outcomes() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [program, setProgram] = useState<string>("all");
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cohort_outcome_metrics" as any)
        .select("*")
        .eq("is_public", true)
        .gte("verified_sample_size", 5)
        .order("cohort_year", { ascending: false });
      const rows = (data as any[]) ?? [];
      setMetrics(rows);
      const uniq = Array.from(
        new Map(rows.map((r) => [r.program_id, { id: r.program_id, name: r.program_name }])).values()
      );
      setPrograms(uniq);
    })();
  }, []);

  const filtered = program === "all" ? metrics : metrics.filter((m) => m.program_id === program);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <Helmet>
        <title>Graduate Outcomes · Scroll University</title>
        <meta
          name="description"
          content="Verified, evidence-bound graduate outcomes. Self-reported placements are excluded from public metrics."
        />
        <link rel="canonical" href="/outcomes" />
      </Helmet>

      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl text-primary">Graduate Outcomes</h1>
      </div>
      <p className="text-muted-foreground max-w-3xl mb-4">
        We only publish outcomes for cohorts with at least 5 employer-verified
        placements. Self-reported employment is excluded. Where evidence is
        insufficient, we display "Not yet verified" instead of estimated metrics.
      </p>
      <div className="flex gap-2 text-sm mb-6">
        <Link to="/employment-methodology" className="text-primary underline">
          Methodology
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/research-impact" className="text-primary underline">
          Research Impact
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/graduate-success" className="text-primary underline">
          Graduate Stories
        </Link>
      </div>

      <Select value={program} onValueChange={setProgram}>
        <SelectTrigger className="max-w-sm mb-6">
          <SelectValue placeholder="All programs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All programs</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p.id ?? p.name} value={p.id ?? p.name}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="font-medium">Not yet verified</p>
            <p className="text-sm max-w-md mx-auto">
              No cohort has reached the minimum verified sample size yet. We will
              not display estimated outcomes for small or unverified cohorts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m) => {
            const verifiedRate = m.total_graduates
              ? Math.round((m.employer_verified_count / m.total_graduates) * 100)
              : 0;
            const fieldRate = m.employer_verified_count
              ? Math.round((m.field_aligned_count / m.employer_verified_count) * 100)
              : 0;
            return (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{m.program_name}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      Cohort {m.cohort_year}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Total graduates" value={m.total_graduates} />
                    <Metric label="Verified sample" value={m.verified_sample_size} />
                    <Metric label="Employer-verified employment" value={`${verifiedRate}%`} />
                    <Metric label="Field-aligned (of verified)" value={`${fieldRate}%`} />
                    {m.median_time_to_employment_days != null && (
                      <Metric
                        label="Median days to employment"
                        value={m.median_time_to_employment_days}
                      />
                    )}
                    <Metric label="Verified research outputs" value={m.research_outputs_count} />
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-2 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Reporting window {new Date(m.reporting_window_start).toLocaleDateString()} –{" "}
                    {new Date(m.reporting_window_end).toLocaleDateString()}
                  </p>
                  {m.methodology_notes && (
                    <p className="text-xs italic text-muted-foreground">
                      {m.methodology_notes}
                    </p>
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

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-serif text-xl text-primary">{value ?? "—"}</p>
    </div>
  );
}
