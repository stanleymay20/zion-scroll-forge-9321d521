import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyOutcomeMastery } from "@/services/studentPortal";

export default function StudentOutcomes() {
  const { data, isLoading } = useQuery({ queryKey: ["sp-out"], queryFn: getMyOutcomeMastery });
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const rows: any[] = (data as any[]) || [];

  const score = (r: any) => Number(r.mastery_score ?? r.score ?? r.attainment ?? 0);
  const strengths = rows.filter((r) => score(r) >= 80).slice(0, 6);
  const gaps = rows.filter((r) => score(r) < 60).slice(0, 6);
  const avg = rows.length ? Math.round(rows.reduce((a, b) => a + score(b), 0) / rows.length) : null;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Learning Outcomes</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Outcomes tracked</div><div className="text-2xl font-serif">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Average mastery</div><div className="text-2xl font-serif">{avg ?? "—"}%</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Strengths</div><div className="text-2xl font-serif">{strengths.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All outcomes</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No outcome mastery recorded yet. Complete assessments to begin tracking.</p> : (
            <ul className="space-y-3 text-sm">
              {rows.map((r) => {
                const s = score(r);
                return (
                  <li key={r.id ?? `${r.learning_objective_id}-${r.course_id}`} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs">{(r.learning_objective_id ?? r.outcome_code ?? "").toString().slice(0,12)}</span>
                      <Badge variant={s >= 80 ? "default" : s >= 60 ? "secondary" : "destructive"}>{s}%</Badge>
                    </div>
                    <Progress value={s} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {gaps.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Areas needing improvement</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {gaps.map((r) => <li key={r.id ?? r.learning_objective_id}>· {r.learning_objective_id ?? r.outcome_code} — {score(r)}%</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
