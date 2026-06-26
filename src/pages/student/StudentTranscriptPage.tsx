import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { generateTranscript, getMyGrades, getGpa } from "@/services/studentPortal";

export default function StudentTranscriptPage() {
  const tx = useQuery({ queryKey: ["sp-tx"], queryFn: generateTranscript });
  const grades = useQuery({ queryKey: ["sp-grades"], queryFn: getMyGrades });
  const gpa = useQuery({ queryKey: ["sp-gpa2"], queryFn: () => getGpa() });

  if (tx.isLoading || grades.isLoading) return <Skeleton className="h-64 w-full" />;
  const txData: any = tx.data;
  const rows: any[] = (grades.data as any[]) || [];

  // Group by term
  const byTerm: Record<string, any[]> = {};
  rows.forEach((r) => { (byTerm[r.term_id ?? "unknown"] ||= []).push(r); });

  return (
    <div className="space-y-6 print:bg-white">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="font-serif text-4xl">Official Transcript</h1>
          <p className="text-muted-foreground">Cumulative GPA {gpa.data?.gpa?.toFixed(2) ?? "—"} · {gpa.data?.credits ?? 0} credits earned</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </header>

      {Object.entries(byTerm).map(([termId, items]) => (
        <Card key={termId}>
          <CardHeader><CardTitle className="text-base font-mono">Term {termId.slice(0,8)}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">{g.course_id?.slice(0,8)}</TableCell>
                    <TableCell>{g.credit_hours}</TableCell>
                    <TableCell>{g.letter_grade ?? "—"}</TableCell>
                    <TableCell>{g.grade_points ?? "—"}</TableCell>
                    <TableCell>{g.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {rows.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No grades posted yet.</CardContent></Card>}

      {txData && (
        <Card>
          <CardHeader><CardTitle>Official record</CardTitle></CardHeader>
          <CardContent><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(txData, null, 2)}</pre></CardContent>
        </Card>
      )}
    </div>
  );
}
