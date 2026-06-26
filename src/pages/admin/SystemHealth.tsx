// /admin/system-health — Operational observability for Sprint 2.
// Shows: system health KPIs, recent cron executions, cron failures,
// AI output errors, AI outputs needing human review, notification volume,
// human-review queue depth, academic integrity alerts.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Activity, Bot, Bell, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type Health = Record<string, number | string | null>;
interface CronRow { id: string; job_name: string; started_at: string; finished_at: string | null; status: string; rows_processed: number | null; error_message: string | null; }
interface AiRow { id: string; feature: string; model: string | null; status: string; created_at: string; error_message: string | null; human_review_required: boolean; }

export default function SystemHealth() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [crons, setCrons] = useState<CronRow[]>([]);
  const [cronFailures, setCronFailures] = useState<CronRow[]>([]);
  const [aiErrors, setAiErrors] = useState<AiRow[]>([]);
  const [aiReview, setAiReview] = useState<AiRow[]>([]);
  const [refreshTs, setRefreshTs] = useState(Date.now());

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [h, c, cf, ae, ar] = await Promise.all([
        supabase.rpc("get_system_health"),
        supabase.from("cron_execution_log").select("*").order("started_at", { ascending: false }).limit(20),
        supabase.from("cron_execution_log").select("*").eq("status", "error").order("started_at", { ascending: false }).limit(10),
        supabase.from("ai_output_log").select("id,feature,model,status,created_at,error_message,human_review_required").eq("status", "error").order("created_at", { ascending: false }).limit(15),
        supabase.from("ai_output_log").select("id,feature,model,status,created_at,error_message,human_review_required").eq("human_review_required", true).order("created_at", { ascending: false }).limit(15),
      ]);
      if (!active) return;
      setHealth((h.data as any) ?? null);
      setCrons((c.data as any) ?? []);
      setCronFailures((cf.data as any) ?? []);
      setAiErrors((ae.data as any) ?? []);
      setAiReview((ar.data as any) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [refreshTs]);

  const kpis = [
    { label: "Cron runs (24h)", value: health?.cron_runs_24h, icon: Activity },
    { label: "Cron errors (24h)", value: health?.cron_errors_24h, icon: AlertCircle, danger: (health?.cron_errors_24h as number) > 0 },
    { label: "AI calls (24h)", value: health?.ai_calls_24h, icon: Bot },
    { label: "AI errors (24h)", value: health?.ai_errors_24h, icon: AlertCircle, danger: (health?.ai_errors_24h as number) > 0 },
    { label: "AI awaiting review", value: health?.ai_review_pending, icon: ShieldAlert, danger: (health?.ai_review_pending as number) > 0 },
    { label: "Notifications (24h)", value: health?.notifications_24h, icon: Bell },
    { label: "Integrity alerts (open)", value: health?.integrity_alerts_open, icon: ShieldAlert, danger: (health?.integrity_alerts_open as number) > 0 },
    { label: "Human-review queue", value: health?.human_review_queue_depth, icon: Clock, danger: (health?.human_review_queue_depth as number) > 0 },
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">System Health</h1>
          <p className="text-muted-foreground text-sm">Operational observability for the academic engine</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshTs(Date.now())}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className={k.danger ? "border-destructive/50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${k.danger ? "text-destructive" : "text-muted-foreground"}`} />
                  {k.danger ? <Badge variant="destructive">!</Badge> : null}
                </div>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-7 w-12" /> : (k.value ?? "—")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Cron Runs</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : crons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cron runs yet. Wrap cron jobs with cron_log_start/finish to populate.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Started</TableHead><TableHead>Status</TableHead><TableHead>Rows</TableHead></TableRow></TableHeader>
                <TableBody>
                  {crons.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.job_name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(r.started_at), "MMM d HH:mm")}</TableCell>
                      <TableCell><Badge variant={r.status === "ok" ? "secondary" : r.status === "error" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">{r.rows_processed ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-destructive">Cron Failures</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : cronFailures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failures recorded. ✅</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>When</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cronFailures.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.job_name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(r.started_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={r.error_message ?? ""}>{r.error_message ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-destructive">AI Errors</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : aiErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI errors in the last batch. ✅</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead>Model</TableHead><TableHead>When</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
                <TableBody>
                  {aiErrors.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.feature}</TableCell>
                      <TableCell className="text-xs">{r.model ?? "—"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d HH:mm")}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={r.error_message ?? ""}>{r.error_message ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>AI Outputs Awaiting Review</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : aiReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI outputs flagged for review.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead>Model</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
                <TableBody>
                  {aiReview.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.feature}</TableCell>
                      <TableCell className="text-xs">{r.model ?? "—"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
