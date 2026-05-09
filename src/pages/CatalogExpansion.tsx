/**
 * Catalog Expansion — public progress tracker toward 1,000+ courses.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, Hourglass } from "lucide-react";

interface Row {
  id: string;
  faculty_area: string;
  current_course_count: number;
  target_course_count: number;
  notes: string | null;
}

export default function CatalogExpansion() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("catalog_expansion_progress")
        .select("*")
        .order("faculty_area");
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const totals = rows.reduce(
    (acc, r) => ({
      current: acc.current + r.current_course_count,
      target: acc.target + r.target_course_count,
    }),
    { current: 0, target: 0 }
  );
  const overallPct = totals.target > 0 ? Math.round((totals.current / totals.target) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Catalog Expansion Progress | Scroll University</title>
        <meta name="description" content="Public tracker of Scroll University's catalog growth toward 1,000+ courses across the 12 Supreme Faculties." />
        <link rel="canonical" href="https://scrolluniversity.org/catalog-expansion" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="max-w-3xl space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <LayoutGrid className="h-8 w-8" />
            <Badge variant="outline">Catalog Breadth Sprint</Badge>
          </div>
          <h1 className="font-serif text-4xl font-bold">From foundation to comprehensive university.</h1>
          <p className="text-muted-foreground leading-relaxed">
            Our 18-month goal: grow from current catalog to 1,000+ rigorous courses across the 12 Supreme
            Faculties. Progress is tracked publicly and updated as courses pass Quality Gates.
          </p>
        </section>

        {loading ? (
          <Skeleton className="h-64" />
        ) : rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <Hourglass className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-serif text-xl font-semibold">Tracker initializing</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Faculty-area baselines are being audited. The public progress tracker will populate as soon
                as initial counts and targets are confirmed by the Faculty Council.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="font-serif">Overall progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{totals.current.toLocaleString()} / {totals.target.toLocaleString()} courses</span>
                  <span className="font-semibold">{overallPct}%</span>
                </div>
                <Progress value={overallPct} className="h-3" />
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {rows.map((r) => {
                const pct = r.target_course_count > 0
                  ? Math.round((r.current_course_count / r.target_course_count) * 100)
                  : 0;
                return (
                  <Card key={r.id}>
                    <CardHeader>
                      <CardTitle className="font-serif text-lg">{r.faculty_area}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{r.current_course_count} / {r.target_course_count}</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
