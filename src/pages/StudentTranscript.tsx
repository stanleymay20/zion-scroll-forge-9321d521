import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface GradeRow {
  id: string;
  term_id: string;
  course_id: string;
  credit_hours: number;
  letter_grade: string | null;
  grade_points: number | null;
  status: string;
  finalized_at: string | null;
}

interface OfficialTranscript {
  id: string;
  verification_code: string;
  kind: string;
  issued_at: string;
  gpa: number | null;
  total_credit_hours: number;
  revoked_at: string | null;
}

export default function StudentTranscript() {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [transcripts, setTranscripts] = useState<OfficialTranscript[]>([]);
  const [gpa, setGpa] = useState<{ gpa: number | null; total_credit_hours: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      if (!uid) { setLoading(false); return; }
      const [g, t, s] = await Promise.all([
        supabase.from("grade_records").select("*").eq("student_id", uid).order("finalized_at", { ascending: false }),
        supabase.from("official_transcripts").select("*").eq("student_id", uid).order("issued_at", { ascending: false }),
        supabase.rpc("compute_student_gpa", { p_student_id: uid }),
      ]);
      setGrades((g.data as GradeRow[]) || []);
      setTranscripts((t.data as OfficialTranscript[]) || []);
      const row = Array.isArray(s.data) ? s.data[0] : null;
      setGpa(row ? { gpa: row.gpa, total_credit_hours: row.total_credit_hours } : null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="container mx-auto py-8"><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <header>
        <h1 className="font-serif text-4xl">My Transcript</h1>
        <p className="text-muted-foreground">Standardized credit hours, finalized grades, and official transcript issuance.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Academic Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Cumulative GPA</div>
            <div className="text-3xl font-serif">{gpa?.gpa ?? "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Credit Hours (final)</div>
            <div className="text-3xl font-serif">{gpa?.total_credit_hours ?? 0}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grade Records</CardTitle></CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-muted-foreground">No grades posted yet.</p>
          ) : (
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
                {grades.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">{g.course_id.slice(0,8)}</TableCell>
                    <TableCell>{g.credit_hours}</TableCell>
                    <TableCell>{g.letter_grade ?? "—"}</TableCell>
                    <TableCell>{g.grade_points ?? "—"}</TableCell>
                    <TableCell><Badge variant={g.status === "final" ? "default" : "secondary"}>{g.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Issued Official Transcripts</CardTitle></CardHeader>
        <CardContent>
          {transcripts.length === 0 ? (
            <p className="text-muted-foreground">No official transcripts issued yet. Request one from the Registrar.</p>
          ) : (
            <div className="space-y-3">
              {transcripts.map(t => (
                <div key={t.id} className="border rounded p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium capitalize">{t.kind} transcript</div>
                    <div className="text-xs text-muted-foreground">Issued {new Date(t.issued_at).toLocaleString()}</div>
                    <div className="text-xs">Verification code: <span className="font-mono">{t.verification_code}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">GPA {t.gpa ?? "—"} · {t.total_credit_hours} cr</div>
                    {t.revoked_at && <Badge variant="destructive">Revoked</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
