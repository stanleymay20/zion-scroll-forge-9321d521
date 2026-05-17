import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, BookOpen } from "lucide-react";

export default function ResearchImpact() {
  const [outputs, setOutputs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("research_outputs" as any)
        .select("*")
        .eq("status", "verified")
        .order("published_date", { ascending: false })
        .limit(200);
      setOutputs((data as any[]) ?? []);
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <Helmet>
        <title>Research Impact · Scroll University</title>
        <meta name="description" content="Verified research outputs by Scroll University students and faculty." />
        <link rel="canonical" href="/research-impact" />
      </Helmet>
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl text-primary">Research Impact</h1>
      </div>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Verified research outputs only. Submissions not yet reviewed by faculty are
        not shown publicly.
      </p>

      {outputs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No verified research outputs are published yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {outputs.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between gap-3">
                  <span className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 mt-1 text-primary shrink-0" />
                    {o.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {o.output_type}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {o.venue && <p>{o.venue}</p>}
                <div className="flex gap-3 text-xs">
                  {o.published_date && (
                    <span>Published {new Date(o.published_date).toLocaleDateString()}</span>
                  )}
                  <span>Peer review: {o.peer_review_state.replace("_", " ")}</span>
                  {o.citation_count > 0 && <span>{o.citation_count} citations</span>}
                </div>
                {o.url && (
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                    View source ↗
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
