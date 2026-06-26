import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { getMyDegreeEnrollment, getMyStanding, getMyEnrollments } from "@/services/studentPortal";

export default function StudentProfilePage() {
  const profile = useProfile();
  const program = useQuery({ queryKey: ["sp-prog3"], queryFn: getMyDegreeEnrollment });
  const standing = useQuery({ queryKey: ["sp-st2"], queryFn: getMyStanding });
  const enr = useQuery({ queryKey: ["sp-enr2"], queryFn: getMyEnrollments });

  if (profile.isLoading) return <Skeleton className="h-64 w-full" />;
  const p: any = profile.data ?? {};
  const prog: any = program.data;
  const st: any = (standing.data as any[])?.[0];

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">My Profile</h1>

      <Card>
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Name</div>{p.full_name ?? p.display_name ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Email</div>{p.email ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Student ID</div><span className="font-mono">{p.id?.slice(0,12) ?? "—"}</span></div>
          <div><div className="text-xs text-muted-foreground">Country</div>{p.country ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Academic</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Program</div>{prog?.degree_programs?.name ?? "Not enrolled"}</div>
          <div><div className="text-xs text-muted-foreground">Current standing</div><span className="capitalize">{st?.standing ?? "—"}</span></div>
          <div><div className="text-xs text-muted-foreground">Enrolled</div>{prog?.enrolled_at ? new Date(prog.enrolled_at).toLocaleDateString() : "—"}</div>
          <div><div className="text-xs text-muted-foreground">Expected graduation</div>{prog?.expected_graduation ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Enrollment history</CardTitle></CardHeader>
        <CardContent>
          {(enr.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No enrollments yet.</p> : (
            <ul className="space-y-2 text-sm">
              {(enr.data as any[]).slice(0, 20).map((e) => (
                <li key={e.id} className="flex justify-between border-b pb-2">
                  <span className="font-mono text-xs">{e.section_id?.slice(0,8)}</span>
                  <span>{e.status} · {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
