import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

type Program = { id: string; title: string | null; name?: string | null };
type Readiness = {
  program_id: string;
  readiness_score: number;
  accreditation_ready: boolean;
  controls: Record<string, boolean>;
  evidence: { total: number; verified: number; expired: number; missing_types: string[] };
  faculty_credential_gaps: number;
  expired_reviews: number;
};

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-sm">
    {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
    <span>{label}</span>
  </div>
);

const AccreditationReadinessAdmin = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Accreditation Readiness — Admin";
    (async () => {
      const { data } = await supabase
        .from("degree_programs")
        .select("id,title,name")
        .order("title", { ascending: true });
      const list = (data ?? []) as Program[];
      setPrograms(list);
      if (list[0]) setSelected(list[0].id);
    })();
  }, []);

  const run = async (programId: string) => {
    setLoading(true);
    setReadiness(null);
    const { data, error } = await supabase.rpc("accreditation_readiness", { _program_id: programId });
    if (!error) setReadiness(data as unknown as Readiness);
    setLoading(false);
  };

  useEffect(() => {
    if (selected) run(selected);
  }, [selected]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Accreditation Readiness</h1>
        <p className="text-muted-foreground">
          Every claim shown publicly must map to verified evidence. A program is only "Accreditation Ready"
          when all controls pass and no reviews are expired.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Select program</CardTitle>
          {selected && (
            <Button size="sm" variant="outline" onClick={() => run(selected)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Recompute
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.title ?? p.name ?? p.id}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {loading && <Skeleton className="h-64 w-full" />}

      {readiness && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Readiness Score</span>
                <Badge variant={readiness.accreditation_ready ? "default" : "destructive"}>
                  {readiness.accreditation_ready ? "Accreditation Ready" : "Not Ready"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{readiness.readiness_score}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Controls</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              <Pill ok={readiness.controls.curriculum_depth_pass} label="Curriculum depth gate passes" />
              <Pill ok={readiness.controls.faculty_review_present} label="Faculty curriculum review present" />
              <Pill ok={readiness.controls.plo_data_present} label="Program learning outcomes defined" />
              <Pill ok={readiness.controls.effectiveness_review_present} label="Assessment effectiveness review verified" />
              <Pill ok={readiness.controls.evidence_completeness_ok} label="≥80% evidence verified" />
              <Pill ok={readiness.controls.no_faculty_credential_gaps} label="No faculty credential gaps" />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Evidence</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Total: <span className="font-semibold">{readiness.evidence.total}</span></div>
                <div>Verified: <span className="font-semibold">{readiness.evidence.verified}</span></div>
                <div className="text-amber-600">Expired: {readiness.evidence.expired}</div>
                {readiness.evidence.missing_types.length > 0 && (
                  <div>
                    <div className="text-destructive flex items-center gap-1 mt-2">
                      <AlertTriangle className="h-4 w-4" /> Missing evidence types
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {readiness.evidence.missing_types.map((t) => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Governance Gaps</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Faculty credential gaps: <span className="font-semibold">{readiness.faculty_credential_gaps}</span></div>
                <div>Expired reviews: <span className="font-semibold">{readiness.expired_reviews}</span></div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AccreditationReadinessAdmin;
