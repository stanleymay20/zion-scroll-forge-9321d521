import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Term = {
  id: string; name: string; code: string; status: string; is_active: boolean;
  starts_on: string; ends_on: string;
  add_drop_ends_on: string | null; withdraw_ends_on: string | null;
};
type Window = {
  id: string; term_id: string; tier: string; audience: string;
  open_at: string; close_at: string; max_credits: number; is_active: boolean;
};
type Util = {
  id: string; section_code: string; course_title: string;
  seat_capacity: number; enrolled_count: number; waitlist_count: number;
  section_status: string; utilization_pct: number; term_id: string;
};
type AuditRow = {
  id: string; event_kind: string; created_at: string; payload: any;
};

const RegistrarDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<Term[]>([]);
  const [windows, setWindows] = useState<Window[]>([]);
  const [util, setUtil] = useState<Util[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [totals, setTotals] = useState({ sections: 0, enrollments: 0, waitlisted: 0 });

  useEffect(() => {
    (async () => {
      const [t, w, u, a, sCount, eCount, wlCount] = await Promise.all([
        supabase.from("academic_terms").select("*").order("starts_on"),
        supabase.from("registration_windows").select("*").order("priority_order"),
        supabase.from("section_utilization_v").select("*").order("utilization_pct", { ascending: false }).limit(25),
        supabase.from("registrar_audit_log").select("*").order("created_at", { ascending: false }).limit(25),
        supabase.from("course_sections").select("id", { count: "exact", head: true }),
        supabase.from("section_enrollments").select("id", { count: "exact", head: true }).eq("status", "enrolled"),
        supabase.from("section_enrollments").select("id", { count: "exact", head: true }).eq("status", "waitlisted"),
      ]);
      setTerms((t.data as Term[]) || []);
      setWindows((w.data as Window[]) || []);
      setUtil((u.data as Util[]) || []);
      setAudit((a.data as AuditRow[]) || []);
      setTotals({
        sections: sCount.count || 0,
        enrollments: eCount.count || 0,
        waitlisted: wlCount.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const activeTerm = terms.find((t) => t.is_active);
  const openTerm = terms.find((t) => t.status === "open");

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="font-playfair text-3xl text-burgundy">Registrar Dashboard</h1>
        <p className="text-muted-foreground">Phase C — operational view of the academic calendar, registration windows, sections, and enrollment activity.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Active term</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{activeTerm?.name ?? "—"}</div>
            <Badge variant="secondary" className="mt-1">{activeTerm?.status ?? "n/a"}</Badge></CardContent></Card>
        <Card><CardHeader><CardTitle>Open for registration</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{openTerm?.name ?? "—"}</div>
            <p className="text-xs text-muted-foreground">{openTerm ? `Term begins ${openTerm.starts_on}` : ""}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Sections</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{totals.sections.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Enrolled / Waitlisted</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{totals.enrollments} / {totals.waitlisted}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Academic terms</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Term</TableHead><TableHead>Status</TableHead>
              <TableHead>Start</TableHead><TableHead>End</TableHead>
              <TableHead>Add/Drop ends</TableHead><TableHead>Withdraw ends</TableHead>
            </TableRow></TableHeader>
            <TableBody>{terms.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell><Badge variant={t.is_active ? "default" : "outline"}>{t.status}</Badge></TableCell>
                <TableCell>{t.starts_on}</TableCell><TableCell>{t.ends_on}</TableCell>
                <TableCell>{t.add_drop_ends_on ?? "—"}</TableCell>
                <TableCell>{t.withdraw_ends_on ?? "—"}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registration windows</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Term</TableHead><TableHead>Tier</TableHead><TableHead>Audience</TableHead>
              <TableHead>Opens</TableHead><TableHead>Closes</TableHead><TableHead>Max credits</TableHead>
            </TableRow></TableHeader>
            <TableBody>{windows.map((w) => {
              const t = terms.find((x) => x.id === w.term_id);
              return (
                <TableRow key={w.id}>
                  <TableCell>{t?.name ?? "—"}</TableCell>
                  <TableCell><Badge>{w.tier}</Badge></TableCell>
                  <TableCell>{w.audience}</TableCell>
                  <TableCell>{new Date(w.open_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(w.close_at).toLocaleDateString()}</TableCell>
                  <TableCell>{w.max_credits}</TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top section utilization</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Section</TableHead><TableHead>Course</TableHead>
              <TableHead>Enrolled / Cap</TableHead><TableHead>Waitlist</TableHead>
              <TableHead>Utilization</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>{util.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.section_code}</TableCell>
                <TableCell>{u.course_title}</TableCell>
                <TableCell>{u.enrolled_count}/{u.seat_capacity}</TableCell>
                <TableCell>{u.waitlist_count}</TableCell>
                <TableCell>{u.utilization_pct}%</TableCell>
                <TableCell><Badge variant={u.section_status === "full" ? "destructive" : "secondary"}>{u.section_status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent registrar events</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between border-b pb-2">
                <span><Badge variant="outline" className="mr-2">{a.event_kind}</Badge>
                  <code className="text-xs text-muted-foreground">{JSON.stringify(a.payload).slice(0, 140)}</code>
                </span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrarDashboard;
