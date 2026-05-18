import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";


interface Term { id: string; name: string; code: string | null; }
interface Row {
  id: string;
  faculty_user_id: string;
  course_count: number;
  total_credit_hours: number;
  student_count: number;
  finalized_grade_count: number;
  mean_gpa: number | null;
  median_gpa: number | null;
  snapshot_at: string;
}

export default function FacultyLoadAdmin() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("academic_terms")
        .select("id,name,code")
        .order("starts_on", { ascending: false, nullsFirst: false })
        .limit(20);
      setTerms((data as any) || []);
    })();
  }, []);

  const refresh = async (term: string) => {
    const { data } = await supabase
      .from("faculty_productivity_snapshots" as any)
      .select("*")
      .eq("term_id", term)
      .order("snapshot_at", { ascending: false })
      .limit(200);
    setRows((data as any) || []);
  };

  useEffect(() => { if (termId) refresh(termId); }, [termId]);

  const snapshot = async () => {
    if (!termId) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("snapshot_all_faculty_for_term" as any, { p_term: termId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Snapshotted ${data} faculty`);
    refresh(termId);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="font-display text-3xl text-burgundy mb-2">Faculty Load Intelligence</h1>
      <p className="text-muted-foreground mb-6">
        Term-bound productivity snapshots. Append-only and cannot be edited or deleted.
        GPA aggregates are suppressed when fewer than 5 graded students exist.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Snapshot Term</CardTitle></CardHeader>
        <CardContent className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger><SelectValue placeholder="Select academic term" /></SelectTrigger>
              <SelectContent>
                {terms.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.code ? `${t.code} — ` : ""}{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={snapshot} disabled={!termId || busy}>
            {busy ? "Snapshotting…" : "Snapshot All Faculty"}
          </Button>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {termId ? "No snapshots for this term yet." : "Choose a term."}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3 grid grid-cols-2 md:grid-cols-7 gap-3 text-sm items-center">
                <div className="col-span-2 font-mono text-xs truncate">{r.faculty_user_id}</div>
                <div><span className="text-muted-foreground">Courses </span>{r.course_count}</div>
                <div><span className="text-muted-foreground">CH </span>{Number(r.total_credit_hours).toFixed(1)}</div>
                <div><span className="text-muted-foreground">Stu </span>{r.student_count}</div>
                <div><span className="text-muted-foreground">μGPA </span>{r.mean_gpa ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.snapshot_at).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
