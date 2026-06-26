import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getMySchedule } from "@/services/studentPortal";

export default function StudentCourses() {
  const { data, isLoading } = useQuery({ queryKey: ["sp-courses"], queryFn: getMySchedule });
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const rows = (data as any[]) || [];
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">My Courses</h1>
      <Card>
        <CardHeader><CardTitle>Current schedule ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">You are not registered in any sections.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.section_id}>
                    <TableCell>
                      <div className="font-medium">{r.course_code}</div>
                      <div className="text-xs text-muted-foreground">{r.course_title}</div>
                    </TableCell>
                    <TableCell>{r.section_code}</TableCell>
                    <TableCell>{r.instructor_label ?? "TBA"}</TableCell>
                    <TableCell className="text-xs">{r.meets_days} {r.meets_start?.slice(0,5)}–{r.meets_end?.slice(0,5)}</TableCell>
                    <TableCell>{r.room ?? "TBA"}</TableCell>
                    <TableCell><Badge variant="secondary">{r.delivery_mode ?? "—"}</Badge></TableCell>
                    <TableCell>{r.credit_hours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
