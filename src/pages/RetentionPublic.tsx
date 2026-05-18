import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Snapshot {
  id: string;
  program_label: string;
  cohort_year: number;
  cohort_size: number;
  retention_rate: number | null;
  completion_rate: number | null;
  median_gpa: number | null;
  computed_at: string;
}

export default function RetentionPublic() {
  const [rows, setRows] = useState<Snapshot[]>([]);
  useEffect(() => {
    supabase.from("retention_snapshots").select("*")
      .eq("is_publishable", true)
      .order("cohort_year", { ascending: false })
      .then(({ data }) => setRows((data as Snapshot[]) || []));
  }, []);

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <h1 className="font-serif text-4xl mb-2">Retention & Completion (Verified)</h1>
      <p className="text-muted-foreground mb-6">
        Published only when verified cohort size ≥ 10. Smaller cohorts are intentionally withheld to prevent
        misleading inferences. All figures derive from finalized records, not estimates.
      </p>
      <Card>
        <CardHeader><CardTitle>Public Snapshots</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">
              No cohort currently meets the minimum verified-sample threshold. We will publish results when they do.
            </p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Program</TableHead><TableHead>Year</TableHead>
                <TableHead>Cohort size</TableHead><TableHead>Retention</TableHead>
                <TableHead>Completion</TableHead><TableHead>Median GPA</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.program_label}</TableCell>
                    <TableCell>{r.cohort_year}</TableCell>
                    <TableCell>{r.cohort_size}</TableCell>
                    <TableCell>{r.retention_rate}%</TableCell>
                    <TableCell>{r.completion_rate}%</TableCell>
                    <TableCell>{r.median_gpa ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Methodology: aggregates derived directly from <code>student_degree_enrollments</code>. Median GPA from
            finalized graduate-level records. No rounding of cohort sizes; no estimation when N&lt;10.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
