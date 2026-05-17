import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgramTruthPanel } from "@/components/trust/ProgramTruthPanel";
import { ShieldCheck } from "lucide-react";

interface Row {
  program_id: string;
  title: string;
  faculty: string | null;
  scroll_level: string | null;
  public_status: any;
}

export default function CatalogTruth() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("program_public_render_state" as any)
        .select("*")
        .order("title");
      setRows(((data as any[]) ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q ? true : r.title?.toLowerCase().includes(q.toLowerCase())
  );

  const byTier = (tier: string) =>
    filtered.filter((r) => r.public_status?.tier === tier);

  const sections = [
    { tier: "accreditation_track", label: "Accreditation Track", lede: "Programs that meet the institutional baseline for external accreditation review." },
    { tier: "pilot", label: "Pilot", lede: "Pilot curriculum — not yet open for external enrollment." },
    { tier: "experimental", label: "Experimental", lede: "Experimental — not accreditation-ready." },
    { tier: "research_innovation", label: "Research & Innovation", lede: "Distinct research/innovation tracks." },
    { tier: "internal_distinction", label: "Internal Distinction", lede: "Internal honorific recognition only. Not an external degree." },
    { tier: "curriculum_pending", label: "Curriculum Pending", lede: "Currently under development." },
    { tier: "archived", label: "Archived", lede: "No longer offered." },
  ];

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4">
      <Helmet>
        <title>Catalog Truth · Scroll University</title>
        <meta
          name="description"
          content="Hard separation between accreditation-track, pilot, experimental, internal distinction, and curriculum-pending programs. Every status is computed from verified evidence."
        />
      </Helmet>

      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="font-serif text-3xl text-primary">Catalog Truth</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Programs are grouped by their institutional tier. A program is only
        rendered as <em>Accreditation Track</em> when verified curriculum,
        faculty, and accreditation evidence all exist. Anything else is
        labelled honestly.
      </p>

      <Input
        placeholder="Search programs…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-6 max-w-md"
      />

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-10">
          {sections.map((s) => {
            const items = byTier(s.tier);
            if (items.length === 0) return null;
            return (
              <section key={s.tier}>
                <h2 className="font-serif text-xl text-[hsl(var(--scroll-burgundy))]">
                  {s.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({items.length})
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mb-3">{s.lede}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((r) => (
                    <Card key={r.program_id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          <Link
                            to={`/program-verification/${r.program_id}`}
                            className="hover:underline"
                          >
                            {r.title}
                          </Link>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {r.faculty ?? "—"} · {r.scroll_level ?? "—"}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <ProgramTruthPanel programId={r.program_id} compact />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic mt-10 border-t pt-3">
        Marketing language never overrides this engine. If the institutional
        evidence is missing, the catalog says so.
      </p>
    </div>
  );
}
