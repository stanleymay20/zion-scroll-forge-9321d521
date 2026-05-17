import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifiedClaimBadge } from "@/components/trust/VerifiedClaimBadge";
import { Helmet } from "react-helmet";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function ProgramVerification() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("degree_programs").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("public_claims" as any)
          .select("*")
          .eq("subject_kind", "program")
          .eq("subject_id", id),
      ]);
      setProgram(p);
      setClaims((c as any[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const byType = (t: string) => claims.filter((c) => c.claim_type === t);

  const sections: { key: string; label: string; tone: string }[] = [
    { key: "accreditation", label: "Accreditation", tone: "Recognition status of this program" },
    { key: "curriculum", label: "Curriculum Maturity", tone: "Depth and review status of course materials" },
    { key: "faculty", label: "Faculty Strength", tone: "Credentialed faculty assigned to this program" },
    { key: "practicum", label: "Practicum Availability", tone: "Verified field placement partners" },
    { key: "ai_tutor", label: "AI Tutor Capability", tone: "What the AI tutor for this program can actually do" },
    { key: "research", label: "Research & Thesis", tone: "Thesis or capstone availability" },
    { key: "employment", label: "Employment Outcomes", tone: "Verified graduate placement data" },
  ];

  return (
    <div className="container mx-auto max-w-4xl py-10 px-4">
      <Helmet>
        <title>
          {program ? `${program.name} · Verification` : "Program Verification"} ·
          Scroll University
        </title>
        <meta
          name="description"
          content="Evidence-bound view of this program's accreditation, curriculum, faculty, practicum, AI tutor capability, and outcomes."
        />
      </Helmet>

      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl text-primary">Program Verification</h1>
      </div>
      {program && (
        <p className="text-muted-foreground mb-6">
          {program.name}
          {program.degree_type && (
            <span className="ml-2 text-xs uppercase tracking-wider">
              · {program.degree_type}
            </span>
          )}
        </p>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {sections.map((s) => {
            const items = byType(s.key);
            return (
              <Card key={s.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{s.label}</span>
                    {items.length === 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Not yet verified
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-xs text-muted-foreground">{s.tone}</p>
                  {items.length === 0 ? (
                    <p className="text-muted-foreground italic">
                      No verified claim has been published for this dimension yet.
                      We intentionally do not represent strength here without
                      evidence.
                    </p>
                  ) : (
                    items.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start justify-between gap-3 border-t pt-2"
                      >
                        <p className="flex-1">{c.statement}</p>
                        <VerifiedClaimBadge
                          claimId={c.id}
                          state={c.verification_state}
                          statement={c.statement}
                          reviewerRole={c.reviewer_role}
                          verifiedAt={c.verified_at}
                          expiresAt={c.expires_at}
                          compact
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic mt-6 border-t pt-3">
        Programs that fail accreditation gates are never represented as equivalent
        to verified programs in our public catalog.
      </p>
    </div>
  );
}
