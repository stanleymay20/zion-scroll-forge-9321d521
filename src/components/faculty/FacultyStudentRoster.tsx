import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

interface Props {
  institutionId?: string;
}

export function FacultyStudentRoster({ institutionId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["faculty-student-roster", institutionId],
    queryFn: async () => {
      const query = (supabase as any)
        .from("enrollments")
        .select(`
          id,
          user_id,
          progress,
          status,
          created_at,
          courses(title, course_code),
          profiles:user_id(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      if (institutionId) query.eq("institution_id", institutionId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <Users className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium">No active enrollments yet</p>
        <p className="text-xs text-muted-foreground">
          Once students enroll in your courses, their progress will appear here.
        </p>
      </div>
    );
  }

  // Group by student
  const byStudent = new Map<string, any>();
  data.forEach((e: any) => {
    const key = e.user_id;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        user_id: key,
        name: e.profiles?.full_name || e.profiles?.email || "Student",
        email: e.profiles?.email,
        courses: [],
        avgProgress: 0,
      });
    }
    byStudent.get(key).courses.push(e);
  });
  const students = Array.from(byStudent.values()).map((s) => ({
    ...s,
    avgProgress: Math.round(
      s.courses.reduce((sum: number, c: any) => sum + (Number(c.progress) || 0), 0) / s.courses.length
    ),
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{students.length} students across {data.length} enrollments</p>
      {students.map((s) => (
        <div key={s.user_id} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
          <Avatar>
            <AvatarFallback>{s.name?.[0]?.toUpperCase() || "S"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{s.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {s.courses.length} course{s.courses.length === 1 ? "" : "s"} · {s.email}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={s.avgProgress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-10 text-right">{s.avgProgress}%</span>
            </div>
          </div>
          <Badge variant={s.avgProgress >= 100 ? "default" : "secondary"}>
            {s.avgProgress >= 100 ? "Complete" : "Active"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default FacultyStudentRoster;
