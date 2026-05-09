/**
 * Oral Defenses — public archive of viva voce defenses for Supreme Degrees.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, ExternalLink, Hourglass, ShieldCheck, Calendar } from "lucide-react";

interface Defense {
  id: string;
  candidate_name: string;
  degree_title: string;
  faculty_area: string;
  examiner_names: string[];
  defense_date: string;
  status: string;
  recording_url: string | null;
  scrollchain_hash: string | null;
  abstract: string | null;
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  passed: { label: "Passed", cls: "bg-green-100 text-green-800" },
  passed_with_distinction: { label: "Passed with Distinction", cls: "bg-amber-100 text-amber-800" },
};

export default function OralDefenses() {
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("oral_defenses")
        .select("*")
        .in("status", ["passed", "passed_with_distinction"])
        .eq("is_public", true)
        .order("defense_date", { ascending: false });
      setDefenses((data as Defense[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Oral Defense Archive | Scroll University</title>
        <meta name="description" content="Public archive of viva voce oral defenses for Supreme Degree candidates, recorded and notarized on ScrollChain." />
        <link rel="canonical" href="https://scrolluniversity.org/oral-defenses" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="max-w-3xl space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Mic className="h-8 w-8" />
            <Badge variant="outline">Oral Defense Layer</Badge>
          </div>
          <h1 className="font-serif text-4xl font-bold">Live faculty viva. Recorded. Verifiable.</h1>
          <p className="text-muted-foreground leading-relaxed">
            Every Supreme Degree candidate must defend their work live before a panel of named faculty
            examiners. Each defense is recorded, the outcome is logged immutably to ScrollChain, and
            successful defenses appear here publicly.
          </p>
        </section>

        {loading ? (
          <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        ) : defenses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <Hourglass className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-serif text-xl font-semibold">No public defenses yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                The viva voce panel is being assembled. Defenses will be scheduled once Supreme Degree
                candidates reach the qualifying threshold. All passed defenses will appear here with
                examiner names and ScrollChain verification.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {defenses.map((d) => {
              const meta = statusLabel[d.status] || { label: d.status, cls: "" };
              return (
                <Card key={d.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{d.faculty_area}</Badge>
                      <Badge className={meta.cls} variant="outline">{meta.label}</Badge>
                    </div>
                    <CardTitle className="font-serif text-xl mt-2">{d.candidate_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{d.degree_title}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(d.defense_date).toLocaleDateString()}</span>
                      {d.scrollchain_hash && (
                        <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> ScrollChain verified</span>
                      )}
                    </div>
                    {d.examiner_names?.length > 0 && (
                      <p className="text-muted-foreground"><strong>Examiners:</strong> {d.examiner_names.join(", ")}</p>
                    )}
                    {d.abstract && <p className="text-muted-foreground">{d.abstract}</p>}
                    {d.recording_url && (
                      <Button asChild variant="outline" size="sm">
                        <a href={d.recording_url} target="_blank" rel="noopener noreferrer">
                          Watch recording <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
