import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

type Severity = "info" | "warning" | "critical";
type Status = "open" | "acknowledged" | "resolved" | "dismissed";

interface AlertRow {
  id: string;
  check_key: string;
  severity: Severity;
  entity_type: string;
  entity_id: string | null;
  title: string;
  details_json: Record<string, unknown> | null;
  status: Status;
  detection_count: number;
  first_detected_at: string;
  last_detected_at: string;
}

const SEVERITY_VARIANT: Record<Severity, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  warning: "default",
  critical: "destructive",
};

export default function AcademicIntegrityAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<Status>("open");
  const [resolving, setResolving] = useState<AlertRow | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("academic_integrity_alerts" as any)
      .select("*")
      .order("severity", { ascending: false })
      .order("last_detected_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Failed to load alerts", description: error.message, variant: "destructive" });
    } else {
      setAlerts((data ?? []) as unknown as AlertRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-academic-integrity-audit");
      if (error) throw error;
      toast({
        title: "Audit complete",
        description: `Total findings: ${(data as any)?.total_findings ?? 0}`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Audit failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const submitResolve = async () => {
    if (!resolving) return;
    if (reason.trim().length < 10) {
      toast({ title: "Reason too short", description: "Please write at least 10 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("resolve_integrity_alert" as any, {
      p_alert_id: resolving.id,
      p_resolution_reason: reason.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Resolve failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Alert resolved" });
    setResolving(null);
    setReason("");
    await load();
  };

  const filtered = alerts.filter((a) => a.status === tab);
  const counts = {
    open: alerts.filter((a) => a.status === "open").length,
    critical: alerts.filter((a) => a.status === "open" && a.severity === "critical").length,
    warning: alerts.filter((a) => a.status === "open" && a.severity === "warning").length,
    info: alerts.filter((a) => a.status === "open" && a.severity === "info").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" /> Academic Integrity Alerts
          </h1>
          <p className="text-muted-foreground mt-1">
            Daily governance audit. Review and resolve drift before students are affected.
          </p>
        </div>
        <Button onClick={runAudit} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run audit now
        </Button>
      </div>

      {counts.critical > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{counts.critical} critical alert{counts.critical === 1 ? "" : "s"} open</AlertTitle>
          <AlertDescription>Critical findings indicate active governance violations and require Registrar review.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Open</CardDescription><CardTitle>{counts.open}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Critical</CardDescription><CardTitle className="text-destructive">{counts.critical}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Warning</CardDescription><CardTitle>{counts.warning}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Info</CardDescription><CardTitle>{counts.info}</CardTitle></CardHeader></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No alerts in this view.</CardContent></Card>
          ) : (
            filtered.map((a) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
                        <Badge variant="outline">{a.check_key}</Badge>
                        <Badge variant="outline">{a.entity_type}</Badge>
                        <span className="text-xs text-muted-foreground">×{a.detection_count}</span>
                      </div>
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <CardDescription className="text-xs">
                        First seen {new Date(a.first_detected_at).toLocaleString()} · Last seen {new Date(a.last_detected_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    {a.status === "open" || a.status === "acknowledged" ? (
                      <Button size="sm" variant="outline" onClick={() => { setResolving(a); setReason(""); }}>Resolve</Button>
                    ) : null}
                  </div>
                </CardHeader>
                {a.details_json && Object.keys(a.details_json).length > 0 && (
                  <CardContent className="pt-0">
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(a.details_json, null, 2)}</pre>
                    {a.entity_id && <p className="text-xs text-muted-foreground mt-2">Entity ID: <code>{a.entity_id}</code></p>}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve alert</DialogTitle>
            <DialogDescription>
              A written reason (10+ characters) is required and will be stored in the SUYAS audit log.
            </DialogDescription>
          </DialogHeader>
          {resolving && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{resolving.title}</div>
                <div className="text-xs text-muted-foreground">{resolving.check_key} · {resolving.entity_type}</div>
              </div>
              <Textarea
                placeholder="Describe how this finding was investigated and resolved…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button>
            <Button onClick={submitResolve} disabled={submitting || reason.trim().length < 10}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resolve alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
