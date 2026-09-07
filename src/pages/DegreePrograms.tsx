import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { EnrollmentGate, ProgramTruthPanel } from "@/components/trust/ProgramTruthPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDegreePrograms, useEnrollInDegree } from "@/hooks/useDegreePrograms";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function DegreePrograms() {
  const { data: programs, isLoading } = useDegreePrograms();
  const enrollInDegree = useEnrollInDegree();
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);

  const visiblePrograms = useMemo(
    () => (selectedFaculty ? programs?.filter((program) => program.faculty === selectedFaculty) : programs) ?? [],
    [programs, selectedFaculty]
  );

  const faculties = useMemo(
    () => [...new Set((programs ?? []).map((program) => program.faculty).filter(Boolean))] as string[],
    [programs]
  );

  const internallyReady = visiblePrograms.filter(
    (program: any) => program.accreditation_status === "accreditation_ready"
  );
  const developing = visiblePrograms.filter(
    (program: any) => program.accreditation_status !== "accreditation_ready"
  );

  const handleEnroll = async (programId: string) => {
    await enrollInDegree.mutateAsync(programId);
  };

  const renderProgram = (program: any, readiness: "ready" | "developing") => (
    <article
      key={program.id}
      className="flex h-full flex-col rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md sm:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        {readiness === "ready" ? (
          <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/5 text-primary">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Internal review baseline met
          </Badge>
        ) : (
          <Badge variant="secondary" className="rounded-full">Under academic development</Badge>
        )}
      </div>

      <div className="flex-1">
        <div className="mb-2 flex flex-wrap gap-2">
          {program.faculty ? <Badge variant="secondary" className="rounded-full">{program.faculty.replace("Scroll ", "")}</Badge> : null}
          {program.level ? <Badge variant="outline" className="rounded-full">{program.level}</Badge> : null}
        </div>

        <h3 className="font-serif text-2xl font-semibold leading-tight text-foreground">{program.title}</h3>
        {program.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{program.description}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-secondary/25 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {program.duration || "See programme details"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Internal credit record</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {program.total_credits ?? "See programme details"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <ProgramTruthPanel programId={program.id} compact />
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link to={`/program-verification/${program.id}`} className="font-medium text-primary hover:underline">
            View programme verification
          </Link>
          <Link to="/accreditation-status" className="text-muted-foreground hover:text-foreground">
            Accreditation status
          </Link>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1 rounded-full">
            <Link to={`/degrees/${program.id}`}>Programme details</Link>
          </Button>
          <EnrollmentGate programId={program.id}>
            <Button
              className="flex-1 rounded-full"
              disabled={program.is_enrolled || enrollInDegree.isPending}
              onClick={() => {
                if (!program.is_enrolled) handleEnroll(program.id);
              }}
            >
              {program.is_enrolled ? "Enrolled" : "Apply / Enroll"}
            </Button>
          </EnrollmentGate>
        </div>
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Programmes | ScrollUniversity</title>
        <meta
          name="description"
          content="Explore ScrollUniversity academic programmes with programme-level verification, internal readiness status, and public accreditation transparency."
        />
        <link rel="canonical" href="https://scrolluniversity.org/degrees" />
      </Helmet>

      <Header />

      <main>
        <section className="border-b border-border/60 bg-secondary/30 px-4 pb-14 pt-32 sm:pb-16 sm:pt-36">
          <div className="container mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Academic programmes</p>
              <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl md:text-6xl">
                Choose a structured pathway with its status visible up front.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Programme readiness, course structure and accreditation are different questions. ScrollUniversity publishes them separately so an internal academic milestone is never presented as external recognition.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full bg-background/70">
                <Link to="/catalog"><BookOpen className="mr-2 h-4 w-4" />Course catalogue</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-background/70">
                <Link to="/academic-trust"><ShieldCheck className="mr-2 h-4 w-4" />Academic trust</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/accreditation-status">Accreditation status <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:py-12">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-10 flex flex-wrap gap-2">
              <Button
                variant={selectedFaculty === null ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setSelectedFaculty(null)}
              >
                All faculties
              </Button>
              {faculties.map((faculty) => (
                <Button
                  key={faculty}
                  variant={selectedFaculty === faculty ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSelectedFaculty(faculty)}
                >
                  {faculty.replace("Scroll ", "")}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : visiblePrograms.length === 0 ? (
              <Card>
                <CardContent className="py-14 text-center">
                  <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-4 font-medium text-foreground">No programmes are published in this filter.</p>
                  <p className="mt-2 text-sm text-muted-foreground">No availability is being inferred beyond the current programme records.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-14">
                <section>
                  <div className="mb-6 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Internal academic readiness</p>
                    <h2 className="font-serif text-3xl font-semibold text-foreground">Programmes meeting ScrollUniversity's internal review baseline</h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      This is an internal curriculum-readiness status. It does not mean the programme, institution or award is accredited by an external authority. External claims appear only on the public accreditation-status page when verified evidence exists.
                    </p>
                  </div>

                  {internallyReady.length === 0 ? (
                    <p className="rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
                      No programmes in this filter currently meet the internal readiness baseline.
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {internallyReady.map((program) => renderProgram(program, "ready"))}
                    </div>
                  )}
                </section>

                {developing.length > 0 ? (
                  <section>
                    <div className="mb-6 max-w-3xl">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Development pipeline</p>
                      <h2 className="font-serif text-3xl font-semibold text-foreground">Programmes still under academic development</h2>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        These records remain visible for transparency, but their status should not be read as external accreditation, recognition or guaranteed enrolment availability.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {developing.map((program) => renderProgram(program, "developing"))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
