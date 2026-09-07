import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { VerifiedClaimBadge } from "@/components/trust/VerifiedClaimBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ArrowRight, FileCheck2, GraduationCap, ShieldCheck } from "lucide-react";

type LoadState = "loading" | "ready" | "error";

export default function AccreditationStatus() {
  const [claims, setClaims] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");

      const [claimsResult, reportsResult] = await Promise.all([
        supabase
          .from("public_claims" as any)
          .select("*")
          .eq("claim_type", "accreditation")
          .order("verified_at", { ascending: false }),
        supabase
          .from("trust_transparency_reports" as any)
          .select("*")
          .not("published_at", "is", null)
          .order("period_end", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      if (claimsResult.error || reportsResult.error) {
        setClaims([]);
        setReports([]);
        setLoadState("error");
        return;
      }

      setClaims((claimsResult.data as any[]) ?? []);
      setReports((reportsResult.data as any[]) ?? []);
      setLoadState("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Accreditation Status | ScrollUniversity</title>
        <meta
          name="description"
          content="Check the accreditation claims ScrollUniversity currently publishes from reviewed evidence, with internal programme readiness kept separate from external recognition."
        />
        <link rel="canonical" href="https://scrolluniversity.org/accreditation-status" />
      </Helmet>

      <div className="space-y-12 pb-12">
        <section className="-mx-4 rounded-[2rem] border border-border/50 bg-secondary/30 px-5 py-10 sm:-mx-6 sm:px-8 sm:py-12">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-5 rounded-full bg-background/70">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
              External recognition
            </Badge>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Accreditation status, without inference.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              This page is the public boundary for external accreditation claims. Internal programme readiness, curriculum review and credit records are not treated as evidence of external accreditation.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full bg-background/70">
              <Link to="/degrees">
                <GraduationCap className="mr-2 h-4 w-4" />
                Programme readiness
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-background/70">
              <Link to="/academic-trust">How academic claims are separated</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">1 · Internal readiness</p>
              <h2 className="mt-3 font-serif text-xl font-semibold text-foreground">Not accreditation</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                An internal programme-review milestone describes ScrollUniversity's own academic process only.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">2 · Reviewed claim</p>
              <h2 className="mt-3 font-serif text-xl font-semibold text-foreground">Evidence required</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                A public accreditation statement is displayed only when a corresponding claim record is returned from the trust system.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">3 · No record</p>
              <h2 className="mt-3 font-serif text-xl font-semibold text-foreground">No implied recognition</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                When no verified claim is published, this page does not infer recognition from programme names, credits or institutional ambition.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Published claims</p>
              <h2 className="font-serif text-3xl font-semibold text-foreground">Accreditation evidence currently returned</h2>
            </div>
            <Button asChild variant="ghost" className="w-fit rounded-full">
              <Link to="/trust">Trust Center <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          {loadState === "loading" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40 rounded-[1.25rem]" />
              <Skeleton className="h-40 rounded-[1.25rem]" />
            </div>
          ) : loadState === "error" ? (
            <Card className="border-destructive/20 bg-destructive/[0.025]">
              <CardContent className="py-10 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive/70" />
                <p className="mt-4 font-medium text-foreground">Accreditation evidence could not be loaded.</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  This state is not being interpreted as either accredited or unaccredited. The evidence source is unavailable, so no accreditation claim is displayed.
                </p>
              </CardContent>
            </Card>
          ) : claims.length === 0 ? (
            <Card className="border-primary/15 bg-primary/[0.02]">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="mx-auto h-9 w-9 text-primary/60" />
                <p className="mt-4 font-medium text-foreground">No accreditation claims are currently published.</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  ScrollUniversity is therefore not using this page to represent any programme or award as externally accredited.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {claims.map((claim) => (
                <Card key={claim.id} className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-serif text-xl leading-snug">{claim.subject_label}</CardTitle>
                      <VerifiedClaimBadge
                        claimId={claim.id}
                        state={claim.verification_state}
                        statement={claim.statement}
                        reviewerRole={claim.reviewer_role}
                        verifiedAt={claim.verified_at}
                        expiresAt={claim.expires_at}
                        compact
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">{claim.statement}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Transparency reports</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Published supporting reports</h2>
          </div>

          {loadState === "loading" ? (
            <div className="space-y-3">
              <Skeleton className="h-28 rounded-[1.25rem]" />
              <Skeleton className="h-28 rounded-[1.25rem]" />
            </div>
          ) : loadState === "error" ? (
            <p className="rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
              Supporting reports are unavailable because the transparency source could not be loaded.
            </p>
          ) : reports.length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
              No supporting transparency reports are currently published.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id} className="border-border/60">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <FileCheck2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-foreground">{report.title}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {new Date(report.period_start).toLocaleDateString()} – {new Date(report.period_end).toLocaleDateString()}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.summary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
