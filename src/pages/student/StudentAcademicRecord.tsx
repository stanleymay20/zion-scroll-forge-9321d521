import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getGpa, getMyStanding, getMyGrades } from "@/services/studentPortal";

export default function StudentAcademicRecord() {
  const gpa = useQuery({ queryKey: ["sp-gpa3"], queryFn: () => getGpa() });
  const standing = useQuery({ queryKey: ["sp-st"], queryFn: getMyStanding });
  const grades = useQuery({ queryKey: ["sp-gr"], queryFn: getMyGrades });

  if (gpa.isLoading) return <Skeleton className="h-64 w-full" />;
  const standings: any[] = (standing.data as any[]) || [];
  const grRows: any[] = (grades.data as any[]) || [];
  const distribution: Record<string, number> = {};
  grRows.forEach((g) => { if (g.letter_grade) distribution[g.letter_grade] = (distribution[g.letter_grade] || 0) + 1; });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Academic Record</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Cumulative GPA</div><div className="text-3xl font-serif">{gpa.data?.gpa?.toFixed(2) ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Credits earned</div><div className="text-3xl font-serif">{gpa.data?.credits ?? 0}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Current standing</div><div className="text-xl font-serif capitalize">{standings[0]?.standing ?? "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Grade distribution</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.keys(distribution).length === 0 ? <span className="text-sm text-muted-foreground">No grades yet.</span> :
            Object.entries(distribution).sort().map(([g, n]) => (
              <Badge key={g} variant="outline">{g}: {n}</Badge>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Standing history</CardTitle></CardHeader>
        <CardContent>
          {standings.length === 0 ? <p className="text-sm text-muted-foreground">No standings recorded.</p> : (
            <ul className="space-y-2 text-sm">
              {standings.map((s: any) => (
                <li key={s.id} className="flex justify-between border-b pb-2">
                  <span className="capitalize">{s.standing}</span>
                  <span className="text-muted-foreground">GPA {s.gpa ?? "—"} · {new Date(s.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
