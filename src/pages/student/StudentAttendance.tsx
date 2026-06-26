import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyAttendance } from "@/services/studentPortal";

export default function StudentAttendance() {
  const { data, isLoading } = useQuery({ queryKey: ["sp-attendance"], queryFn: getMyAttendance });
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const rows: any[] = (data as any[]) || [];

  const bySection: Record<string, { total: number; present: number; late: number; absent: number; excused: number }> = {};
  rows.forEach((r) => {
    const sid = r.section_attendance_sessions?.section_id ?? "unknown";
    bySection[sid] ||= { total: 0, present: 0, late: 0, absent: 0, excused: 0 };
    bySection[sid].total++;
    if (r.status in bySection[sid]) (bySection[sid] as any)[r.status]++;
  });
  const totals = Object.values(bySection).reduce((a, b) => ({
    total: a.total + b.total, present: a.present + b.present, late: a.late + b.late, absent: a.absent + b.absent, excused: a.excused + b.excused,
  }), { total: 0, present: 0, late: 0, absent: 0, excused: 0 });
  const overall = totals.total ? Math.round(((totals.present + totals.late) / totals.total) * 100) : null;
  const risk = overall != null && overall < 80;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <h1 className="font-serif text-4xl">Attendance</h1>
        {risk && <Badge variant="destructive">At risk — attendance below 80%</Badge>}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Overall</div><div className="text-2xl font-serif">{overall ?? "—"}%</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Present</div><div className="text-2xl font-serif">{totals.present}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Late</div><div className="text-2xl font-serif">{totals.late}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Absent</div><div className="text-2xl font-serif">{totals.absent}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Excused</div><div className="text-2xl font-serif">{totals.excused}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By section</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(bySection).length === 0 ? <p className="text-sm text-muted-foreground">No attendance recorded.</p> : (
            <ul className="space-y-2 text-sm">
              {Object.entries(bySection).map(([sid, s]) => {
                const rate = s.total ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
                return (
                  <li key={sid} className="flex justify-between border-b pb-2">
                    <span className="font-mono text-xs">{sid.slice(0,8)}</span>
                    <span>{rate}% · {s.total} sessions</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent records</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {rows.slice(0, 20).map((r) => (
              <li key={r.id} className="flex justify-between border-b pb-2">
                <span>{r.section_attendance_sessions?.topic ?? "Session"}</span>
                <span><Badge variant="secondary">{r.status}</Badge> <span className="text-muted-foreground ml-2">{r.marked_at ? new Date(r.marked_at).toLocaleDateString() : ""}</span></span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
