import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function OutcomesAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<any[]>([]);
  const [recompute, setRecompute] = useState({
    program_id: "",
    cohort_year: new Date().getFullYear(),
    window_start: "",
    window_end: "",
    publish: false,
  });

  async function load() {
    const { data } = await supabase
      .from("employment_verifications" as any)
      .select("*")
      .in("verification_state", ["self_reported", "partially_verified"])
      .order("created_at", { ascending: false })
      .limit(100);
    setPending((data as any[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function verify(id: string, state: "employer_verified" | "partially_verified" | "rejected") {
    const patch: any = {
      verification_state: state,
      reviewer_user_id: user?.id,
      reviewer_role: "registrar",
      verified_at: new Date().toISOString(),
      verification_method: state === "rejected" ? "review_rejected" : "employer_contact",
      recheck_due_at: state === "employer_verified"
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
        : null,
    };
    const { error } = await supabase.from("employment_verifications" as any).update(patch).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: `Marked ${state.replace("_", " ")}` });
    load();
  }

  async function runRecompute() {
    const { data, error } = await supabase.rpc("recompute_cohort_outcomes" as any, {
      _program_id: recompute.program_id,
      _cohort_year: Number(recompute.cohort_year),
      _window_start: recompute.window_start,
      _window_end: recompute.window_end,
      _publish: recompute.publish,
    });
    if (error) return toast({ title: "Recompute failed", description: error.message, variant: "destructive" });
    toast({ title: "Cohort metric saved", description: `id=${data}` });
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <h1 className="font-serif text-3xl text-primary mb-6">Outcomes Verification</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle>Pending employment verifications</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending records.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <div key={r.id} className="border rounded p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{r.job_title} · {r.employer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      user {r.user_id.slice(0, 8)} · {r.country ?? "—"} · {r.start_date ?? "—"} · state: {r.verification_state}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => verify(r.id, "partially_verified")}>Partial</Button>
                    <Button size="sm" onClick={() => verify(r.id, "employer_verified")}>Employer-verified</Button>
                    <Button size="sm" variant="destructive" onClick={() => verify(r.id, "rejected")}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recompute & publish cohort metrics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Program ID</Label><Input value={recompute.program_id} onChange={(e) => setRecompute({ ...recompute, program_id: e.target.value })} /></div>
          <div><Label>Cohort year</Label><Input type="number" value={recompute.cohort_year} onChange={(e) => setRecompute({ ...recompute, cohort_year: Number(e.target.value) })} /></div>
          <div><Label>Reporting window start</Label><Input type="date" value={recompute.window_start} onChange={(e) => setRecompute({ ...recompute, window_start: e.target.value })} /></div>
          <div><Label>Reporting window end</Label><Input type="date" value={recompute.window_end} onChange={(e) => setRecompute({ ...recompute, window_end: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={recompute.publish} onChange={(e) => setRecompute({ ...recompute, publish: e.target.checked })} />
            Publish (only succeeds if verified sample ≥ 5)
          </label>
          <Button className="md:col-span-2" onClick={runRecompute} disabled={!recompute.program_id || !recompute.window_start || !recompute.window_end}>
            Recompute
          </Button>
          <p className="text-xs text-muted-foreground md:col-span-2 italic">
            If verified sample &lt; 5, the cohort row is stored but stays private with an "insufficient evidence" reason.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
