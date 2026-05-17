import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle, GraduationCap, Award } from "lucide-react";

type Row = {
  standing: string | null;
  gpa: number | null;
  cumulative_gpa: number | null;
  credits_earned: number | null;
  plo_attainment_rate: number | null;
  intervention_flags: any;
  evidence_sufficient: boolean | null;
  last_calculated_at: string | null;
};

const labelFor = (s: string | null) => {
  switch (s) {
    case "honors": return { text: "Honors", icon: Award, variant: "default" as const };
    case "good": return { text: "Good Standing", icon: ShieldCheck, variant: "secondary" as const };
    case "probation": return { text: "Academic Probation", icon: AlertTriangle, variant: "destructive" as const };
    case "intervention": return { text: "Intervention Required", icon: AlertTriangle, variant: "destructive" as const };
    case "eligible_to_graduate": return { text: "Eligible to Graduate", icon: GraduationCap, variant: "default" as const };
    default: return { text: "Insufficient Evidence", icon: ShieldCheck, variant: "outline" as const };
  }
};

export const AcademicStandingCard = () => {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("student_academic_standing")
        .select("standing,gpa,cumulative_gpa,credits_earned,plo_attainment_rate,intervention_flags,evidence_sufficient,last_calculated_at")
        .order("last_calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRow(data as Row | null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Skeleton className="h-40 w-full" />;

  const meta = labelFor(row?.standing ?? null);
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" /> Academic Standing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={meta.variant}>{meta.text}</Badge>
        {!row || !row.evidence_sufficient ? (
          <p className="text-sm text-muted-foreground">
            No graded evidence yet. Standing will be computed once your first assessments are graded.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-muted-foreground">Term GPA</div><div className="font-semibold">{row.gpa?.toFixed(2) ?? "—"}</div></div>
            <div><div className="text-muted-foreground">Cumulative</div><div className="font-semibold">{row.cumulative_gpa?.toFixed(2) ?? "—"}</div></div>
            <div><div className="text-muted-foreground">Credits Earned</div><div className="font-semibold">{row.credits_earned ?? 0}</div></div>
            <div><div className="text-muted-foreground">PLO Attainment</div><div className="font-semibold">{row.plo_attainment_rate != null ? `${Math.round(row.plo_attainment_rate * 100)}%` : "—"}</div></div>
          </div>
        )}
        {Array.isArray(row?.intervention_flags) && row!.intervention_flags.length > 0 && (
          <div className="text-xs text-destructive">Flags: {row!.intervention_flags.join(", ")}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default AcademicStandingCard;
