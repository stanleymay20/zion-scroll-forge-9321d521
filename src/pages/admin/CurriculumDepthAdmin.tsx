/**
 * Curriculum Depth Admin (Phase A)
 * Lists every degree program with its computed depth score, gate status,
 * and missing requirements. Read-only — no auto-content generation.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProgramRow {
  id: string;
  title: string;
  level: string | null;
  lifecycle_status: string | null;
  is_external_facing: boolean | null;
}

interface DepthRow {
  program_id: string;
  module_count: number;
  outcomes_count: number;
  assessment_diversity: number;
  has_practicum: boolean;
  has_research: boolean;
  faculty_reviewed_courses: number;
  instructional_hours: number;
  sequencing_score: number;
  total_score: number;
  gate_passed: boolean;
  gate_reasons: string[];
  computed_at: string;
}

const reasonLabel = (r: string) =>
  r.replace(/_/g, " ").replace(/needs (\d+) /, "needs $1 ");

export default function CurriculumDepthAdmin() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [scores, setScores] = useState<Record<string, DepthRow>>({});
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: progs, error: pErr }, { data: scs }] = await Promise.all([
      supabase
        .from("degree_programs")
        .select("id,title,level,lifecycle_status,is_external_facing")
        .order("title"),
      supabase.from("curriculum_depth_scores").select("*"),
    ]);
    if (pErr) {
      toast({ title: "Failed to load programs", description: pErr.message, variant: "destructive" });
    }
    setPrograms((progs as ProgramRow[]) ?? []);
    const map: Record<string, DepthRow> = {};
    (scs ?? []).forEach((s: any) => (map[s.program_id] = s));
    setScores(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const recompute = async (programId: string) => {
    setRecomputing(programId);
    const { data, error } = await supabase.rpc("curriculum_depth_score", {
      p_program_id: programId,
    });
    setRecomputing(null);
    if (error) {
      toast({ title: "Recompute failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: (data as any)?.gate_passed ? "Depth gate passed" : "Depth gate not yet met",
      description: `Score ${(data as any)?.total_score}/100`,
    });
    load();
  };

  const summary = useMemo(() => {
    const passed = Object.values(scores).filter((s) => s.gate_passed).length;
    const total = programs.length;
    return { passed, total };
  }, [scores, programs]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Helmet>
        <title>Curriculum Depth · Admin</title>
        <meta
          name="description"
          content="Depth gate status for every degree program — modules, assessments, practicum, research, faculty review."
        />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-3xl font-serif">Curriculum Depth Gates</h1>
        <p className="text-sm text-muted-foreground">
          Programs cannot be promoted to public/external listing unless their tier-specific depth
          gate passes. Empty programs stay honestly in development.
        </p>
        <div className="text-sm">
          <Badge variant="outline">
            {summary.passed} / {summary.total} programs pass the depth gate
          </Badge>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3">
          {programs.map((p) => {
            const s = scores[p.id];
            const passed = s?.gate_passed === true;
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      {passed ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                      )}
                      {p.title}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">{p.level ?? "—"}</Badge>
                      <Badge variant={p.lifecycle_status === "active_public" ? "default" : "outline"}>
                        {p.lifecycle_status ?? "—"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => recompute(p.id)}
                        disabled={recomputing === p.id}
                      >
                        {recomputing === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {s ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <Stat label="Score" value={`${s.total_score}/100`} />
                        <Stat label="Modules" value={s.module_count} />
                        <Stat label="Outcomes" value={s.outcomes_count} />
                        <Stat label="Assess. types" value={s.assessment_diversity} />
                        <Stat label="Hours" value={s.instructional_hours} />
                        <Stat label="Faculty reviewed" value={s.faculty_reviewed_courses} />
                        <Stat label="Practicum" value={s.has_practicum ? "yes" : "no"} />
                        <Stat label="Research/Capstone" value={s.has_research ? "yes" : "no"} />
                      </div>
                      {!passed && (
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-1">
                            Cannot publish — missing:
                          </p>
                          <ul className="text-xs list-disc pl-5 text-muted-foreground">
                            {(s.gate_reasons ?? []).map((r) => (
                              <li key={r}>{reasonLabel(r)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No depth score computed yet — click refresh.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
