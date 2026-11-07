/**
 * Sprint CT2.1 — Module Content Review Queue
 *
 * UI surface for PR #2's content-authority RPCs. Modules move through:
 *
 *   draft → faculty_reviewed (via review_module_content with decision='approve')
 *   draft ← faculty_reviewed  (via review_module_content with decision='reject' or 'revision_needed')
 *   faculty_reviewed → published (via publish_module_content — admin/superadmin only;
 *                                 requires an independent reviewer and a clean
 *                                 evaluate_module_quality pass)
 *
 * No state machine lives in this page — all transitions go through the two
 * server RPCs. The content-authority field guard (migration 20260907104000)
 * blocks any attempt to update review_state or reviewed_by/at outside those
 * RPCs, so this page cannot bypass the authority layer even with service_role.
 *
 * Any direct edit to content_md automatically bumps revision + resets to
 * draft + clears reviewed_by (enforced server-side by
 * enforce_module_content_change_authority trigger). This page does not edit
 * content_md — authoring happens elsewhere.
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileCheck2, ChevronRight, RefreshCw, ShieldCheck, ShieldAlert, Sparkles, UserCheck,
} from "lucide-react";

type ReviewState = "draft" | "faculty_reviewed" | "published" | "retired";

type ModuleRow = {
  id: string;
  title: string;
  course_id: string | null;
  order_index: number | null;
  content_review_state: ReviewState;
  content_revision: number | null;
  content_source: string | null;
  content_model: string | null;
  content_reviewed_by: string | null;
  content_reviewed_at: string | null;
  content_changed_by: string | null;
  quality_verified: boolean | null;
};

type VersionRow = {
  id: string;
  module_id: string;
  revision: number;
  content_hash: string;
  source: string | null;
  model: string | null;
  changed_by: string | null;
  created_at: string;
};

const STATE_LABEL: Record<ReviewState, string> = {
  draft: "Draft",
  faculty_reviewed: "Faculty reviewed",
  published: "Published",
  retired: "Retired",
};

const STATE_TINT: Record<ReviewState, string> = {
  draft: "bg-muted text-muted-foreground",
  faculty_reviewed: "bg-amber-500/15 text-amber-700",
  published: "bg-emerald-600 text-emerald-50",
  retired: "bg-rose-500/15 text-rose-700",
};

const SOURCE_TINT: Record<string, string> = {
  legacy: "bg-slate-500/15 text-slate-700",
  human_edit: "bg-sky-500/15 text-sky-700",
  ai_generated: "bg-violet-500/15 text-violet-700",
  imported: "bg-cyan-500/15 text-cyan-700",
  migration: "bg-stone-500/15 text-stone-700",
};

const QUEUE_TABS: {
  key: "inbox" | "reviewed" | "live" | "retired" | "all";
  label: string;
  states: ReviewState[];
}[] = [
  { key: "inbox",    label: "Draft (awaiting review)", states: ["draft"] },
  { key: "reviewed", label: "Faculty-reviewed",        states: ["faculty_reviewed"] },
  { key: "live",     label: "Published",               states: ["published"] },
  { key: "retired",  label: "Retired",                 states: ["retired"] },
  { key: "all",      label: "All",                     states: ["draft","faculty_reviewed","published","retired"] },
];

type Decision = "approve" | "reject" | "revision_needed";

export default function ModuleContentReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<typeof QUEUE_TABS[number]["key"]>("inbox");
  const [openModule, setOpenModule] = useState<ModuleRow | null>(null);
  const [feedback, setFeedback] = useState("");
  const [qualityScore, setQualityScore] = useState<string>("");

  const activeStates = useMemo(
    () => QUEUE_TABS.find((t) => t.key === tab)!.states,
    [tab],
  );

  // User's roles — publish is admin/superadmin only. Query returns raw rows so
  // we can tell the user up-front whether the Publish button is enabled.
  const { data: roles } = useQuery({
    queryKey: ["content-review-user-roles", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as string[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
      const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return ((data as { role: string }[]) ?? []).map((r) => r.role);
    },
  });
  const canPublish = (roles ?? []).some((r) => r === "admin" || r === "superadmin");

  const { data: modules, isLoading, refetch } = useQuery({
    queryKey: ["module-content-queue", tab],
    queryFn: async () => {
      // PR #2 added review columns to course_modules; the generated Supabase
      // types may not reflect them in every fresh pull, so cast through unknown.
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            in: (col: string, vals: unknown[]) => {
              order: (col: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      };
      const { data, error } = await sb
        .from("course_modules")
        .select(
          [
            "id", "title", "course_id", "order_index",
            "content_review_state", "content_revision", "content_source",
            "content_model", "content_reviewed_by", "content_reviewed_at",
            "content_changed_by", "quality_verified",
          ].join(", "),
        )
        .in("content_review_state", activeStates as unknown as string[])
        .order("content_reviewed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as ModuleRow[]) ?? [];
    },
  });

  const { data: versions } = useQuery({
    queryKey: ["module-content-versions", openModule?.id ?? null],
    enabled: !!openModule,
    queryFn: async () => {
      if (!openModule) return [] as VersionRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      };
      const { data, error } = await sb
        .from("module_content_versions")
        .select("id, module_id, revision, content_hash, source, model, changed_by, created_at")
        .eq("module_id", openModule.id)
        .order("revision", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as VersionRow[]) ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ moduleId, decision }: { moduleId: string; decision: Decision }) => {
      const rpc = supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
      const parsedScore = qualityScore.trim() === "" ? null : Number(qualityScore);
      const { data, error } = await rpc("review_module_content", {
        p_module_id: moduleId,
        p_decision: decision,
        p_feedback: feedback.trim() || null,
        p_quality_score: Number.isFinite(parsedScore as number) ? parsedScore : null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module-content-queue"] });
      qc.invalidateQueries({ queryKey: ["module-content-versions"] });
      toast.success("Review recorded");
      setOpenModule(null);
      setFeedback("");
      setQualityScore("");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Review failed: ${message}`);
    },
  });

  const publish = useMutation({
    mutationFn: async (moduleId: string) => {
      const rpc = supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
      const { data, error } = await rpc("publish_module_content", {
        p_module_id: moduleId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module-content-queue"] });
      toast.success("Module published");
      setOpenModule(null);
    },
    onError: (e: unknown) => {
      // Surface the two most important failure reasons explicitly so the
      // reviewer knows why publication was blocked.
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("independent_module_review_required")) {
        toast.error(
          "Publish blocked: an independent reviewer (not the module's author) must approve this revision first.",
        );
      } else if (message.includes("module_quality_gate_failed")) {
        toast.error(
          "Publish blocked: evaluate_module_quality reported issues on this revision.",
        );
      } else if (message.includes("module_publish_forbidden")) {
        toast.error("Publish blocked: admin/superadmin role required.");
      } else {
        toast.error(`Publish failed: ${message}`);
      }
    },
  });

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileCheck2 className="h-6 w-6" aria-hidden="true" /> Module Content Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Sprint CT2.1 — modules reach students only at{" "}
            <b>published</b> + quality-verified. Review happens on the current
            revision; publication requires an <b>independent</b> reviewer.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} aria-label="Refresh queue">
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          {QUEUE_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {QUEUE_TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="space-y-2 mt-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && (modules?.length ?? 0) === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No modules in this bucket.
                </CardContent>
              </Card>
            )}
            {(modules ?? []).map((m) => (
              <Card key={m.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{m.title}</CardTitle>
                      <CardDescription className="text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          module <code className="text-[10px]">{m.id.slice(0, 8)}</code>
                        </span>
                        {m.order_index != null && <span>· order {m.order_index}</span>}
                        {m.content_revision != null && <span>· rev {m.content_revision}</span>}
                        {m.content_source && (
                          <Badge
                            className={SOURCE_TINT[m.content_source] ?? "bg-muted text-muted-foreground"}
                            variant="secondary"
                          >
                            {m.content_source}
                            {m.content_model ? ` · ${m.content_model}` : ""}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={STATE_TINT[m.content_review_state]}>
                        {STATE_LABEL[m.content_review_state]}
                      </Badge>
                      {m.quality_verified ? (
                        <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> quality verified
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {m.content_reviewed_at
                      ? <>reviewed {new Date(m.content_reviewed_at).toLocaleString()}</>
                      : <>not yet reviewed</>}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Open review for ${m.title}`}
                    onClick={() => {
                      setOpenModule(m);
                      setFeedback("");
                      setQualityScore("");
                    }}
                  >
                    Open <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!openModule} onOpenChange={(open) => !open && setOpenModule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> {openModule?.title}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <span>State:</span>
              {openModule && (
                <Badge className={STATE_TINT[openModule.content_review_state]}>
                  {STATE_LABEL[openModule.content_review_state]}
                </Badge>
              )}
              {openModule?.content_revision != null && (
                <span className="text-xs text-muted-foreground">rev {openModule.content_revision}</span>
              )}
              {openModule?.content_source && (
                <Badge
                  variant="secondary"
                  className={SOURCE_TINT[openModule.content_source] ?? "bg-muted text-muted-foreground"}
                >
                  {openModule.content_source}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {openModule && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">
                  Review this revision
                </Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="feedback" className="text-xs">
                      Feedback (optional)
                    </Label>
                    <Textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Scripture references verified; approve for publish."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quality" className="text-xs">
                      Quality score (optional, 0–100)
                    </Label>
                    <Input
                      id="quality"
                      type="number"
                      min={0}
                      max={100}
                      value={qualityScore}
                      onChange={(e) => setQualityScore(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Review decisions">
                  <Button
                    size="sm"
                    onClick={() => review.mutate({ moduleId: openModule.id, decision: "approve" })}
                    disabled={review.isPending}
                  >
                    <UserCheck className="h-4 w-4 mr-1" aria-hidden="true" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      review.mutate({ moduleId: openModule.id, decision: "revision_needed" })
                    }
                    disabled={review.isPending}
                  >
                    Request revision
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => review.mutate({ moduleId: openModule.id, decision: "reject" })}
                    disabled={review.isPending}
                  >
                    Reject
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1">
                  <ShieldAlert className="h-3 w-3 mt-0.5" aria-hidden="true" />
                  Approve moves the module to <b>faculty_reviewed</b>. Only an admin
                  can then publish, and only if a different reviewer approved — a
                  reviewer cannot publish their own approval chain.
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs uppercase text-muted-foreground">Publish</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={
                      !canPublish ||
                      publish.isPending ||
                      openModule.content_review_state !== "faculty_reviewed"
                    }
                    onClick={() => publish.mutate(openModule.id)}
                  >
                    <Sparkles className="h-4 w-4 mr-1" aria-hidden="true" /> Publish this revision
                  </Button>
                  {!canPublish && (
                    <span className="text-xs text-muted-foreground">
                      Publish is restricted to admin/superadmin.
                    </span>
                  )}
                  {openModule.content_review_state !== "faculty_reviewed" && canPublish && (
                    <span className="text-xs text-muted-foreground">
                      Module must be faculty-reviewed first.
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs uppercase text-muted-foreground">
                  Version history (immutable)
                </Label>
                <div className="mt-2 space-y-1 max-h-40 overflow-auto text-xs" role="log">
                  {(versions ?? []).length === 0 && (
                    <p className="text-muted-foreground">No versions recorded.</p>
                  )}
                  {(versions ?? []).map((v) => (
                    <div key={v.id} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-36 shrink-0">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                      <span className="font-mono">rev {v.revision}</span>
                      {v.source && (
                        <Badge
                          variant="secondary"
                          className={SOURCE_TINT[v.source] ?? "bg-muted text-muted-foreground"}
                        >
                          {v.source}
                        </Badge>
                      )}
                      {v.model && <span className="text-muted-foreground">· {v.model}</span>}
                      <span className="font-mono text-[10px] text-muted-foreground truncate">
                        {v.content_hash.slice(0, 12)}…
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenModule(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
