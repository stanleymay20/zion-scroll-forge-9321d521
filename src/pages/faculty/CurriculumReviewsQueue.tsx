import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ReviewState = "pending" | "approved" | "changes_requested" | "rejected";

interface CourseRow {
  id: string;
  title: string;
  faculty: string | null;
  level: string | null;
  reviewed_by: string | null;
  reviews: { id: string; state: ReviewState; comments: string | null; reviewed_at: string | null }[];
}

const STATE_BADGE: Record<ReviewState, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  changes_requested: { label: "Changes Requested", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
};

/**
 * PR3: Faculty curriculum review queue.
 * Lists all courses with current review state; faculty/admin can record an
 * approval, request changes, or reject — every action audited via the
 * `record_faculty_review` SECURITY DEFINER function.
 */
export default function CurriculumReviewsQueue() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: courses, isLoading } = useQuery({
    queryKey: ["faculty-curriculum-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          id, title, faculty, level, reviewed_by,
          reviews:faculty_curriculum_reviews(id, state, comments, reviewed_at)
        `)
        .order("title", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as CourseRow[];
    },
  });

  const review = useMutation({
    mutationFn: async (args: { courseId: string; state: ReviewState; comments: string | null }) => {
      const { data, error } = await supabase.rpc("record_faculty_review", {
        p_course_id: args.courseId,
        p_state: args.state,
        p_comments: args.comments,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Review recorded");
      qc.invalidateQueries({ queryKey: ["faculty-curriculum-reviews"] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to record review");
    },
  });

  return (
    <PageTemplate
      title="Curriculum Reviews"
      description="Approve, request changes on, or reject each course. Every action is audited."
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !courses?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No courses available for review.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => {
            const latest = c.reviews?.[0];
            const state: ReviewState = (latest?.state as ReviewState) ?? "pending";
            const badge = STATE_BADGE[state];
            const draft = drafts[c.id] ?? latest?.comments ?? "";

            return (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                        {c.faculty && <Badge variant="outline">{c.faculty}</Badge>}
                        {c.level && <Badge variant="outline">{c.level}</Badge>}
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {latest?.reviewed_at && (
                          <span className="text-xs text-muted-foreground">
                            last reviewed {new Date(latest.reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Comments (required for changes_requested / rejected)"
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => review.mutate({ courseId: c.id, state: "approved", comments: draft || null })}
                      disabled={review.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (!draft.trim()) {
                          toast.error("Comments required when requesting changes");
                          return;
                        }
                        review.mutate({ courseId: c.id, state: "changes_requested", comments: draft });
                      }}
                      disabled={review.isPending}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Request changes
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!draft.trim()) {
                          toast.error("Comments required when rejecting");
                          return;
                        }
                        review.mutate({ courseId: c.id, state: "rejected", comments: draft });
                      }}
                      disabled={review.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageTemplate>
  );
}
