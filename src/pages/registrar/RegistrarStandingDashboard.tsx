import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect as useTitleEffect } from "react";

type Bucket = { standing: string; count: number };

const ORDER = ["honors", "good", "probation", "intervention", "eligible_to_graduate", "insufficient_evidence"];

const RegistrarStandingDashboard = () => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("student_academic_standing")
        .select("standing");
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const k = r.standing ?? "insufficient_evidence";
        counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      const rows: Bucket[] = ORDER.map((s) => ({ standing: s, count: counts.get(s) ?? 0 }));
      setBuckets(rows);
      setLoading(false);
    })();
  }, []);

  useTitleEffect(() => {
    document.title = "Registrar — Academic Standing Distribution";
  }, []);

  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Academic Standing Distribution</h1>
        <p className="text-muted-foreground">Truthful counts derived from graded evidence only.</p>
      </header>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {buckets.map((b) => (
            <Card key={b.standing}>
              <CardHeader className="pb-2">
                <CardTitle className="capitalize text-base">{b.standing.replace(/_/g, " ")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{b.count}</div>
                <div className="text-xs text-muted-foreground">
                  {total > 0 ? `${Math.round((b.count / total) * 100)}% of ${total}` : "no records"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrarStandingDashboard;
