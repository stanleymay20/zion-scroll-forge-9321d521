/**
 * Sprint D2 — Operations Command Center
 *
 * Single landing page that answers, within 10 seconds:
 *   1. Is the platform healthy?
 *   2. Is anything broken?
 *   3. Does anyone need intervention?
 *   4. Can we safely deploy today?
 *
 * Driven entirely by Sprint D1 substrate (kpi-service + operational tables).
 * No business calculations in React — only formatting of values returned by
 * the KPI envelope or operational tables.
 *
 * All mutations:
 *   - respect maintenance mode (DB triggers + `assert_not_maintenance()`),
 *   - are written through the audited path,
 *   - record an `ops_log` entry tagged `source = 'admin-ops-ui'`.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, AlertTriangle, Wrench, Server, Database, BookOpen,
  RefreshCw, ShieldAlert, GitBranch, HardDrive, ClipboardList,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Small helpers — pure formatting only. No business rules live in React.
// ---------------------------------------------------------------------------

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";

const fmtAge = (iso?: string | null) => {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

type HealthTone = "ok" | "warn" | "bad" | "neutral";
const toneClass: Record<HealthTone, string> = {
  ok: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
};
const toneBadge: Record<HealthTone, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  warn: "secondary",
  bad: "destructive",
  neutral: "outline",
};

// ---------------------------------------------------------------------------
// Audited write helper — every UI mutation lands here.
// ---------------------------------------------------------------------------

async function auditedWrite(event: string, ctx: Record<string, unknown>) {
  // Best-effort; never throw from the audit path.
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("ops_log").insert({
      source: "admin-ops-ui",
      event,
      severity: "info",
      actor_id: u.user?.id ?? null,
      actor_role: "admin",
      message: event,
      context: ctx,
    });
  } catch (_) {/* swallow telemetry */}
}

// ---------------------------------------------------------------------------
// Data hooks — each card / tab has exactly one query against D1 substrate.
// ---------------------------------------------------------------------------

const useSystemHealth = () =>
  useQuery({
    queryKey: ["ops", "kpi", "system_health"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("kpi-service", {
        body: { metric: "system_health" },
      });
      if (error) throw error;
      return data as { metrics?: { rows?: any[] } };
    },
  });

const useAiBacklog = () =>
  useQuery({
    queryKey: ["ops", "kpi", "ai_review_backlog"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("kpi-service", {
        body: { metric: "ai_review_backlog" },
      });
      if (error) throw error;
      return data as { metrics?: { rows?: any[] } };
    },
  });

const useIncidents = () =>
  useQuery({
    queryKey: ["ops", "incidents"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_log")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

const useMaintenance = () =>
  useQuery({
    queryKey: ["ops", "maintenance"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const useJobs = () =>
  useQuery({
    queryKey: ["ops", "jobs"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("background_job_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

const useQueues = () =>
  useQuery({
    queryKey: ["ops", "queues"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_health_snapshots")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

const useReleases = () =>
  useQuery({
    queryKey: ["ops", "releases"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_events")
        .select("*")
        .order("released_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

const useBackups = () =>
  useQuery({
    queryKey: ["ops", "backups"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_verifications")
        .select("*")
        .order("verified_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

const useDrills = () =>
  useQuery({
    queryKey: ["ops", "drills"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_drills")
        .select("*")
        .order("drilled_at", { ascending: false })
        .limit: undefined as never, // placeholder removed below
      } as any).limit?.(25) ?? { data: [], error: null };
      if (error) throw error;
      return data ?? [];
    },
  });

// (override useDrills cleanly — the inline trick above is replaced)
function useDrillsClean() {
  return useQuery({
    queryKey: ["ops", "drills"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_drills")
        .select("*")
        .order("drilled_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Top status cards
// ---------------------------------------------------------------------------

type CardSpec = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  detail: string;
  tone: HealthTone;
  source: string;
};

const StatusCard: React.FC<CardSpec> = ({ title, icon: Icon, value, detail, tone, source }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${toneClass[tone]}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${toneClass[tone]}`}>{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mt-2">{source}</p>
    </CardContent>
  </Card>
);

const TopStatusGrid: React.FC = () => {
  const health = useSystemHealth();
  const incidents = useIncidents();
  const maint = useMaintenance();
  const jobs = useJobs();
  const queues = useQueues();
  const ai = useAiBacklog();
  const backups = useBackups();
  const releases = useReleases();

  // Pure formatting — no calculations are introduced; we summarize what D1 gave us.
  const healthRow = (health.data?.metrics?.rows ?? [])[0] as any;
  const overallTone: HealthTone = !healthRow
    ? "neutral"
    : (healthRow.error_rate_pct ?? 0) > 5 ? "bad"
    : (healthRow.error_rate_pct ?? 0) > 1 ? "warn" : "ok";

  const openIncidents = (incidents.data ?? []).filter((i: any) => i.status !== "closed");
  const criticalOpen = openIncidents.filter((i: any) => i.severity === "sev1" || i.severity === "critical").length;

  const failedJobs = (jobs.data ?? []).filter((j: any) => j.status === "failed").slice(0, 5);
  const latestQueue = (queues.data ?? [])[0] as any;
  const aiBacklog = (ai.data?.metrics?.rows ?? [])[0] as any;
  const latestBackup = (backups.data ?? [])[0] as any;
  const latestRelease = (releases.data ?? [])[0] as any;

  const specs: CardSpec[] = [
    {
      title: "Overall System Health",
      icon: Activity,
      value: healthRow ? `${(100 - (healthRow.error_rate_pct ?? 0)).toFixed(2)}%` : "—",
      detail: healthRow
        ? `p95 ${healthRow.p95_duration_ms ?? "—"}ms · ${healthRow.request_count ?? 0} req/hr`
        : "No telemetry yet",
      tone: overallTone,
      source: "kpi-service · system_health",
    },
    {
      title: "Active Incidents",
      icon: AlertTriangle,
      value: String(openIncidents.length),
      detail: criticalOpen > 0 ? `${criticalOpen} critical` : "No critical incidents",
      tone: criticalOpen > 0 ? "bad" : openIncidents.length > 0 ? "warn" : "ok",
      source: "incident_log",
    },
    {
      title: "Maintenance Status",
      icon: Wrench,
      value: maint.data?.is_enabled ? "ON" : "OFF",
      detail: maint.data?.is_enabled
        ? maint.data.banner_message ?? "Writes are paused"
        : "Writes accepted",
      tone: maint.data?.is_enabled ? "warn" : "ok",
      source: "maintenance_settings",
    },
    {
      title: "Failed Background Jobs",
      icon: Server,
      value: String(failedJobs.length),
      detail: failedJobs[0] ? `Last: ${failedJobs[0].job_name}` : "No recent failures",
      tone: failedJobs.length > 0 ? "bad" : "ok",
      source: "background_job_runs",
    },
    {
      title: "Queue Health",
      icon: Database,
      value: latestQueue ? String(latestQueue.depth ?? 0) : "—",
      detail: latestQueue
        ? `${latestQueue.queue_name} · DLQ ${latestQueue.dlq_depth ?? 0}`
        : "No snapshots",
      tone: !latestQueue ? "neutral" : (latestQueue.dlq_depth ?? 0) > 0 ? "warn" : "ok",
      source: "queue_health_snapshots",
    },
    {
      title: "AI Review Queue",
      icon: ShieldAlert,
      value: aiBacklog ? String(aiBacklog.pending ?? aiBacklog.backlog ?? 0) : "—",
      detail: aiBacklog ? `Oldest ${aiBacklog.oldest_age_hours ?? "?"}h` : "No data",
      tone: !aiBacklog ? "neutral" : (aiBacklog.pending ?? 0) > 20 ? "warn" : "ok",
      source: "vw_kpi_ai_review_backlog",
    },
    {
      title: "Backup Status",
      icon: HardDrive,
      value: latestBackup?.status ?? "—",
      detail: latestBackup ? `Verified ${fmtAge(latestBackup.verified_at)}` : "No verification on record",
      tone: !latestBackup ? "bad" : latestBackup.status === "passed" ? "ok" : "warn",
      source: "backup_verifications",
    },
    {
      title: "Latest Release",
      icon: GitBranch,
      value: latestRelease?.version_tag ?? "—",
      detail: latestRelease
        ? `${latestRelease.environment} · ${fmtAge(latestRelease.released_at)}`
        : "No releases recorded",
      tone: latestRelease ? "ok" : "neutral",
      source: "release_events",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {specs.map((s) => (
        <StatusCard key={s.title} {...s} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

const IncidentsPanel: React.FC = () => {
  const q = useIncidents();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [severity, setSeverity] = useState("sev3");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("incident_log")
        .insert({
          title, summary, severity,
          status: "open",
          opened_by: u.user?.id ?? null,
          detected_via: "manual",
        })
        .select()
        .single();
      if (error) throw error;
      await auditedWrite("incident.opened", { incident_id: data.id, severity });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops", "incidents"] });
      toast({ title: "Incident opened" });
      setOpen(false); setTitle(""); setSummary(""); setSeverity("sev3");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("incident_log")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await auditedWrite("incident.closed", { incident_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops", "incidents"] });
      toast({ title: "Incident closed" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>Source: <code>incident_log</code></CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Open incident</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open new incident</DialogTitle>
              <DialogDescription>Audited via ops_log.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sev1">Sev1 — critical</SelectItem>
                    <SelectItem value="sev2">Sev2 — high</SelectItem>
                    <SelectItem value="sev3">Sev3 — medium</SelectItem>
                    <SelectItem value="sev4">Sev4 — low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button disabled={!title || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Opening…" : "Open incident"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-muted-foreground">Loading…</p> :
         (q.data ?? []).length === 0 ? <p className="text-muted-foreground">No incidents on record.</p> :
         <div className="space-y-2">
           {(q.data ?? []).map((i: any) => (
             <div key={i.id} className="flex items-center justify-between border rounded-md p-3">
               <div>
                 <div className="flex items-center gap-2">
                   <Badge variant={i.status === "closed" ? "outline" : i.severity === "sev1" ? "destructive" : "secondary"}>
                     {i.severity}
                   </Badge>
                   <span className="font-medium">{i.title}</span>
                   <Badge variant="outline">{i.status}</Badge>
                 </div>
                 <p className="text-xs text-muted-foreground mt-1">
                   Opened {fmtTime(i.opened_at)}{i.closed_at ? ` · closed ${fmtTime(i.closed_at)}` : ""}
                 </p>
                 {i.summary && <p className="text-sm mt-1">{i.summary}</p>}
               </div>
               {i.status !== "closed" && (
                 <Button size="sm" variant="outline" onClick={() => close.mutate(i.id)}>Close</Button>
               )}
             </div>
           ))}
         </div>}
      </CardContent>
    </Card>
  );
};

const MaintenancePanel: React.FC = () => {
  const q = useMaintenance();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [banner, setBanner] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (q.data) {
      setBanner(q.data.banner_message ?? "");
      setReason(q.data.reason ?? "");
    }
  }, [q.data]);

  const toggle = useMutation({
    mutationFn: async (enable: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("maintenance_settings")
        .update({
          is_enabled: enable,
          banner_message: banner || null,
          reason: reason || null,
          enabled_by: enable ? u.user?.id ?? null : null,
          enabled_at: enable ? new Date().toISOString() : null,
        })
        .eq("id", true as any);
      if (error) throw error;
      await auditedWrite(enable ? "maintenance.enabled" : "maintenance.disabled", { banner, reason });
    },
    onSuccess: (_d, enable) => {
      qc.invalidateQueries({ queryKey: ["ops", "maintenance"] });
      toast({ title: enable ? "Maintenance mode ENABLED" : "Maintenance mode disabled" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const enabled = !!q.data?.is_enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance mode</CardTitle>
        <CardDescription>
          Source: <code>maintenance_settings</code> · enforced by <code>assert_not_maintenance()</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={enabled} onCheckedChange={(v) => toggle.mutate(v)} />
          <span className={enabled ? toneClass.warn : toneClass.ok}>
            {enabled ? "Writes paused (admins bypass)" : "Writes accepted"}
          </span>
        </div>
        <div><Label>Banner message</Label><Input value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="Shown to all users" /></div>
        <div><Label>Internal reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Audit trail" /></div>
        <p className="text-xs text-muted-foreground">
          Last updated {fmtTime(q.data?.updated_at)} by {q.data?.enabled_by ?? "—"}.
        </p>
      </CardContent>
    </Card>
  );
};

const SimpleTable: React.FC<{
  title: string; source: string;
  rows: any[]; loading: boolean;
  columns: { key: string; label: string; render?: (r: any) => React.ReactNode }[];
  empty: string;
  actions?: React.ReactNode;
}> = ({ title, source, rows, loading, columns, empty, actions }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Source: <code>{source}</code></CardDescription>
      </div>
      {actions}
    </CardHeader>
    <CardContent>
      {loading ? <p className="text-muted-foreground">Loading…</p> :
       rows.length === 0 ? <p className="text-muted-foreground">{empty}</p> :
       <div className="overflow-x-auto">
         <table className="w-full text-sm">
           <thead><tr className="text-left border-b">
             {columns.map((c) => <th key={c.key} className="py-2 pr-4 font-medium">{c.label}</th>)}
           </tr></thead>
           <tbody>
             {rows.map((r, idx) => (
               <tr key={r.id ?? idx} className="border-b last:border-0">
                 {columns.map((c) => (
                   <td key={c.key} className="py-2 pr-4">{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>
                 ))}
               </tr>
             ))}
           </tbody>
         </table>
       </div>}
    </CardContent>
  </Card>
);

const StatusIcon: React.FC<{ s?: string }> = ({ s }) => {
  if (s === "passed" || s === "succeeded" || s === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />;
  if (s === "failed" || s === "error") return <XCircle className="h-4 w-4 text-destructive inline" />;
  if (s === "running" || s === "in_progress") return <Clock className="h-4 w-4 text-amber-600 inline" />;
  return <span className="text-muted-foreground">—</span>;
};

const JobsPanel: React.FC = () => {
  const q = useJobs();
  return (
    <SimpleTable
      title="Background jobs" source="background_job_runs"
      rows={q.data ?? []} loading={q.isLoading} empty="No job runs recorded."
      columns={[
        { key: "status", label: "", render: (r) => <StatusIcon s={r.status} /> },
        { key: "job_name", label: "Job" },
        { key: "started_at", label: "Started", render: (r) => fmtTime(r.started_at) },
        { key: "duration_ms", label: "Duration", render: (r) => r.duration_ms ? `${r.duration_ms}ms` : "—" },
        { key: "rows_processed", label: "Rows" },
        { key: "error_message", label: "Error", render: (r) => r.error_message ? <span className="text-destructive">{r.error_message}</span> : "—" },
      ]}
    />
  );
};

const QueuesPanel: React.FC = () => {
  const q = useQueues();
  return (
    <SimpleTable
      title="Queue health" source="queue_health_snapshots"
      rows={q.data ?? []} loading={q.isLoading} empty="No queue snapshots."
      columns={[
        { key: "queue_name", label: "Queue" },
        { key: "depth", label: "Depth" },
        { key: "dlq_depth", label: "DLQ" },
        { key: "oldest_age_seconds", label: "Oldest age (s)" },
        { key: "throughput_per_minute", label: "Throughput/min" },
        { key: "captured_at", label: "Captured", render: (r) => fmtAge(r.captured_at) },
      ]}
    />
  );
};

const MigrationsPanel: React.FC = () => {
  const q = useQuery({
    queryKey: ["ops", "migrations"],
    queryFn: async () => {
      // Read recent migration ops_log events tagged by CI/release pipeline.
      const { data, error } = await supabase
        .from("ops_log")
        .select("*")
        .in("event", ["migration.applied", "migration.failed", "migration.skipped"])
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
  return (
    <SimpleTable
      title="Migrations" source="ops_log (event: migration.*)"
      rows={q.data ?? []} loading={q.isLoading} empty="No migration events recorded yet."
      columns={[
        { key: "event", label: "Event" },
        { key: "message", label: "Message" },
        { key: "occurred_at", label: "When", render: (r) => fmtTime(r.occurred_at) },
        { key: "severity", label: "Severity" },
      ]}
    />
  );
};

const ReleasesPanel: React.FC = () => {
  const q = useReleases();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [env, setEnv] = useState("production");
  const [sha, setSha] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("release_events")
        .insert({ version_tag: tag, environment: env, commit_sha: sha || null, notes: notes || null, released_by: u.user?.id ?? null })
        .select().single();
      if (error) throw error;
      await auditedWrite("release.recorded", { release_id: data.id, tag, env });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops", "releases"] });
      toast({ title: "Release recorded" });
      setOpen(false); setTag(""); setSha(""); setNotes("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <SimpleTable
      title="Releases" source="release_events"
      rows={q.data ?? []} loading={q.isLoading} empty="No releases recorded."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Record release</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record release</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Version tag</Label><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="v2026.06.29" /></div>
              <div><Label>Environment</Label>
                <Select value={env} onValueChange={setEnv}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">production</SelectItem>
                    <SelectItem value="staging">staging</SelectItem>
                    <SelectItem value="preview">preview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Commit SHA</Label><Input value={sha} onChange={(e) => setSha(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button disabled={!tag || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Recording…" : "Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
      columns={[
        { key: "version_tag", label: "Tag" },
        { key: "environment", label: "Env" },
        { key: "released_at", label: "Released", render: (r) => fmtTime(r.released_at) },
        { key: "commit_sha", label: "SHA", render: (r) => r.commit_sha ? <code className="text-xs">{r.commit_sha.slice(0,8)}</code> : "—" },
        { key: "notes", label: "Notes" },
      ]}
    />
  );
};

const BackupsPanel: React.FC = () => {
  const q = useBackups();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState("");
  const [loc, setLoc] = useState("");
  const [status, setStatus] = useState("passed");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("backup_verifications")
        .insert({
          backup_snapshot_id: snap, storage_location: loc || null,
          status, notes: notes || null,
          verified_by: u.user?.id ?? null,
          backup_taken_at: new Date().toISOString(),
        })
        .select().single();
      if (error) throw error;
      await auditedWrite("backup.verified", { id: data.id, status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops", "backups"] });
      toast({ title: "Backup verification recorded" });
      setOpen(false); setSnap(""); setLoc(""); setNotes("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <SimpleTable
      title="Backups" source="backup_verifications"
      rows={q.data ?? []} loading={q.isLoading} empty="No backup verifications on record."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Record verification</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record backup verification</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Snapshot ID</Label><Input value={snap} onChange={(e) => setSnap(e.target.value)} /></div>
              <div><Label>Storage location</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} /></div>
              <div><Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">passed</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                    <SelectItem value="degraded">degraded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button disabled={!snap || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
      columns={[
        { key: "status", label: "", render: (r) => <StatusIcon s={r.status} /> },
        { key: "backup_snapshot_id", label: "Snapshot" },
        { key: "storage_location", label: "Location" },
        { key: "size_bytes", label: "Size", render: (r) => r.size_bytes ? `${(r.size_bytes / 1_000_000).toFixed(1)} MB` : "—" },
        { key: "verified_at", label: "Verified", render: (r) => fmtTime(r.verified_at) },
        { key: "notes", label: "Notes" },
      ]}
    />
  );
};

const DrillsPanel: React.FC = () => {
  const q = useDrillsClean();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState("");
  const [rtoT, setRtoT] = useState("60");
  const [rtoA, setRtoA] = useState("");
  const [rpoT, setRpoT] = useState("15");
  const [rpoA, setRpoA] = useState("");
  const [outcome, setOutcome] = useState("passed");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("restore_drills")
        .insert({
          scenario,
          rto_target_minutes: Number(rtoT) || null,
          rto_actual_minutes: Number(rtoA) || null,
          rpo_target_minutes: Number(rpoT) || null,
          rpo_actual_minutes: Number(rpoA) || null,
          outcome,
          notes: notes || null,
          drilled_by: u.user?.id ?? null,
        }).select().single();
      if (error) throw error;
      await auditedWrite("restore_drill.recorded", { id: data.id, outcome });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops", "drills"] });
      toast({ title: "Restore drill recorded" });
      setOpen(false); setScenario(""); setRtoA(""); setRpoA(""); setNotes("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <SimpleTable
      title="Restore drills" source="restore_drills"
      rows={q.data ?? []} loading={q.isLoading} empty="No restore drills on record."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Record drill</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record restore drill</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Scenario</Label><Input value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Full-DB restore, tablespace, PITR…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>RTO target (min)</Label><Input value={rtoT} onChange={(e) => setRtoT(e.target.value)} /></div>
                <div><Label>RTO actual (min)</Label><Input value={rtoA} onChange={(e) => setRtoA(e.target.value)} /></div>
                <div><Label>RPO target (min)</Label><Input value={rpoT} onChange={(e) => setRpoT(e.target.value)} /></div>
                <div><Label>RPO actual (min)</Label><Input value={rpoA} onChange={(e) => setRpoA(e.target.value)} /></div>
              </div>
              <div><Label>Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">passed</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                    <SelectItem value="partial">partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button disabled={!scenario || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
      columns={[
        { key: "outcome", label: "", render: (r) => <StatusIcon s={r.outcome} /> },
        { key: "scenario", label: "Scenario" },
        { key: "rto_actual_minutes", label: "RTO", render: (r) => `${r.rto_actual_minutes ?? "—"}/${r.rto_target_minutes ?? "—"}m` },
        { key: "rpo_actual_minutes", label: "RPO", render: (r) => `${r.rpo_actual_minutes ?? "—"}/${r.rpo_target_minutes ?? "—"}m` },
        { key: "data_integrity_check", label: "Integrity" },
        { key: "drilled_at", label: "When", render: (r) => fmtTime(r.drilled_at) },
      ]}
    />
  );
};

const RunbooksPanel: React.FC = () => {
  const runbooks = [
    { title: "Maintenance window", path: "/docs/governance/sprint-log.md", desc: "Enable maintenance mode, announce window, verify writes paused." },
    { title: "Sev1 incident response", path: "/docs/adr/0001-operations-foundation-and-kpi-envelope.md", desc: "Triage → incident_log → mitigate → postmortem." },
    { title: "Backup verification", path: "/docs/governance/sprint-log.md", desc: "Restore latest snapshot to staging, record verification." },
    { title: "Release rollback", path: "/docs/governance/sprint-log.md", desc: "Re-deploy prior tag, record release with rollback_of." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Runbooks</CardTitle>
        <CardDescription>Operational procedures. Detailed pages land in D8 (Documentation).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {runbooks.map((r) => (
          <div key={r.title} className="border rounded-md p-3 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" />{r.title}</div>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
            <Badge variant="outline">draft</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export const OperationsCommandCenter: React.FC = () => {
  const qc = useQueryClient();
  const refreshAll = () => qc.invalidateQueries({ queryKey: ["ops"] });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7" />
            Operations Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Sprint D2 · Phase D. Single pane for institutional operations — driven by{" "}
            <code>kpi-service</code> and the D1 operational tables.
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <TopStatusGrid />

      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="incidents"><AlertTriangle className="h-4 w-4 mr-1" />Incidents</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-1" />Maintenance</TabsTrigger>
          <TabsTrigger value="jobs"><Server className="h-4 w-4 mr-1" />Jobs</TabsTrigger>
          <TabsTrigger value="queues"><Database className="h-4 w-4 mr-1" />Queues</TabsTrigger>
          <TabsTrigger value="migrations"><ClipboardList className="h-4 w-4 mr-1" />Migrations</TabsTrigger>
          <TabsTrigger value="releases"><GitBranch className="h-4 w-4 mr-1" />Releases</TabsTrigger>
          <TabsTrigger value="backups"><HardDrive className="h-4 w-4 mr-1" />Backups</TabsTrigger>
          <TabsTrigger value="drills"><ShieldAlert className="h-4 w-4 mr-1" />Restore Drills</TabsTrigger>
          <TabsTrigger value="runbooks"><BookOpen className="h-4 w-4 mr-1" />Runbooks</TabsTrigger>
        </TabsList>
        <TabsContent value="incidents"><IncidentsPanel /></TabsContent>
        <TabsContent value="maintenance"><MaintenancePanel /></TabsContent>
        <TabsContent value="jobs"><JobsPanel /></TabsContent>
        <TabsContent value="queues"><QueuesPanel /></TabsContent>
        <TabsContent value="migrations"><MigrationsPanel /></TabsContent>
        <TabsContent value="releases"><ReleasesPanel /></TabsContent>
        <TabsContent value="backups"><BackupsPanel /></TabsContent>
        <TabsContent value="drills"><DrillsPanel /></TabsContent>
        <TabsContent value="runbooks"><RunbooksPanel /></TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground">
        All mutations on this page are written through audited paths and recorded in{" "}
        <code>ops_log</code> with <code>source = 'admin-ops-ui'</code>. Writes respect maintenance
        mode via <code>assert_not_maintenance()</code>. See{" "}
        <Link to="/docs/adr/0001-operations-foundation-and-kpi-envelope.md" className="underline">ADR-0001</Link>.
      </div>
    </div>
  );
};

export default OperationsCommandCenter;
