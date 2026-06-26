import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { evaluateGraduation, getGpa, getMyDegreeEnrollment } from "@/services/studentPortal";

export default function StudentGraduationReadiness() {
  const grad = useQuery({ queryKey: ["sp-grad2"], queryFn: evaluateGraduation });
  const gpa = useQuery({ queryKey: ["sp-gpa4"], queryFn: () => getGpa() });
  const prog = useQuery({ queryKey: ["sp-prog2"], queryFn: getMyDegreeEnrollment });

  if (grad.isLoading) return <Skeleton className="h-64 w-full" />;
  const g: any = grad.data ?? {};
  const blockers: any[] = Array.isArray(g.blockers) ? g.blockers : [];
  const program: any = prog.data;
  const required = program?.degree_programs?.total_credit_hours ?? program?.credits_required ?? 120;
  const remaining = Math.max(0, required - (gpa.data?.credits ?? 0));

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start flex-wrap gap-3">
        <h1 className="font-serif text-4xl">Graduation Readiness</h1>
        <Badge className={g.eligible ? "bg-green-600 text-white" : ""} variant={g.eligible ? "default" : "secondary"}>
          {g.eligible ? "Eligible to graduate" : "Not yet eligible"}
        </Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Credits remaining</div><div className="text-3xl font-serif">{remaining}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">GPA</div><div className="text-3xl font-serif">{gpa.data?.gpa?.toFixed(2) ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">PLO attainment</div><div className="text-3xl font-serif">{g.plo_attainment ?? g.plo_rate ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Application status</div><div className="text-xl font-serif">{g.application_status ?? "Not submitted"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Outstanding requirements</CardTitle></CardHeader>
        <CardContent>
          {blockers.length === 0 ? <p className="text-sm text-muted-foreground">No blockers detected.</p> : (
            <ul className="space-y-2 text-sm list-disc pl-5">
              {blockers.map((b: any, i: number) => (
                <li key={i}>{typeof b === "string" ? b : (b.reason ?? b.code ?? JSON.stringify(b))}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Capstone &amp; thesis</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Capstone status: {g.capstone_status ?? "Not started"} · Thesis status: {g.thesis_status ?? "Not started"} · Financial clearance: {g.financial_clearance ?? "Pending"}
        </CardContent>
      </Card>
    </div>
  );
}
