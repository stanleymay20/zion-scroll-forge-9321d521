import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { runDegreeAudit } from "@/services/studentPortal";

export default function StudentDegreeAudit() {
  const { data, isLoading, error } = useQuery({ queryKey: ["sp-audit"], queryFn: runDegreeAudit });
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return <Card><CardContent className="pt-6">No active degree program. <a href="/apply" className="underline">Apply now</a>.</CardContent></Card>;
  const audit: any = (data as any).audit;
  const program: any = (data as any).program;
  const summary = audit?.summary ?? audit ?? {};
  const items: any[] = audit?.items ?? audit?.requirements ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl">Degree Audit</h1>
        <p className="text-muted-foreground">{program?.degree_programs?.name}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Completion</div><div className="text-2xl font-serif">{summary.completion_pct ?? summary.percent_complete ?? "—"}%</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Credits earned</div><div className="text-2xl font-serif">{summary.credits_earned ?? program?.credits_completed ?? 0}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Credits remaining</div><div className="text-2xl font-serif">{summary.credits_remaining ?? Math.max(0, (program?.credits_required ?? 0) - (program?.credits_completed ?? 0))}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">GPA</div><div className="text-2xl font-serif">{summary.gpa ?? program?.gpa ?? "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">Audit details unavailable.</p> : (
            <ul className="space-y-2 text-sm">
              {items.map((it, i) => (
                <li key={i} className="flex justify-between border-b pb-2">
                  <span>{it.course_code ?? it.requirement ?? it.name}</span>
                  <Badge variant={it.status === "fulfilled" || it.fulfilled ? "default" : "secondary"}>{it.status ?? (it.fulfilled ? "fulfilled" : "pending")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {summary.blockers && (
        <Card>
          <CardHeader><CardTitle>Graduation blockers</CardTitle></CardHeader>
          <CardContent><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(summary.blockers, null, 2)}</pre></CardContent>
        </Card>
      )}
    </div>
  );
}
