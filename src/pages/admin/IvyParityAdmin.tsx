/**
 * Ivy Parity Admin
 * Admin-only CRUD for the five Ivy Parity initiative tables.
 * Sits behind RoleRoute(['admin','superadmin']) in App.tsx.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Loader2, Trophy } from "lucide-react";

type TableName =
  | "capstone_tracks"
  | "research_publications"
  | "oral_defenses"
  | "primary_source_collections"
  | "catalog_expansion_progress";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "csv" | "json";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

const tableConfig: Record<TableName, { title: string; fields: FieldDef[]; orderBy: string; primaryLabel: (r: any) => string; secondaryLabel?: (r: any) => string; statusKey?: string }> = {
  capstone_tracks: {
    title: "Capstone Tracks",
    orderBy: "faculty_area",
    primaryLabel: (r) => r.title,
    secondaryLabel: (r) => `${r.faculty_area} · Level ${r.level}`,
    statusKey: "status",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "faculty_area", label: "Faculty Area", type: "text", required: true },
      { key: "level", label: "Level (4 or 5)", type: "number", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "duration_weeks", label: "Duration (weeks)", type: "number" },
      { key: "learning_outcomes", label: "Learning outcomes (one per line)", type: "csv", placeholder: "Outcome 1\nOutcome 2" },
      { key: "prerequisites", label: "Prerequisites (one per line)", type: "csv" },
      { key: "primary_source_reading_list", label: "Reading list (JSON array of {title,author,url})", type: "json" },
      { key: "status", label: "Status", type: "select", options: ["draft", "published", "retired"], required: true },
    ],
  },
  research_publications: {
    title: "Research Publications",
    orderBy: "year",
    primaryLabel: (r) => r.title,
    secondaryLabel: (r) => `${r.venue} · ${r.year}`,
    statusKey: "status",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "authors", label: "Authors (one per line)", type: "csv", required: true },
      { key: "venue", label: "Venue", type: "text", required: true },
      { key: "year", label: "Year", type: "number", required: true },
      { key: "faculty_area", label: "Faculty Area", type: "text", required: true },
      { key: "abstract", label: "Abstract", type: "textarea" },
      { key: "external_url", label: "External URL", type: "text" },
      { key: "doi", label: "DOI", type: "text" },
      { key: "is_peer_reviewed", label: "Peer-reviewed (true/false)", type: "select", options: ["true", "false"] },
      { key: "status", label: "Status", type: "select", options: ["submitted", "under_review", "accepted", "published", "rejected"], required: true },
    ],
  },
  oral_defenses: {
    title: "Oral Defenses",
    orderBy: "defense_date",
    primaryLabel: (r) => r.candidate_name,
    secondaryLabel: (r) => `${r.degree_title} · ${r.defense_date}`,
    statusKey: "status",
    fields: [
      { key: "candidate_name", label: "Candidate name", type: "text", required: true },
      { key: "degree_title", label: "Degree title", type: "text", required: true },
      { key: "faculty_area", label: "Faculty Area", type: "text", required: true },
      { key: "examiner_names", label: "Examiners (one per line)", type: "csv" },
      { key: "defense_date", label: "Defense date", type: "date", required: true },
      { key: "abstract", label: "Abstract", type: "textarea" },
      { key: "recording_url", label: "Recording URL", type: "text" },
      { key: "scrollchain_hash", label: "ScrollChain hash", type: "text" },
      { key: "is_public", label: "Public (true/false)", type: "select", options: ["true", "false"] },
      { key: "status", label: "Status", type: "select", options: ["scheduled", "passed", "passed_with_distinction", "referred", "failed"], required: true },
    ],
  },
  primary_source_collections: {
    title: "Primary Source Collections",
    orderBy: "faculty_area",
    primaryLabel: (r) => r.name,
    secondaryLabel: (r) => `${r.provider} · ${r.faculty_area}`,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "provider", label: "Provider", type: "text", required: true },
      { key: "faculty_area", label: "Faculty Area", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "item_count", label: "Item count", type: "number" },
      { key: "access_type", label: "Access type", type: "select", options: ["open", "licensed", "partner"], required: true },
      { key: "external_url", label: "External URL", type: "text" },
      { key: "is_active", label: "Active (true/false)", type: "select", options: ["true", "false"] },
    ],
  },
  catalog_expansion_progress: {
    title: "Catalog Expansion Progress",
    orderBy: "faculty_area",
    primaryLabel: (r) => r.faculty_area,
    secondaryLabel: (r) => `${r.current_course_count} / ${r.target_course_count} courses`,
    fields: [
      { key: "faculty_area", label: "Faculty Area (unique)", type: "text", required: true },
      { key: "current_course_count", label: "Current course count", type: "number", required: true },
      { key: "target_course_count", label: "Target course count", type: "number", required: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
};

function coerceForm(values: Record<string, string>, fields: FieldDef[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const raw = values[f.key];
    if (raw === undefined || raw === "") continue;
    if (f.type === "number") out[f.key] = Number(raw);
    else if (f.type === "csv") out[f.key] = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    else if (f.type === "json") {
      try { out[f.key] = JSON.parse(raw); } catch { throw new Error(`Invalid JSON in ${f.label}`); }
    }
    else if (f.type === "select" && (raw === "true" || raw === "false")) out[f.key] = raw === "true";
    else out[f.key] = raw;
  }
  return out;
}

function valueToFormString(v: any, type: FieldDef["type"]): string {
  if (v === null || v === undefined) return "";
  if (type === "csv" && Array.isArray(v)) return v.join("\n");
  if (type === "json") return JSON.stringify(v, null, 2);
  if (type === "select" && typeof v === "boolean") return String(v);
  return String(v);
}

function RowDialog({
  table, fields, existing, onSaved,
}: { table: TableName; fields: FieldDef[]; existing?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {};
      fields.forEach((f) => { init[f.key] = valueToFormString(existing?.[f.key], f.type); });
      setValues(init);
    }
  }, [open, existing, fields]);

  const save = async () => {
    setBusy(true);
    try {
      const payload = coerceForm(values, fields);
      const q = existing
        ? supabase.from(table).update(payload).eq("id", existing.id)
        : supabase.from(table).insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast({ title: existing ? "Updated" : "Created" });
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit" : "Create"} entry</DialogTitle>
          <DialogDescription>Saved directly to the database. Public visibility depends on row status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              {f.type === "textarea" || f.type === "csv" || f.type === "json" ? (
                <Textarea
                  id={f.key}
                  rows={f.type === "json" ? 8 : 4}
                  placeholder={f.placeholder}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : f.type === "select" ? (
                <Select value={values[f.key] || ""} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.key}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TableManager({ table }: { table: TableName }) {
  const cfg = tableConfig[table];
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select("*").order(cfg.orderBy, { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [table]);

  const remove = async (id: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-serif text-xl">{cfg.title} <span className="text-sm font-sans text-muted-foreground font-normal">({rows.length})</span></CardTitle>
        <RowDialog table={table} fields={cfg.fields} onSaved={load} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet. Click <strong>New</strong> to add one.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{cfg.primaryLabel(r)}</p>
                    {cfg.statusKey && <Badge variant="outline">{r[cfg.statusKey]}</Badge>}
                  </div>
                  {cfg.secondaryLabel && (
                    <p className="text-xs text-muted-foreground truncate">{cfg.secondaryLabel(r)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <RowDialog table={table} fields={cfg.fields} existing={r} onSaved={load} />
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function IvyParityAdmin() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Helmet><title>Ivy Parity Admin | Scroll University</title></Helmet>
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-serif text-3xl font-bold">Ivy Parity Admin</h1>
          <p className="text-sm text-muted-foreground">Manage capstones, research, defenses, sources, and catalog tracker.</p>
        </div>
      </div>

      <Tabs defaultValue="capstone_tracks" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="capstone_tracks">Capstones</TabsTrigger>
          <TabsTrigger value="research_publications">Research</TabsTrigger>
          <TabsTrigger value="oral_defenses">Defenses</TabsTrigger>
          <TabsTrigger value="primary_source_collections">Sources</TabsTrigger>
          <TabsTrigger value="catalog_expansion_progress">Catalog</TabsTrigger>
        </TabsList>
        <TabsContent value="capstone_tracks"><TableManager table="capstone_tracks" /></TabsContent>
        <TabsContent value="research_publications"><TableManager table="research_publications" /></TabsContent>
        <TabsContent value="oral_defenses"><TableManager table="oral_defenses" /></TabsContent>
        <TabsContent value="primary_source_collections"><TableManager table="primary_source_collections" /></TabsContent>
        <TabsContent value="catalog_expansion_progress"><TableManager table="catalog_expansion_progress" /></TabsContent>
      </Tabs>
    </div>
  );
}
