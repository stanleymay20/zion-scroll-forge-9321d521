/**
 * Ivy Parity Initiative — Hub
 * Public-facing umbrella page for the five academic-rigor gap-closers.
 */
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  GraduationCap,
  FlaskConical,
  Mic,
  Library,
  LayoutGrid,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const initiatives = [
  {
    icon: GraduationCap,
    title: "Capstone Tracks (Level 4–5)",
    summary:
      "Graduate-intensity specialization tracks with primary-source reading lists of 50+ texts, taught at the depth Ivy graduate seminars require.",
    href: "/capstone-tracks",
    label: "Browse capstone tracks",
  },
  {
    icon: FlaskConical,
    title: "Research Publications",
    summary:
      "Public, verifiable record of Kiro Lab outputs submitted to and accepted at peer-reviewed venues (NeurIPS, JBL, Nature, etc.).",
    href: "/research-publications",
    label: "View publications",
  },
  {
    icon: Mic,
    title: "Oral Defense Layer",
    summary:
      "Live faculty viva voce defenses for every Supreme Degree candidate, recorded and notarized on ScrollChain.",
    href: "/oral-defenses",
    label: "Public defense archive",
  },
  {
    icon: Library,
    title: "Primary-Source Library",
    summary:
      "Direct integrations with JSTOR, arXiv, Logos, Sefaria, and partner archives — embedded into modules instead of summaries.",
    href: "/primary-sources",
    label: "Source collections",
  },
  {
    icon: LayoutGrid,
    title: "Catalog Breadth Sprint",
    summary:
      "Public tracker of progress from current catalog toward 1,000+ courses across the 12 Supreme Faculties over 18 months.",
    href: "/catalog-expansion",
    label: "Track progress",
  },
];

export default function IvyParity() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Ivy Parity Initiative | Scroll University</title>
        <meta
          name="description"
          content="Five concrete programs by which Scroll University is closing the academic-depth gap with elite global universities — capstone tracks, peer-reviewed research, oral defenses, primary sources, and catalog breadth."
        />
        <link rel="canonical" href="https://scrolluniversity.org/ivy-parity" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12 space-y-14">
        <section className="max-w-3xl mx-auto text-center space-y-5">
          <div className="flex justify-center">
            <Trophy className="h-14 w-14 text-primary" />
          </div>
          <Badge variant="outline" className="mx-auto">Ivy Parity Initiative</Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
            Closing the academic-depth gap — in public.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Scroll University already leads on accessibility, AI personalization, spiritual integration,
            and pedagogical consistency. These five programs address the dimensions where elite universities
            still set the standard: depth, primary-source rigor, peer-reviewed research, oral examination,
            and catalog breadth. Progress is tracked openly. We will not claim what we have not built.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild variant="outline">
              <Link to="/academic-trust">
                <ShieldCheck className="mr-2 h-4 w-4" /> Academic Trust Center
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        <section className="grid md:grid-cols-2 gap-6">
          {initiatives.map((it) => {
            const Icon = it.icon;
            return (
              <Card key={it.href} className="border-2 hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="font-serif text-2xl">{it.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <CardDescription className="text-sm leading-relaxed">{it.summary}</CardDescription>
                  <Button asChild variant="ghost" className="self-start">
                    <Link to={it.href}>
                      {it.label} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
