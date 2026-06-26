import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, GraduationCap, BookOpen, TrendingUp, ClipboardCheck, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getGpa, getMySchedule, getMyEnrollments, getMyStanding, getMyAttendance,
  getMyAdvisingNotes, getMyAdvisingFlags, getMyDegreeEnrollment, evaluateGraduation,
  getCurrentTerm,
} from "@/services/studentPortal";

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-serif mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function StudentDashboard() {
  const gpa = useQuery({ queryKey: ["sp-gpa"], queryFn: () => getGpa() });
  const schedule = useQuery({ queryKey: ["sp-schedule"], queryFn: getMySchedule });
  const enrollments = useQuery({ queryKey: ["sp-enr"], queryFn: getMyEnrollments });
  const standing = useQuery({ queryKey: ["sp-standing"], queryFn: getMyStanding });
  const attendance = useQuery({ queryKey: ["sp-att"], queryFn: getMyAttendance });
  const notes = useQuery({ queryKey: ["sp-notes"], queryFn: getMyAdvisingNotes });
  const flags = useQuery({ queryKey: ["sp-flags"], queryFn: getMyAdvisingFlags });
  const program = useQuery({ queryKey: ["sp-prog"], queryFn: getMyDegreeEnrollment });
  const grad = useQuery({ queryKey: ["sp-grad"], queryFn: evaluateGraduation });
  const term = useQuery({ queryKey: ["sp-term"], queryFn: getCurrentTerm });

  const loading = gpa.isLoading || program.isLoading;
  if (loading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const prog: any = program.data;
  const standingRow: any = (standing.data || [])[0];
  const att = attendance.data || [];
  const present = att.filter((r: any) => r.status === "present" || r.status === "late").length;
  const attRate = att.length ? Math.round((present / att.length) * 100) : null;
  const creditsEarned = gpa.data?.credits ?? 0;
  const creditsRequired = prog?.degree_programs?.total_credit_hours ?? prog?.credits_required ?? 120;
  const completion = creditsRequired ? Math.min(100, Math.round((creditsEarned / creditsRequired) * 100)) : 0;
  const gradObj: any = grad.data;
  const critFlags = (flags.data || []).filter((f: any) => ["high", "critical"].includes(f.severity) && f.status !== "resolved");
  const upcoming = (schedule.data || []).slice(0, 5);
  const sections = enrollments.data?.filter((e: any) => e.status === "enrolled" || e.status === "active") || [];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-4xl">Welcome back</h1>
          <p className="text-muted-foreground">
            {prog?.degree_programs?.name ?? "No active program"} · {(term.data as any)?.term_label ?? "No active term"}
          </p>
        </div>
        {gradObj?.eligible && (
          <Badge className="bg-green-600 text-white">Graduation eligible</Badge>
        )}
      </header>

      {critFlags.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <div className="font-medium">{critFlags.length} active risk alert{critFlags.length > 1 ? "s" : ""}</div>
              <Link to="/student/advising" className="text-sm underline">View advising</Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Cumulative GPA" value={gpa.data?.gpa?.toFixed(2) ?? "—"} sub={standingRow?.standing ?? ""} />
        <Stat label="Credits earned" value={creditsEarned} sub={`of ${creditsRequired}`} />
        <Stat label="Completion" value={`${completion}%`} sub="toward degree" />
        <Stat label="Attendance" value={attRate != null ? `${attRate}%` : "—"} sub={`${att.length} records`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Degree progress</CardTitle></CardHeader>
        <CardContent>
          <Progress value={completion} />
          <div className="text-xs text-muted-foreground mt-2">{creditsEarned} / {creditsRequired} credits</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Registered sections</CardTitle></CardHeader>
          <CardContent>
            {sections.length === 0 ? <p className="text-sm text-muted-foreground">No active sections.</p> : (
              <ul className="space-y-2 text-sm">
                {sections.slice(0, 6).map((s: any) => (
                  <li key={s.id} className="flex justify-between">
                    <span className="font-mono text-xs">{s.section_id?.slice(0,8)}</span>
                    <Badge variant="secondary">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/student/courses" className="text-xs underline mt-3 inline-block">View all</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Upcoming this week</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No sessions scheduled.</p> : (
              <ul className="space-y-2 text-sm">
                {upcoming.map((s: any) => (
                  <li key={s.section_id} className="flex justify-between">
                    <span>{s.course_code} — {s.course_title}</span>
                    <span className="text-muted-foreground">{s.meets_days} {s.meets_start?.slice(0,5)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Advising notes</CardTitle></CardHeader>
          <CardContent>
            {(notes.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No notes from advisors.</p> : (
              <ul className="space-y-2 text-sm">
                {(notes.data || []).slice(0, 3).map((n: any) => (
                  <li key={n.id} className="border-l-2 border-primary pl-2">
                    <p>{n.note}</p>
                    <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Graduation readiness</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Status: <Badge variant={gradObj?.eligible ? "default" : "secondary"}>{gradObj?.eligible ? "Eligible" : "Not yet"}</Badge></div>
            {gradObj?.blockers && Array.isArray(gradObj.blockers) && gradObj.blockers.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4">
                {gradObj.blockers.slice(0,3).map((b: any, i: number) => <li key={i}>{typeof b === "string" ? b : b.reason || JSON.stringify(b)}</li>)}
              </ul>
            )}
            <Link to="/student/graduation" className="text-xs underline">Full readiness report</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
