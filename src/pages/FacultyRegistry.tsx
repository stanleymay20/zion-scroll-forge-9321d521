/**
 * Public Faculty Registry
 * Honest, identifiable contributors to Scroll University.
 *
 * Categories: Founding Faculty, Visiting Scholars, Research Fellows,
 * Advisory Faculty, Seminar Faculty.
 *
 * No invented names. If no verified profiles exist for a category,
 * shows an honest empty state.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ShieldCheck,
  ExternalLink,
  Globe,
  Linkedin,
  GraduationCap,
  FlaskConical,
  Sparkles,
  BookOpen,
  Hourglass,
  ArrowRight,
} from "lucide-react";

type FacultyCategory =
  | "founding_faculty"
  | "visiting_scholar"
  | "research_fellow"
  | "advisory_faculty"
  | "seminar_faculty";

type VerificationStatus = "pending" | "verified" | "retired";

interface FacultyRow {
  id: string;
  category: FacultyCategory;
  full_name: string;
  title: string | null;
  credentials: string | null;
  affiliation: string | null;
  orcid_id: string | null;
  google_scholar_url: string | null;
  linkedin_url: string | null;
  personal_url: string | null;
  publications: Array<{ title?: string; url?: string }> | null;
  research_areas: string[] | null;
  contribution: string | null;
  bio: string | null;
  photo_url: string | null;
  verification_status: VerificationStatus;
  display_order: number;
}

const CATEGORIES: Array<{
  key: FacultyCategory;
  label: string;
  blurb: string;
  Icon: typeof Sparkles;
}> = [
  {
    key: "founding_faculty",
    label: "Founding Faculty",
    blurb: "Core architects of the institution, curriculum, and governance.",
    Icon: Sparkles,
  },
  {
    key: "visiting_scholar",
    label: "Visiting Scholars",
    blurb: "Externally credentialed academics contributing seminars, lectures, or reviews.",
    Icon: Globe,
  },
  {
    key: "research_fellow",
    label: "Research Fellows",
    blurb: "Active research collaborators publishing through Kiro Research Labs.",
    Icon: FlaskConical,
  },
  {
    key: "advisory_faculty",
    label: "Advisory Faculty",
    blurb: "Strategic academic advisors guiding standards, ethics, and direction.",
    Icon: BookOpen,
  },
  {
    key: "seminar_faculty",
    label: "Seminar Faculty",
    blurb: "Instructors leading live, small-cohort, human-evaluated seminars.",
    Icon: GraduationCap,
  },
];

function PersonCard({ person }: { person: FacultyRow }) {
  const initials = person.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0 overflow-hidden">
            {person.photo_url ? (
              <img
                src={person.photo_url}
                alt={`Portrait of ${person.full_name}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span>{initials || "·"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg leading-tight">{person.full_name}</CardTitle>
            {person.title && (
              <p className="text-sm text-muted-foreground mt-0.5">{person.title}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {person.verification_status === "verified" && (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
              {person.credentials && (
                <Badge variant="secondary">{person.credentials}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {person.affiliation && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Affiliation: </span>
            {person.affiliation}
          </p>
        )}
        {person.research_areas && person.research_areas.length > 0 && (
          <div>
            <p className="font-medium text-foreground mb-1">Research areas</p>
            <div className="flex flex-wrap gap-1.5">
              {person.research_areas.map((area) => (
                <Badge key={area} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {person.contribution && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Contribution: </span>
            {person.contribution}
          </p>
        )}
        {person.bio && (
          <p className="text-muted-foreground line-clamp-3">{person.bio}</p>
        )}

        {(person.orcid_id ||
          person.google_scholar_url ||
          person.linkedin_url ||
          person.personal_url) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {person.orcid_id && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://orcid.org/${person.orcid_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ORCID <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            {person.google_scholar_url && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={person.google_scholar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Scholar <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            {person.linkedin_url && (
              <Button asChild variant="outline" size="sm">
                <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-3 w-3 mr-1" /> LinkedIn
                </a>
              </Button>
            )}
            {person.personal_url && (
              <Button asChild variant="outline" size="sm">
                <a href={person.personal_url} target="_blank" rel="noopener noreferrer">
                  Site <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
          </div>
        )}

        {person.publications && person.publications.length > 0 && (
          <div className="pt-2">
            <p className="font-medium text-foreground mb-1">Selected publications</p>
            <ul className="space-y-1">
              {person.publications.slice(0, 5).map((pub, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {pub.url ? (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary underline-offset-2 hover:underline"
                    >
                      {pub.title || pub.url}
                    </a>
                  ) : (
                    pub.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyCategoryState({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center space-y-3">
        <div className="flex justify-center">
          <Hourglass className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="font-serif text-xl font-semibold">No verified {label} listed yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Faculty profiles are being verified and will be published as appointments are
          confirmed. We do not list contributors until credentials and affiliations have been
          independently verified.
        </p>
      </CardContent>
    </Card>
  );
}

export default function FacultyRegistry() {
  const [rows, setRows] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("public_faculty")
        .select(
          "id,category,full_name,title,credentials,affiliation,orcid_id,google_scholar_url,linkedin_url,personal_url,publications,research_areas,contribution,bio,photo_url,verification_status,display_order"
        )
        .eq("is_active", true)
        .eq("verification_status", "verified")
        .order("display_order", { ascending: true })
        .order("full_name", { ascending: true });

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as FacultyRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    members: rows.filter((r) => r.category === c.key),
  }));

  const totalVerified = rows.length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Faculty Registry | Scroll University</title>
        <meta
          name="description"
          content="Public registry of Scroll University faculty: founding members, visiting scholars, research fellows, advisory faculty, and seminar instructors."
        />
        <link rel="canonical" href="https://scrolluniversity.org/faculty-registry" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <section className="max-w-3xl mx-auto text-center space-y-5">
          <div className="flex justify-center">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <Badge variant="outline" className="mx-auto">
            Faculty Registry
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
            Identifiable scholars, honest categories.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We do not present contributors as full-time tenured professors when they are not.
            Each faculty member is listed under one of five academically standard categories,
            with credentials, affiliations, and external profiles where available. Profiles
            appear here only after independent verification.
          </p>
          <div className="flex justify-center gap-3 flex-wrap pt-2">
            <Button asChild variant="outline">
              <Link to="/academic-trust">
                Academic Trust Center <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/trust">Legal & Disclosures</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Currently listing <span className="font-semibold">{totalVerified}</span> verified
            faculty profile{totalVerified === 1 ? "" : "s"}.
          </p>
        </section>

        <Separator />

        {/* Category cards explainer */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((c) => {
            const Icon = c.Icon;
            return (
              <Card key={c.key} className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {c.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{c.blurb}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Separator />

        {/* Tabs by category */}
        <section>
          <Tabs defaultValue="founding_faculty" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-4xl mx-auto h-auto">
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c.key} value={c.key} className="text-xs md:text-sm">
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {grouped.map((g) => (
              <TabsContent key={g.key} value={g.key} className="mt-8">
                <div className="mb-6 max-w-2xl">
                  <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                    <g.Icon className="h-5 w-5 text-primary" />
                    {g.label}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{g.blurb}</p>
                </div>

                {loading ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-72 w-full" />
                    ))}
                  </div>
                ) : error ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Unable to load the registry right now. Please refresh shortly.
                    </CardContent>
                  </Card>
                ) : g.members.length === 0 ? (
                  <EmptyCategoryState label={g.label} />
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {g.members.map((p) => (
                      <PersonCard key={p.id} person={p} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <Separator />

        {/* Honesty footer */}
        <section className="max-w-3xl mx-auto text-center space-y-3">
          <h2 className="font-serif text-2xl font-bold">Our verification commitment</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We will never invent faculty, fabricate credentials, or imply institutional
            affiliations that do not exist. Every name on this page reflects a real, consenting
            contributor whose role and credentials have been independently verified. As
            appointments are finalised, this registry grows in public.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline">
              <a href="mailto:faculty@scrolluniversity.org">
                Apply to join the faculty
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
