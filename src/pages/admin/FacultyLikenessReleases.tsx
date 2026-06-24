/**
 * FacultyLikenessReleases — admin registry of signed likeness/voice releases
 * for AI avatars that resemble real faculty (right-of-publicity + GDPR Art. 9).
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

interface Release {
  id: string;
  faculty_name: string;
  avatar_resembles_real_person: boolean;
  voice_cloned: boolean;
  release_signed: boolean;
  release_document_url: string | null;
  release_signed_at: string | null;
  expires_at: string | null;
  scope: string | null;
  notes: string | null;
  created_at: string;
}

export default function FacultyLikenessReleases() {
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [rows, setRows] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    faculty_name: "",
    avatar_resembles_real_person: false,
    voice_cloned: false,
    release_signed: false,
    release_document_url: "",
    scope: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faculty_likeness_releases")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Release[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  if (rolesLoading) return <div className="p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const submit = async () => {
    if (!form.faculty_name.trim()) { toast.error("Faculty name is required"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("faculty_likeness_releases").insert({
      faculty_name: form.faculty_name.trim(),
      avatar_resembles_real_person: form.avatar_resembles_real_person,
      voice_cloned: form.voice_cloned,
      release_signed: form.release_signed,
      release_document_url: form.release_document_url || null,
      release_signed_at: form.release_signed ? new Date().toISOString() : null,
      scope: form.scope || null,
      notes: form.notes || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Release recorded");
    setForm({ faculty_name: "", avatar_resembles_real_person: false, voice_cloned: false, release_signed: false, release_document_url: "", scope: "", notes: "" });
    void load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <Helmet><title>Faculty Likeness Releases — Admin</title></Helmet>
      <header>
        <h1 className="text-3xl font-serif">Faculty Likeness & Voice Releases</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Right-of-publicity and GDPR Art. 9 (biometric) compliance for AI avatars resembling real faculty.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Record a release</CardTitle>
          <CardDescription>Use for any avatar/voice that resembles a real person.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Faculty name</Label>
              <Input value={form.faculty_name} onChange={(e) => setForm({ ...form, faculty_name: e.target.value })} />
            </div>
            <div>
              <Label>Release document URL</Label>
              <Input value={form.release_document_url} onChange={(e) => setForm({ ...form, release_document_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.avatar_resembles_real_person} onCheckedChange={(v) => setForm({ ...form, avatar_resembles_real_person: v })} />
              Avatar resembles real person
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.voice_cloned} onCheckedChange={(v) => setForm({ ...form, voice_cloned: v })} />
              Voice cloned
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.release_signed} onCheckedChange={(v) => setForm({ ...form, release_signed: v })} />
              Release signed
            </label>
          </div>
          <div>
            <Label>Scope (e.g. lecture avatars, marketing)</Label>
            <Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save release
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing records</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No releases recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="border rounded-md p-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[12rem]">
                    <div className="font-medium">{r.faculty_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.scope || "—"} · created {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {r.avatar_resembles_real_person && <Badge variant="outline">Likeness</Badge>}
                  {r.voice_cloned && <Badge variant="outline">Voice clone</Badge>}
                  {r.release_signed ? (
                    <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Signed</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> Unsigned</Badge>
                  )}
                  {r.release_document_url && (
                    <a className="text-xs underline" href={r.release_document_url} target="_blank" rel="noreferrer">
                      Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
