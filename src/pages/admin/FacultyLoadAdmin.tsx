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
