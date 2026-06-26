import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Term {
  id: string;
  code: string;
  name: string;
  term_type: string;
  starts_on: string;
  ends_on: string;
  status: string;
}
interface CreditStandard {
  id: string;
  course_id: string;
  credit_hours: number;
  contact_hours: number;
  level: string;
}

export default function AcademicCalendarAdmin() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [standards, setStandards] = useState<CreditStandard[]>([]);
  const [termForm, setTermForm] = useState({ code: "", name: "", starts_on: "", ends_on: "", term_type: "fall" });
  const [stdForm, setStdForm] = useState({ course_id: "", credit_hours: "3", contact_hours: "45", level: "undergraduate" });
  const [gradeForm, setGradeForm] = useState({
    term_id: "", student_id: "", course_id: "", credit_hours: "3",
    letter_grade: "A", grade_points: "4.0",
  });

  const refresh = async () => {
    const [t, s] = await Promise.all([
      supabase.from("academic_terms").select("*").order("starts_on", { ascending: false }),
      supabase.from("course_credit_standards").select("*").order("created_at", { ascending: false }),
    ]);
    setTerms((t.data as Term[]) || []);
    setStandards((s.data as CreditStandard[]) || []);
  };
  useEffect(() => { refresh(); }, []);

  const createTerm = async () => {
    const { error } = await supabase.from("academic_terms").insert({
      code: termForm.code,
      name: termForm.name,
      starts_on: termForm.starts_on,
      ends_on: termForm.ends_on,
      start_date: termForm.starts_on,
      end_date: termForm.ends_on,
      term_type: termForm.term_type as any,
    });
    if (error) toast.error(error.message); else { toast.success("Term created"); refresh(); }
  };

  const createStandard = async () => {
    const { error } = await supabase.from("course_credit_standards").insert({
      course_id: stdForm.course_id,
      credit_hours: Number(stdForm.credit_hours),
      contact_hours: Number(stdForm.contact_hours),
      level: stdForm.level,
    });
    if (error) toast.error(error.message); else { toast.success("Credit standard recorded"); refresh(); }
  };

  const postGrade = async () => {
    const { error } = await supabase.from("grade_records").insert({
      term_id: gradeForm.term_id,
      student_id: gradeForm.student_id,
      course_id: gradeForm.course_id,
      credit_hours: Number(gradeForm.credit_hours),
      letter_grade: gradeForm.letter_grade,
      grade_points: Number(gradeForm.grade_points),
      status: "provisional",
      posted_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message); else toast.success("Grade posted (provisional). Finalize via status update.");
  };

  const issueTranscript = async (studentId: string, kind: "official" | "unofficial") => {
    const { data: gradeRows } = await supabase.from("grade_records").select("*").eq("student_id", studentId).eq("status", "final");
    const { data: gpaRow } = await supabase.rpc("compute_student_gpa", { p_student_id: studentId });
    const row: any = Array.isArray(gpaRow) ? gpaRow[0] : gpaRow;
    const { error } = await supabase.from("official_transcripts").insert({
      student_id: studentId,
      kind,
      gpa: row?.gpa ?? row?.cumulative_gpa ?? null,
      total_credit_hours: row?.total_credit_hours ?? row?.cumulative_credits_earned ?? 0,
      snapshot: { grades: gradeRows ?? [], generated_at: new Date().toISOString() },
    });
    if (error) toast.error(error.message); else toast.success(`${kind} transcript issued`);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="font-serif text-4xl">Academic Calendar & Transcripts</h1>
      <Tabs defaultValue="terms">
        <TabsList>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="credits">Credit Standards</TabsTrigger>
          <TabsTrigger value="grades">Post Grades</TabsTrigger>
          <TabsTrigger value="transcripts">Issue Transcripts</TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card>
            <CardHeader><CardTitle>Create Term</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={termForm.code} onChange={e => setTermForm({ ...termForm, code: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={termForm.name} onChange={e => setTermForm({ ...termForm, name: e.target.value })} /></div>
              <div><Label>Starts</Label><Input type="date" value={termForm.starts_on} onChange={e => setTermForm({ ...termForm, starts_on: e.target.value })} /></div>
              <div><Label>Ends</Label><Input type="date" value={termForm.ends_on} onChange={e => setTermForm({ ...termForm, ends_on: e.target.value })} /></div>
              <div className="md:col-span-2"><Button onClick={createTerm}>Create term</Button></div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Existing Terms</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Window</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {terms.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono">{t.code}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.starts_on} → {t.ends_on}</TableCell>
                      <TableCell><Badge>{t.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits">
          <Card>
            <CardHeader><CardTitle>Set Course Credit Standard</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div><Label>Course ID</Label><Input value={stdForm.course_id} onChange={e => setStdForm({ ...stdForm, course_id: e.target.value })} /></div>
              <div><Label>Level</Label><Input value={stdForm.level} onChange={e => setStdForm({ ...stdForm, level: e.target.value })} /></div>
              <div><Label>Credit hours</Label><Input value={stdForm.credit_hours} onChange={e => setStdForm({ ...stdForm, credit_hours: e.target.value })} /></div>
              <div><Label>Contact hours</Label><Input value={stdForm.contact_hours} onChange={e => setStdForm({ ...stdForm, contact_hours: e.target.value })} /></div>
              <div className="md:col-span-2"><Button onClick={createStandard}>Record standard</Button></div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Standards on File</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Level</TableHead><TableHead>Credit hrs</TableHead><TableHead>Contact hrs</TableHead></TableRow></TableHeader>
                <TableBody>
                  {standards.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.course_id.slice(0,8)}</TableCell>
                      <TableCell>{s.level}</TableCell>
                      <TableCell>{s.credit_hours}</TableCell>
                      <TableCell>{s.contact_hours}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader><CardTitle>Post Grade</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <div><Label>Term ID</Label><Input value={gradeForm.term_id} onChange={e => setGradeForm({ ...gradeForm, term_id: e.target.value })} /></div>
              <div><Label>Student ID</Label><Input value={gradeForm.student_id} onChange={e => setGradeForm({ ...gradeForm, student_id: e.target.value })} /></div>
              <div><Label>Course ID</Label><Input value={gradeForm.course_id} onChange={e => setGradeForm({ ...gradeForm, course_id: e.target.value })} /></div>
              <div><Label>Credit hours</Label><Input value={gradeForm.credit_hours} onChange={e => setGradeForm({ ...gradeForm, credit_hours: e.target.value })} /></div>
              <div><Label>Letter grade</Label><Input value={gradeForm.letter_grade} onChange={e => setGradeForm({ ...gradeForm, letter_grade: e.target.value })} /></div>
              <div><Label>Grade points</Label><Input value={gradeForm.grade_points} onChange={e => setGradeForm({ ...gradeForm, grade_points: e.target.value })} /></div>
              <div className="md:col-span-2"><Button onClick={postGrade}>Post provisional grade</Button></div>
              <p className="md:col-span-2 text-xs text-muted-foreground">
                Provisional grades remain editable. Finalize via the database to make them immutable for audit.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcripts">
          <Card>
            <CardHeader><CardTitle>Issue Transcript</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Student ID</Label>
              <Input id="tx-student" placeholder="Student UUID" />
              <div className="flex gap-2">
                <Button onClick={() => {
                  const v = (document.getElementById("tx-student") as HTMLInputElement).value;
                  if (v) issueTranscript(v, "unofficial");
                }}>Issue Unofficial</Button>
                <Button variant="default" onClick={() => {
                  const v = (document.getElementById("tx-student") as HTMLInputElement).value;
                  if (v) issueTranscript(v, "official");
                }}>Issue Official</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Transcripts snapshot finalized grades and current GPA. Once issued, they are immutable (revocation only).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
