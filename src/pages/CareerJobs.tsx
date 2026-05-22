import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Posting {
  id: string; employer_id: string; title: string; description: string; kind: string;
  location: string | null; remote: boolean; compensation: string | null;
  apply_by: string | null; status: string;
}
interface Employer { id: string; name: string; website: string | null; verified: boolean; }
interface Application {
  id: string; posting_id: string; status: string; cover_letter: string | null;
  resume_url: string | null; submitted_at: string;
}

export default function CareerJobs() {
  const { user } = useAuth();
  const [postings, setPostings] = useState<Posting[]>([]);
  const [employers, setEmployers] = useState<Record<string, Employer>>({});
  const [apps, setApps] = useState<Application[]>([]);
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Posting | null>(null);
  const [form, setForm] = useState({ cover_letter: "", resume_url: "" });

  const load = async () => {
    const { data: ps } = await supabase.from("job_postings" as any).select("*").eq("status", "open").order("created_at", { ascending: false });
    const list = (ps as any as Posting[]) || [];
    setPostings(list);
    const empIds = Array.from(new Set(list.map((p) => p.employer_id)));
    if (empIds.length) {
      const { data: es } = await supabase.from("employers" as any).select("id,name,website,verified").in("id", empIds);
      const map: Record<string, Employer> = {};
      ((es as any as Employer[]) || []).forEach((e) => { map[e.id] = e; });
      setEmployers(map);
    }
    if (user) {
      const { data: a } = await supabase.from("job_applications" as any).select("*").eq("applicant_id", user.id).order("submitted_at", { ascending: false });
      setApps((a as any as Application[]) || []);
    }
  };
  useEffect(() => { load(); }, [user]);

  const filtered = kindFilter === "all" ? postings : postings.filter((p) => p.kind === kindFilter);

  const apply = async () => {
    if (!user || !selected) { toast.error("Please sign in"); return; }
    const { error } = await supabase.from("job_applications" as any).insert({
      posting_id: selected.id,
      applicant_id: user.id,
      cover_letter: form.cover_letter || null,
      resume_url: form.resume_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted");
    setSelected(null);
    setForm({ cover_letter: "", resume_url: "" });
    load();
  };

  const withdraw = async (id: string) => {
    const { error } = await supabase.from("job_applications" as any).update({ status: "withdrawn" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawn");
    load();
  };

  const hasApplied = (postingId: string) => apps.some((a) => a.posting_id === postingId && !["withdrawn", "rejected"].includes(a.status));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Career Opportunities</h1>
        <p className="text-muted-foreground">Internships, fellowships and roles with vetted employers.</p>
      </div>

      <div className="flex items-center gap-3">
        <Label>Filter by kind</Label>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
            <SelectItem value="fellowship">Fellowship</SelectItem>
            <SelectItem value="part_time">Part-time</SelectItem>
            <SelectItem value="full_time">Full-time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="volunteer">Volunteer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const e = employers[p.employer_id];
          const applied = hasApplied(p.id);
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{p.title}</CardTitle>
                    <div className="text-sm text-muted-foreground">{e?.name || "Employer"}{e?.verified && " ✓"}</div>
                  </div>
                  <Badge variant="secondary">{p.kind.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">{p.location || (p.remote ? "Remote" : "—")}{p.remote && p.location ? " · Remote" : ""}</div>
                {p.compensation && <div className="text-sm">💰 {p.compensation}</div>}
                {p.apply_by && <div className="text-xs text-muted-foreground">Apply by {new Date(p.apply_by).toLocaleDateString()}</div>}
                <p className="text-sm line-clamp-3">{p.description}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" disabled={applied} onClick={() => setSelected(p)}>
                    {applied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!filtered.length && <p className="text-muted-foreground">No open postings.</p>}
      </div>

      {selected && (
        <Card className="border-primary">
          <CardHeader><CardTitle>Apply: {selected.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Resume URL</Label>
              <Input value={form.resume_url} onChange={(e) => setForm({ ...form, resume_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Cover Letter</Label>
              <Textarea rows={6} value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={apply}>Submit Application</Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {user && (
        <Card>
          <CardHeader><CardTitle>My Applications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {apps.map((a) => {
              const p = postings.find((x) => x.id === a.posting_id);
              return (
                <div key={a.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <div className="font-medium">{p?.title || "Posting"}</div>
                    <div className="text-xs text-muted-foreground">Submitted {new Date(a.submitted_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{a.status}</Badge>
                    {!["withdrawn", "rejected", "accepted"].includes(a.status) && (
                      <Button size="sm" variant="ghost" onClick={() => withdraw(a.id)}>Withdraw</Button>
                    )}
                  </div>
                </div>
              );
            })}
            {!apps.length && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
