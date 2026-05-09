/**
 * Primary Source Library — directory of integrated primary-source collections.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Library, ExternalLink, Hourglass } from "lucide-react";

interface Source {
  id: string;
  name: string;
  provider: string;
  faculty_area: string;
  description: string;
  item_count: number;
  access_type: string;
  external_url: string | null;
}

const accessLabel: Record<string, string> = {
  open: "Open Access",
  licensed: "Licensed",
  partner: "Partner",
};

export default function PrimarySources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("primary_source_collections")
        .select("*")
        .eq("is_active", true)
        .order("faculty_area");
      setSources((data as Source[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Primary Source Library | Scroll University</title>
        <meta name="description" content="Curated primary-source collections embedded into Scroll University modules — JSTOR, arXiv, Logos, Sefaria, and partner archives." />
        <link rel="canonical" href="https://scrolluniversity.org/primary-sources" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="max-w-3xl space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Library className="h-8 w-8" />
            <Badge variant="outline">Primary-Source Library</Badge>
          </div>
          <h1 className="font-serif text-4xl font-bold">Original texts, not summaries.</h1>
          <p className="text-muted-foreground leading-relaxed">
            We are integrating canonical archives directly into modules so students engage primary sources
            firsthand. Every collection listed here is either openly accessible, formally licensed, or
            partner-provided.
          </p>
        </section>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        ) : sources.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <Hourglass className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-serif text-xl font-semibold">Source integrations being finalized</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Licensing and partnership negotiations with major archives are underway. Each integration
                will be listed here only after access terms are confirmed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sources.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{s.faculty_area}</Badge>
                    <Badge variant="secondary">{accessLabel[s.access_type] || s.access_type}</Badge>
                  </div>
                  <CardTitle className="font-serif text-xl mt-2">{s.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">via {s.provider} · {s.item_count.toLocaleString()} items</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{s.description}</p>
                  {s.external_url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={s.external_url} target="_blank" rel="noopener noreferrer">
                        Visit source <ExternalLink className="ml-2 h-3 w-3" />
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
