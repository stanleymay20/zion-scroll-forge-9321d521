import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";

interface Snapshot {
  id: string;
  term_id: string;
  course_count: number;
  total_credit_hours: number;
  student_count: number;
  finalized_grade_count: number;
  mean_gpa: number | null;
  median_gpa: number | null;
  snapshot_at: string;
}

export default function FacultyLoadCenter() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("faculty_productivity_snapshots" as any)
        .select("*")
        .eq("faculty_user_id", user.id)
        .order("snapshot_at", { ascending: false })
        .limit(50);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Helmet>
        <title>My Teaching Load — Scroll University</title>
      </Helmet>
      <h1 className="font-display text-3xl text-burgundy mb-2">My Teaching Load</h1>
      <p className="text-muted-foreground mb-6">
        Append-only snapshots of your courses, credit hours, and graded outcomes.
        GPA aggregates suppressed for cohorts under 5 students.
      </p>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No productivity snapshots issued yet for your record.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Snapshot · {new Date(r.snapshot_at).toLocaleDateString()}</span>
                  <Badge variant="secondary">{r.course_count} courses</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><div className="text-muted-foreground">Credit Hours</div><div className="font-semibold">{Number(r.total_credit_hours).toFixed(1)}</div></div>
                <div><div className="text-muted-foreground">Students</div><div className="font-semibold">{r.student_count}</div></div>
                <div><div className="text-muted-foreground">Finalized Grades</div><div className="font-semibold">{r.finalized_grade_count}</div></div>
                <div><div className="text-muted-foreground">Mean GPA</div><div className="font-semibold">{r.mean_gpa ?? "—"}</div></div>
                <div><div className="text-muted-foreground">Median GPA</div><div className="font-semibold">{r.median_gpa ?? "—"}</div></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
