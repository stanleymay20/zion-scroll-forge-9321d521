/**
 * Research Publications — public registry of accepted/published research.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, ExternalLink, Hourglass, CheckCircle2 } from "lucide-react";

interface Pub {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  faculty_area: string;
  abstract: string | null;
  external_url: string | null;
  doi: string | null;
  status: string;
  is_peer_reviewed: boolean;
}

export default function ResearchPublications() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("research_publications")
        .select("*")
        .in("status", ["accepted", "published"])
        .order("year", { ascending: false });
      setPubs((data as Pub[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Research Publications | Scroll University</title>
        <meta name="description" content="Public registry of Scroll University research outputs accepted at peer-reviewed venues." />
        <link rel="canonical" href="https://scrolluniversity.org/research-publications" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="max-w-3xl space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <FlaskConical className="h-8 w-8" />
            <Badge variant="outline">Research Publications</Badge>
          </div>
          <h1 className="font-serif text-4xl font-bold">Verifiable research output</h1>
          <p className="text-muted-foreground leading-relaxed">
            We list only publications that are accepted or published at named venues, with external links
            wherever possible. Submissions under review are tracked privately and only surfaced here once
            a venue confirms acceptance.
          </p>
        </section>

        {loading ? (
          <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        ) : pubs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <Hourglass className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-serif text-xl font-semibold">No accepted publications yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Kiro Research Labs is actively preparing submissions. As soon as a paper is accepted at a
                peer-reviewed venue, it will appear here with full author list, venue, and external link.
                We will not pre-announce submissions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pubs.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{p.faculty_area}</Badge>
                    <Badge variant="secondary">{p.venue} · {p.year}</Badge>
                    {p.is_peer_reviewed && (
                      <Badge className="bg-primary/10 text-primary">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Peer-reviewed
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="font-serif text-xl mt-2">{p.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {p.authors?.length > 0 && (
                    <p className="text-muted-foreground italic">{p.authors.join(", ")}</p>
                  )}
                  {p.abstract && <p className="text-muted-foreground">{p.abstract}</p>}
                  {(p.external_url || p.doi) && (
                    <Button asChild variant="outline" size="sm">
                      <a href={p.external_url || `https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer">
                        Read publication <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
