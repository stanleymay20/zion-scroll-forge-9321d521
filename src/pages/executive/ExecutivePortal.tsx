import { useEffect, useMemo, useState } from "react";
import {
  ExecutiveScope,
  InstitutionalKPIs,
  getInstitutionalKPIs,
  listMyExecutiveScopes,
} from "@/services/institutionalOps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  vice_chancellor: "Vice Chancellor",
  provost: "Provost",
  registrar: "Registrar",
  dean: "Dean",
  hod: "Head of Department",
  qa_officer: "Quality Assurance Officer",
};

const SCOPE_LABEL: Record<string, string> = {
  institution: "Institution",
  faculty: "Faculty",
  department: "Department",
  program: "Program",
};

function scopeKey(s: ExecutiveScope) {
  return `${s.scope_type}:${s.scope_id}:${s.exec_role}`;
}

export default function ExecutivePortal() {
  const [scopes, setScopes] = useState<ExecutiveScope[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [kpis, setKpis] = useState<InstitutionalKPIs | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyExecutiveScopes()
      .then((rows) => {
        setScopes(rows);
        if (rows.length > 0) setSelectedKey(scopeKey(rows[0]));
      })
      .catch((e) => setError(e.message ?? String(e)));
  }, []);

  const selected = useMemo(
    () => scopes?.find((s) => scopeKey(s) === selectedKey) ?? null,
    [scopes, selectedKey]
  );

  useEffect(() => {
    if (!selected) return;
    setLoadingKpis(true);
    setError(null);
    getInstitutionalKPIs(selected.scope_type, selected.scope_id)
      .then(setKpis)
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoadingKpis(false));
  }, [selected]);

  if (scopes === null) {
    return (
      <div className="container mx-auto py-10 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (scopes.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <Alert>
          <AlertTitle>No executive scope granted</AlertTitle>
          <AlertDescription>
            You do not currently hold any executive scope (Vice Chancellor,
            Registrar, Dean, Head of Department, QA Officer, or Provost). Ask an
            administrator to grant a scope in the Executive Scopes admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif">Executive Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Single, scope-filtered view of institutional KPIs. Every metric is
            sourced from <code>get_institutional_kpis</code>; no dashboard
            recomputes filters client-side.
          </p>
        </div>
        <div className="w-full md:w-96">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger>
              <SelectValue placeholder="Select your scope" />
            </SelectTrigger>
            <SelectContent>
              {scopes.map((s) => (
                <SelectItem key={scopeKey(s)} value={scopeKey(s)}>
                  {ROLE_LABEL[s.exec_role] ?? s.exec_role} ·{" "}
                  {SCOPE_LABEL[s.scope_type]} ·{" "}
                  {s.label ?? s.scope_id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">{ROLE_LABEL[selected.exec_role]}</Badge>
          <Badge variant="outline">{SCOPE_LABEL[selected.scope_type]}</Badge>
          <span className="text-muted-foreground">
            {selected.label ?? selected.scope_id}
          </span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Cannot load KPIs</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loadingKpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!loadingKpis && kpis && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Kpi
              title="Active Enrollment"
              value={kpis.enrollment.active.toLocaleString()}
              sub={`${kpis.enrollment.total.toLocaleString()} total`}
            />
            <Kpi
              title="Average GPA"
              value={kpis.academic.avg_gpa.toFixed(2)}
              sub="Cumulative, in-scope cohort"
            />
            <Kpi
              title="Probation Rate"
              value={`${kpis.academic.probation_rate_pct.toFixed(1)}%`}
              sub="Warning + probation + suspension"
              tone={kpis.academic.probation_rate_pct > 15 ? "danger" : "ok"}
            />
            <Kpi
              title="At-Risk Students"
              value={kpis.academic.at_risk_students.toLocaleString()}
              sub="Open intervention alerts"
              tone={kpis.academic.at_risk_students > 0 ? "warn" : "ok"}
            />
            <Kpi
              title="Grade Turnaround"
              value={`${kpis.faculty.avg_grade_turnaround_hours.toFixed(1)} h`}
              sub="Mean time-to-post (180d)"
            />
            <Kpi
              title="Outcome Attainment"
              value={`${kpis.quality.outcome_attainment_pct.toFixed(1)}%`}
              sub="Cohort PLO attainment"
              tone={kpis.quality.outcome_attainment_pct < 70 ? "warn" : "ok"}
            />
            <Kpi
              title="Graduation Candidates"
              value={kpis.graduation.pending_candidates.toLocaleString()}
              sub="Pending / eligible / approved"
            />
            <Kpi
              title="Scope Footprint"
              value={`${kpis.programs_in_scope} prog`}
              sub={`${kpis.sections_in_scope} sections`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw KPI Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-x-auto bg-muted p-3 rounded">
                {JSON.stringify(kpis, null, 2)}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                Snapshot: {new Date(kpis.as_of).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({
  title,
  value,
  sub,
  tone = "ok",
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
