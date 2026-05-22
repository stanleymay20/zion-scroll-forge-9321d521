import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Employer { id: string; name: string; website: string | null; contact_email: string | null; verified: boolean; status: string; }
interface Posting { id: string; employer_id: string; title: string; description: string; kind: string; location: string | null; remote: boolean; compensation: string | null; apply_by: string | null; status: string; }
interface Application { id: string; posting_id: string; applicant_id: string; status: string; cover_letter: string | null; resume_url: string | null; submitted_at: string; }

const STATUSES = ["submitted", "under_review", "shortlisted", "offered", "accepted", "rejected"];

export default function CareerJobsAdmin() {
  const { user } = useAuth();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [postings, setPostings] = useState<Posting[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [newEmp, setNewEmp] = useState({ name: "", website: "", contact_email: "" });
  const [newPost, setNewPost] = useState({
    employer_id: "", title: "", description: "", kind: "internship",
    location: "", remote: false, compensation: "", apply_by: "",
  });

  const load = async () => {
    const [e, p, a] = await Promise.all([
      supabase.from("employers" as any).select("*").order("name"),
      supabase.from("job_postings" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("job_applications" as any).select("*").order("submitted_at", { ascending: false }).limit(200),
    ]);
    setEmployers((e.data as any) || []);
    setPostings((p.data as any) || []);
    setApps((a.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const createEmployer = async () => {
    if (!newEmp.name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("employers" as any).insert({ ...newEmp, verified: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Employer added");
    setNewEmp({ name: "", website: "", contact_email: "" });
    load();
  };

  const toggleVerify = async (e: Employer) => {
    const { error } = await supabase.from("employers" as any).update({ verified: !e.verified }).eq("id", e.id);
    if (error) toast.error(error.message); else load();
  };

  const createPosting = async () => {
    if (!newPost.employer_id || !newPost.title || !newPost.description) { toast.error("Employer, title, description required"); return; }
    const { error } = await supabase.from("job_postings" as any).insert({
      ...newPost,
      apply_by: newPost.apply_by || null,
      posted_by: user?.id,
      status: "draft",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Posting created (draft)");
    setNewPost({ employer_id: "", title: "", description: "", kind: "internship", location: "", remote: false, compensation: "", apply_by: "" });
    load();
  };

  const setPostingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("job_postings" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Posting → ${status}`); load(); }
  };

  const decideApp = async (id: string, status: string) => {
    const { error } = await supabase.from("job_applications" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Application → ${status}`); load(); }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Career Services Admin</h1>
        <p className="text-muted-foreground">Manage employers, job postings, and applications.</p>
      </div>

      <Tabs defaultValue="postings">
        <TabsList>
          <TabsTrigger value="postings">Postings</TabsTrigger>
          <TabsTrigger value="employers">Employers</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>New Posting</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Employer</Label>
                  <Select value={newPost.employer_id} onValueChange={(v) => setNewPost({ ...newPost, employer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employer" /></SelectTrigger>
                    <SelectContent>
                      {employers.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kind</Label>
                  <Select value={newPost.kind} onValueChange={(v) => setNewPost({ ...newPost, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["internship","fellowship","part_time","full_time","contract","volunteer"].map((k) =>
                        <SelectItem key={k} value={k}>{k.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Title</Label>
                  <Input value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={newPost.location} onChange={(e) => setNewPost({ ...newPost, location: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={newPost.remote} onCheckedChange={(v) => setNewPost({ ...newPost, remote: v })} />
                  <Label>Remote</Label>
                </div>
                <div>
                  <Label>Compensation</Label>
                  <Input value={newPost.compensation} onChange={(e) => setNewPost({ ...newPost, compensation: e.target.value })} />
                </div>
                <div>
                  <Label>Apply by</Label>
                  <Input type="date" value={newPost.apply_by} onChange={(e) => setNewPost({ ...newPost, apply_by: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={5} value={newPost.description} onChange={(e) => setNewPost({ ...newPost, description: e.target.value })} />
                </div>
              </div>
              <Button onClick={createPosting}>Create Posting</Button>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            {postings.map((p) => {
              const e = employers.find((x) => x.id === p.employer_id);
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{p.title}</CardTitle>
                        <div className="text-sm text-muted-foreground">{e?.name}</div>
                      </div>
                      <Badge>{p.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>{p.kind.replace("_", " ")} · {p.location || (p.remote ? "Remote" : "—")}</div>
                    <p className="line-clamp-2">{p.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {p.status === "draft" && <Button size="sm" onClick={() => setPostingStatus(p.id, "open")}>Open</Button>}
                      {p.status === "open" && <Button size="sm" variant="secondary" onClick={() => setPostingStatus(p.id, "closed")}>Close</Button>}
                      {p.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => setPostingStatus(p.id, "archived")}>Archive</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="employers" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Employer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label>Name</Label><Input value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} /></div>
                <div><Label>Website</Label><Input value={newEmp.website} onChange={(e) => setNewEmp({ ...newEmp, website: e.target.value })} /></div>
                <div><Label>Contact Email</Label><Input value={newEmp.contact_email} onChange={(e) => setNewEmp({ ...newEmp, contact_email: e.target.value })} /></div>
              </div>
              <Button onClick={createEmployer}>Add</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {employers.map((e) => (
              <div key={e.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{e.name} {e.verified && <Badge variant="secondary" className="ml-2">verified</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{e.website || "—"} · {e.contact_email || "—"}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleVerify(e)}>
                  {e.verified ? "Unverify" : "Verify"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-2">
          {apps.map((a) => {
            const p = postings.find((x) => x.id === a.posting_id);
            return (
              <Card key={a.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{p?.title || "Posting"}</div>
                      <div className="text-xs text-muted-foreground">Applicant: {a.applicant_id.slice(0, 8)} · {new Date(a.submitted_at).toLocaleDateString()}</div>
                    </div>
                    <Badge>{a.status}</Badge>
                  </div>
                  {a.resume_url && <a href={a.resume_url} target="_blank" rel="noreferrer" className="text-sm underline">Resume</a>}
                  {a.cover_letter && <p className="text-sm whitespace-pre-wrap">{a.cover_letter}</p>}
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.filter((s) => s !== a.status && !["accepted","rejected","withdrawn"].includes(a.status)).map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => decideApp(a.id, s)}>{s}</Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!apps.length && <p className="text-muted-foreground">No applications.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
