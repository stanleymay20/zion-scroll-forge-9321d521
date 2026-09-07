import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDot,
  FileSearch,
  GraduationCap,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const truthBoundaries = [
  {
    title: "Catalogue records",
    label: "Published data",
    description:
      "Courses and programme links shown publicly are drawn from current application records. Counts are not substituted with marketing totals when those records are unavailable.",
    icon: BookOpen,
  },
  {
    title: "Internal academic readiness",
    label: "Internal status",
    description:
      "A programme may meet ScrollUniversity's own curriculum-review baseline. That status is kept separate from external accreditation, recognition, award validity or transferability.",
    icon: GraduationCap,
  },
  {
    title: "External accreditation",
    label: "Evidence-gated claim",
    description:
      "External accreditation is published only through reviewed accreditation claims. If no verified claim is available, the public status page says so rather than implying recognition.",
    icon: ShieldCheck,
  },
];

const controls = [
  {
    title: "Release-tested academic authority",
    status: "Release tested",
    body: "Repository release gates replay current academic-authority, content-review and curriculum-completeness migrations against a clean PostgreSQL test environment before a SHA is treated as release-ready.",
  },
  {
    title: "Deployment parity is a separate control",
    status: "Runtime verification required",
    body: "Passing repository tests does not by itself prove that every database migration is deployed. Runtime controls are treated as active only after deployment parity has been verified against the database serving the application.",
  },
  {
    title: "Independent-review design",
    status: "Authority design",
    body: "The curriculum-authority design separates curriculum authorship from independent review and tests that protected teaching states cannot bypass required review evidence where the authority migrations are deployed.",
  },
  {
    title: "Fail-closed publication design",
    status: "Authority design",
    body: "Content-authority migrations are designed to protect review, provenance and publication-state fields rather than trusting client-side labels. Public language does not describe those controls as live until runtime deployment is verified.",
  },
];

const commitments = [
  "Do not turn an internal readiness label into an accreditation claim.",
  "Do not describe a reviewer as human unless the evidence establishes that fact.",
  "Do not publish fixed institutional performance metrics without a traceable source.",
  "Keep AI-support claims separate from claims about academic decision authority.",
  "Expose programme verification and accreditation status as separate public surfaces.",
  "Treat repository tests and production deployment as two different kinds of evidence.",
];

export default function AcademicTrust() {
  return (
    <>
      <Helmet>
        <title>Academic Trust | ScrollUniversity</title>
        <meta
          name="description"
          content="Inspect the evidence boundaries behind ScrollUniversity catalogue records, internal programme readiness, academic authority controls, AI use and accreditation claims."
        />
        <link rel="canonical" href="https://scrolluniversity.org/academic-trust" />
      </Helmet>

      <div className="space-y-14 pb-12">
        <section className="-mx-4 rounded-[2rem] border border-border/50 bg-secondary/30 px-5 py-10 sm:-mx-6 sm:px-8 sm:py-12">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-5 rounded-full bg-background/70">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Academic trust
            </Badge>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Academic trust should be inspectable, not implied.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              ScrollUniversity separates what is published in the learning system, what has passed an internal academic threshold, what is only release-tested in the repository, and what has been externally recognized. Those are different forms of evidence and should never be collapsed into one claim.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link to="/accreditation-status">
                View accreditation status <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-background/70">
              <Link to="/degrees">Programme status</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-background/70">
              <Link to="/catalog">Course catalogue</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Three truth boundaries</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">What each public status actually means</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {truthBoundaries.map((boundary) => {
              const Icon = boundary.icon;
              return (
                <Card key={boundary.title} className="border-border/60 shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="mb-3 rounded-full">{boundary.label}</Badge>
                    <h3 className="font-serif text-xl font-semibold text-foreground">{boundary.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{boundary.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Authority evidence</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Repository proof and runtime proof are not the same thing</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              ScrollUniversity's release pipeline can prove that authority migrations and regression tests pass against a clean test database. Runtime guarantees require an additional deployment-parity check against the database actually serving users.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {controls.map((control) => (
              <Card key={control.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <FileSearch className="h-4 w-4 text-primary" />
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px]">{control.status}</Badge>
                  </div>
                  <h3 className="mt-5 font-serif text-xl font-semibold text-foreground">{control.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{control.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-primary/20 bg-primary/[0.025]">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-2 text-primary">
                <Scale className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Public-claim discipline</span>
              </div>
              <h2 className="font-serif text-3xl font-semibold text-foreground">What we commit not to overstate</h2>
              <ul className="mt-6 space-y-4">
                {commitments.map((commitment) => (
                  <li key={commitment} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{commitment}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">AI transparency</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  AI-supported learning and automated academic workflows should be described by function, scope and evidence—not by implying that AI output is itself institutional authority.
                </p>
                <Button asChild variant="link" className="mt-3 h-auto p-0">
                  <Link to="/ai-transparency">Review AI transparency <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <CircleDot className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">External recognition</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Accreditation and recognition are future-facing institutional objectives unless and until a reviewed public claim establishes otherwise. No named accreditor relationship is implied by this page.
                </p>
                <Button asChild variant="link" className="mt-3 h-auto p-0">
                  <Link to="/accreditation-status">Check published evidence <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <h2 className="font-serif text-2xl font-semibold text-foreground">Need the legal and institutional disclosures?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The Trust Center collects the broader legal, governance and disclosure surfaces separately from academic programme status.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 rounded-full">
              <Link to="/trust">Open Trust Center <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
