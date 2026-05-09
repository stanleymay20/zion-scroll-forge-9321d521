/**
 * Academic Trust Center
 * Umbrella page covering the 4-phase institutional roadmap, faculty categories,
 * grading transparency commitments, governance, AI ethics, and links to outcomes.
 *
 * Strategic positioning: "Governance-first, AI-native, faith-based global
 * university infrastructure" — not "the Christian Harvard."
 */

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  Layers,
  Users,
  Scale,
  FlaskConical,
  Globe2,
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
  GraduationCap,
  Gavel,
  BookOpenCheck,
  Sparkles,
  FileSearch,
} from "lucide-react";

console.info("✝️ Academic Trust Center — Umbrella for institutional legitimacy");

type PhaseStatus = "active" | "in-progress" | "planned";

const phases: Array<{
  number: string;
  title: string;
  status: PhaseStatus;
  window: string;
  thesis: string;
  pillars: string[];
}> = [
  {
    number: "Phase 1",
    title: "AI-Native Educational Infrastructure",
    status: "active",
    window: "2024 — 2026",
    thesis:
      "Establish the operating system: AI-guided learning, governance integrity, and global accessibility at platform scale.",
    pillars: [
      "Zero-hardcoded living curriculum (Kiro / DeepSeek)",
      "AI tutors, lecturers, and adaptive pathways",
      "SUYAS lifecycle governance with immutable audit logs",
      "Microtuition global accessibility model",
      "QualityGates blocking placeholder content",
    ],
  },
  {
    number: "Phase 2",
    title: "Research & Academic Trust Layer",
    status: "in-progress",
    window: "2025 — 2027",
    thesis:
      "Build the human-credentialed scholarship layer: visiting faculty, peer review, publication pipelines, and bibliometric presence.",
    pillars: [
      "Visiting Scholars and Research Fellows registry",
      "Kiro Research Labs publication pipeline with DOI assignment",
      "Prophetic Peer Review with external academic reviewers",
      "Institutional partnerships and joint research programs",
      "Citation indexing in Scopus / Web of Science",
    ],
  },
  {
    number: "Phase 3",
    title: "Accreditation & Recognition",
    status: "planned",
    window: "2026 — 2029",
    thesis:
      "Pursue formal accreditation pathways and credential transferability through hybrid institutional partnerships.",
    pillars: [
      "Theological accreditation candidacy (ABHE, TRACS)",
      "Distance-education accreditation pathway (DEAC)",
      "Articulation agreements with accredited partner universities",
      "Quality assurance frameworks aligned with regional standards",
      "Transferability and licensure mapping where applicable",
    ],
  },
  {
    number: "Phase 4",
    title: "Global Distributed University Ecosystem",
    status: "planned",
    window: "2028 — 2034",
    thesis:
      "Federate multilingual campuses, research hubs, and AI-native learning nodes into a global higher-education network.",
    pillars: [
      "Multilingual ScrollArk campuses across continents",
      "Regional research hubs and ScrollLabs makerspaces",
      "Federated AI-native higher-education partners",
      "Global learning nodes anchored in Scroll Community Hubs",
      "Continuous credential portability across the federation",
    ],
  },
];

const facultyCategories = [
  {
    name: "Founding Faculty",
    meaning: "Core architects of the institution, curriculum, and governance.",
    icon: Sparkles,
  },
  {
    name: "Visiting Scholars",
    meaning: "Externally credentialed academics contributing seminars, lectures, or reviews.",
    icon: Globe2,
  },
  {
    name: "Research Fellows",
    meaning: "Active research collaborators publishing through Kiro Research Labs.",
    icon: FlaskConical,
  },
  {
    name: "Advisory Faculty",
    meaning: "Strategic academic advisors guiding standards, ethics, and direction.",
    icon: Users,
  },
  {
    name: "Seminar Faculty",
    meaning: "Instructors leading live, small-cohort, human-evaluated seminars.",
    icon: GraduationCap,
  },
];

const gradingCommitments = [
  "Every rubric is published and visible to the student before assessment.",
  "AI contribution is disclosed for every consequential academic decision.",
  "A human reviewer is available for escalation on any graded outcome.",
  "Grade overrides are timestamped and logged immutably via SUYAS.",
  "Reasoning behind AI-assisted grades is exportable on request.",
  "Appeals are resolved within a published service window.",
];

const governanceMoats = [
  {
    title: "Lifecycle Integrity",
    body: "Every state transition (enrollment, hold, grade, graduation) is an explicit, auditable event — not a hidden mutation.",
    icon: Gavel,
  },
  {
    title: "Role-Bound Access",
    body: "All privileged actions resolve through a hardened user_roles table, never through client-side claims or metadata.",
    icon: ShieldCheck,
  },
  {
    title: "Quality Gates",
    body: "Automated scanners block placeholder content, broken rubrics, and non-compliant material from ever reaching learners.",
    icon: BookOpenCheck,
  },
  {
    title: "Ethical AI Oversight",
    body: "AI assists; humans decide. Consequential decisions are explainable, traceable, appealable, and supervised.",
    icon: Scale,
  },
];

const statusBadge: Record<PhaseStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  active: {
    label: "Active",
    className: "bg-primary/15 text-primary border-primary/30",
    Icon: CheckCircle2,
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Icon: Clock,
  },
  planned: {
    label: "Planned",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Circle,
  },
};

export default function AcademicTrust() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Academic Trust Center | Scroll University</title>
        <meta
          name="description"
          content="The 4-phase institutional roadmap, faculty model, grading transparency, governance, and AI ethics behind Scroll University."
        />
        <link rel="canonical" href="https://scrolluniversity.org/academic-trust" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12 space-y-16">
        {/* Hero */}
        <section className="max-w-3xl mx-auto text-center space-y-5">
          <div className="flex justify-center">
            <ShieldCheck className="h-14 w-14 text-primary" />
          </div>
          <Badge variant="outline" className="mx-auto">Academic Trust Center</Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
            A new institutional category — built in public.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Scroll University is not trying to become a copy of Harvard or MIT. We are building a
            governance-first, AI-native, faith-based global university infrastructure. This page is the
            umbrella under which our faculty model, grading transparency, research credibility, and
            accreditation pathway all become legible.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link to="/faculty-directory">
                Faculty Registry <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/outcomes">Graduate Outcomes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/trust">Legal & Disclosures</Link>
            </Button>
          </div>
        </section>

        <Separator />

        {/* 4-Phase Roadmap */}
        <section className="space-y-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Layers className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Institutional Roadmap</span>
            </div>
            <h2 className="font-serif text-3xl font-bold">The four-phase path to a recognized institution</h2>
            <p className="mt-3 text-muted-foreground">
              Each phase is a layer of trust, not a marketing milestone. We will never claim recognition,
              accreditation, or transferability we have not actually achieved.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {phases.map((phase) => {
              const meta = statusBadge[phase.status];
              const Icon = meta.Icon;
              return (
                <Card key={phase.number} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-semibold">{phase.number}</Badge>
                      <Badge className={meta.className} variant="outline">
                        <Icon className="h-3.5 w-3.5 mr-1" />
                        {meta.label}
                      </Badge>
                    </div>
                    <CardTitle className="font-serif text-2xl mt-3">{phase.title}</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-wide">{phase.window}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground italic">{phase.thesis}</p>
                    <ul className="space-y-2">
                      {phase.pillars.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* Faculty Model */}
        <section className="space-y-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Faculty Model</span>
            </div>
            <h2 className="font-serif text-3xl font-bold">Honest categories, identifiable people</h2>
            <p className="mt-3 text-muted-foreground">
              We will never present contributors as full-time tenured professors when they are not. Every
              faculty member appears under one of five honest, academically standard categories, with
              credentials and external profiles where available.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {facultyCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Card key={cat.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {cat.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{cat.meaning}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Button asChild variant="outline">
              <Link to="/faculty-directory">
                Browse the Faculty Registry <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        {/* Grading Transparency */}
        <section className="space-y-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <FileSearch className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Grading Transparency</span>
            </div>
            <h2 className="font-serif text-3xl font-bold">AI assists. Humans decide. Everything is appealable.</h2>
            <p className="mt-3 text-muted-foreground">
              No consequential academic decision is fully opaque. Our grading pipeline is designed as
              compliance, trust, accreditation, and governance infrastructure simultaneously.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ul className="grid md:grid-cols-2 gap-4">
                {gradingCommitments.map((commitment) => (
                  <li key={commitment} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{commitment}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">EU AI Act readiness:</strong> Education is classified
                  as a high-risk domain. Our grading transparency commitments — rubric visibility, AI
                  disclosure, human escalation, immutable audit, and reasoned appeal — are designed to meet
                  that bar from day one.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Governance Moat */}
        <section className="space-y-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Gavel className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Governance Moat</span>
            </div>
            <h2 className="font-serif text-3xl font-bold">The deepest moat is governance, not AI</h2>
            <p className="mt-3 text-muted-foreground">
              AI commoditizes quickly. Institutional governance — trust systems, progression integrity,
              auditability, identity frameworks, lifecycle management, and ethical AI oversight — does not.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {governanceMoats.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {m.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* What this is and isn't */}
        <section className="grid md:grid-cols-2 gap-6">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                What this Trust Center is
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• A living, public roadmap to a recognized institution</li>
                <li>• A truthful description of our faculty model and categories</li>
                <li>• A binding statement of our grading transparency commitments</li>
                <li>• An invitation to scrutiny by scholars, regulators, and partners</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Scale className="h-5 w-5" />
                What it is not
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• A claim of equivalence with centuries-old institutions</li>
                <li>• A guarantee of accreditation, transferability, or licensure today</li>
                <li>• A substitute for our Legal & Disclosures Trust Center</li>
                <li>• Marketing language we cannot operationally defend</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Closing CTA */}
        <section className="text-center max-w-2xl mx-auto space-y-4 pt-4">
          <h2 className="font-serif text-2xl font-bold">Hold us accountable.</h2>
          <p className="text-muted-foreground">
            If a claim on this page does not match what you experience as a learner, scholar, or partner,
            tell us. Trust is not a marketing surface — it is operational discipline.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button asChild>
              <Link to="/trust">Legal & Disclosures</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/academic-integrity">Academic Integrity Policy</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
