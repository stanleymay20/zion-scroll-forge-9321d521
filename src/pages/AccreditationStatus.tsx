import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifiedClaimBadge } from "@/components/trust/VerifiedClaimBadge";
import { Helmet } from "react-helmet";
import { ShieldCheck } from "lucide-react";

export default function AccreditationStatus() {
  const [claims, setClaims] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
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
      setClaims((c as any[]) ?? []);
      setReports((r as any[]) ?? []);
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <Helmet>
        <title>Accreditation Status · Scroll University</title>
        <meta
          name="description"
          content="Live accreditation status of Scroll University programs, backed by reviewed governance evidence."
        />
        <link rel="canonical" href="/accreditation-status" />
      </Helmet>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl text-primary">Accreditation Status</h1>
      </div>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        We publish accreditation claims only when reviewed evidence exists. Programs
        not listed here are either under academic development, experimental, or
        internal-only — never represented as accredited.
      </p>

      <h2 className="font-serif text-xl mt-6 mb-3">Verified accreditation claims</h2>
      {claims.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground text-center">
            No accreditation claims are currently published. We will not show
            unverified accreditation language.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claims.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <span>{c.subject_label}</span>
                  <VerifiedClaimBadge
                    claimId={c.id}
                    state={c.verification_state}
                    statement={c.statement}
                    reviewerRole={c.reviewer_role}
                    verifiedAt={c.verified_at}
                    expiresAt={c.expires_at}
                    compact
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.statement}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-serif text-xl mt-10 mb-3">Transparency reports</h2>
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reports published yet.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="text-xs uppercase tracking-wider mb-1">
                  {new Date(r.period_start).toLocaleDateString()} –{" "}
                  {new Date(r.period_end).toLocaleDateString()}
                </p>
                <p>{r.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
