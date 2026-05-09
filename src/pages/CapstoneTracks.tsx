/**
 * Capstone Tracks — Level 4–5 graduate-intensity tracks.
 * Honest empty state when none are published.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, BookOpen, Hourglass, ListChecks } from "lucide-react";

interface Track {
  id: string;
  title: string;
  faculty_area: string;
  level: number;
  description: string;
  learning_outcomes: string[];
  primary_source_reading_list: Array<{ title?: string; author?: string; url?: string }>;
  duration_weeks: number;
  prerequisites: string[];
}

export default function CapstoneTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("capstone_tracks")
        .select("*")
        .eq("status", "published")
        .order("faculty_area");
      setTracks((data as Track[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Capstone Tracks (Level 4–5) | Scroll University</title>
        <meta name="description" content="Graduate-intensity capstone tracks with primary-source reading lists and original research projects." />
        <link rel="canonical" href="https://scrolluniversity.org/capstone-tracks" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="max-w-3xl space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <GraduationCap className="h-8 w-8" />
            <Badge variant="outline">Level 4–5 Capstone Tracks</Badge>
          </div>
          <h1 className="font-serif text-4xl font-bold">Graduate-intensity specialization</h1>
          <p className="text-muted-foreground leading-relaxed">
            Capstone tracks are the deepest tier of Scroll University coursework. Each requires mastery of
            prior levels, engagement with 50+ primary sources, and an original research or system-design output.
            Tracks are published only after Faculty Council review.
          </p>
        </section>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" /><Skeleton className="h-64" />
          </div>
        ) : tracks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <Hourglass className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-serif text-xl font-semibold">Capstone tracks are being finalized</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                The Faculty Council is currently assembling reading lists and outcome rubrics across the
                12 Supreme Faculties. Tracks will be published here as each is approved. We will not list
                tracks before they meet the depth standard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {tracks.map((t) => (
              <Card key={t.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{t.faculty_area}</Badge>
                    <Badge>Level {t.level}</Badge>
                  </div>
                  <CardTitle className="font-serif text-2xl mt-2">{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-muted-foreground">{t.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hourglass className="h-3.5 w-3.5" /> {t.duration_weeks} weeks
                    <BookOpen className="h-3.5 w-3.5 ml-3" /> {t.primary_source_reading_list?.length || 0} primary sources
                  </div>
                  {t.learning_outcomes?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-xs uppercase mb-2">
                        <ListChecks className="h-3.5 w-3.5" /> Outcomes
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {t.learning_outcomes.slice(0, 4).map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
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
