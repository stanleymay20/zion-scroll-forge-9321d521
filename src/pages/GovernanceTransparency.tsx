import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VerifiedClaimBadge, ClaimVerificationState } from "@/components/trust/VerifiedClaimBadge";
import { ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet";

const claimTypes = [
  "all","accreditation","faculty","curriculum","practicum","employment",
  "research","ai_tutor","infrastructure","partnership","transcript_equivalency",
];

export default function GovernanceTransparency() {
  const [claims, setClaims] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("public_claims" as any)
        .select("*")
        .order("verified_at", { ascending: false })
        .limit(500);
      if (type !== "all") q = q.eq("claim_type", type);
      const { data } = await q;
      setClaims((data as any[]) ?? []);
      setLoading(false);
    })();
  }, [type]);

  const filtered = claims.filter((c) =>
    [c.subject_label, c.statement].some((s) =>
      (s ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="container mx-auto max-w-6xl py-10 px-4">
      <Helmet>
        <title>Governance Transparency · Scroll University</title>
        <meta
          name="description"
          content="Every institutional claim Scroll University makes publicly is backed by reviewed evidence. Browse the live verification registry."
        />
        <link rel="canonical" href="/governance" />
      </Helmet>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl text-primary">Governance Transparency</h1>
      </div>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Every claim we make publicly — about accreditation, faculty, curriculum,
        practicum partners, AI capability — must resolve to reviewed, attributed,
        non-expired evidence. Click any badge to inspect the underlying record.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Search claims…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {claimTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All claim types" : t.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading registry…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No verified claims have been published yet in this category. Absence
            here is intentional — we don't display claims without evidence.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <span>{c.subject_label}</span>
                  <VerifiedClaimBadge
                    claimId={c.id}
                    state={c.verification_state as ClaimVerificationState}
                    statement={c.statement}
                    reviewerRole={c.reviewer_role}
                    verifiedAt={c.verified_at}
                    expiresAt={c.expires_at}
                    compact
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{c.statement}</p>
                <div className="text-xs flex gap-3">
                  <span className="uppercase tracking-wider">{c.claim_type}</span>
                  {c.expires_at && (
                    <span>
                      Expires {new Date(c.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
