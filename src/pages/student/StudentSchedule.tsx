import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMySchedule } from "@/services/studentPortal";

const DAYS = ["M", "T", "W", "R", "F", "S", "U"];

export default function StudentSchedule() {
  const { data, isLoading } = useQuery({ queryKey: ["sp-sched"], queryFn: getMySchedule });
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const rows: any[] = (data as any[]) || [];

  const byDay: Record<string, any[]> = {};
  DAYS.forEach((d) => (byDay[d] = []));
  rows.forEach((r) => {
    const days = (r.meets_days || "").toUpperCase().split("");
    days.forEach((d: string) => { if (byDay[d]) byDay[d].push(r); });
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">My Schedule</h1>
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {DAYS.map((d) => (
          <Card key={d}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{({M:"Mon",T:"Tue",W:"Wed",R:"Thu",F:"Fri",S:"Sat",U:"Sun"} as any)[d]}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {byDay[d].length === 0 ? <span className="text-muted-foreground">—</span> :
                byDay[d].sort((a, b) => (a.meets_start ?? "").localeCompare(b.meets_start ?? "")).map((r, i) => (
                  <div key={`${r.section_id}-${i}`} className="border-l-2 border-primary pl-2">
                    <div className="font-medium">{r.course_code}</div>
                    <div>{r.meets_start?.slice(0,5)}–{r.meets_end?.slice(0,5)}</div>
                    <div className="text-muted-foreground">{r.room ?? "TBA"}</div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming classes</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.section_id} className="flex justify-between border-b pb-2">
                <span>{r.course_code} — {r.course_title}</span>
                <span className="text-muted-foreground">{r.instructor_label ?? "TBA"} · {r.campus ?? ""} {r.room ?? ""}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
