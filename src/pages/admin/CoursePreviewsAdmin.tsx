import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Save, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CourseRow {
  id: string;
  title: string;
  faculty: string | null;
  preview_video_url: string | null;
}

export default function CoursePreviewsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-course-previews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,faculty,preview_video_url")
        .order("title");
      if (error) throw error;
      return (data || []) as CourseRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      const { error } = await supabase
        .from("courses")
        .update({ preview_video_url: url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preview video updated");
      qc.invalidateQueries({ queryKey: ["admin-course-previews"] });
    },
    onError: (e: any) => toast.error("Save failed", { description: e.message }),
  });

  const handleUpload = async (course: CourseRow, file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100 MB");
      return;
    }
    setUploadingId(course.id);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${course.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("course-previews")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("course-previews").getPublicUrl(path);
      await saveMutation.mutateAsync({ id: course.id, url: pub.publicUrl });
    } catch (e: any) {
      toast.error("Upload failed", { description: e.message });
    } finally {
      setUploadingId(null);
    }
  };

  const filtered = (courses || []).filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <PageTemplate
      title="Course Preview Videos"
      description="Upload or paste a preview video URL for each course."
    >
      <div className="space-y-4">
        <Input
          placeholder="Filter courses…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((course) => {
              const current = edits[course.id] ?? course.preview_video_url ?? "";
              const dirty = current !== (course.preview_video_url ?? "");
              return (
                <Card key={course.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      <span className="break-words">{course.title}</span>
                      {course.faculty && (
                        <Badge variant="outline" className="text-[10px]">
                          {course.faculty}
                        </Badge>
                      )}
                      {course.preview_video_url && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Play className="h-3 w-3 mr-1" /> Has preview
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="https://… preview video URL"
                        value={current}
                        onChange={(e) =>
                          setEdits((prev) => ({ ...prev, [course.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!dirty || saveMutation.isPending}
                          onClick={() =>
                            saveMutation.mutate({
                              id: course.id,
                              url: current.trim() || null,
                            })
                          }
                        >
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                        <label className="inline-flex">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadingId === course.id}
                            asChild
                          >
                            <span>
                              {uploadingId === course.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-1" />
                              )}
                              Upload
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(course, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {course.preview_video_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              saveMutation.mutate({ id: course.id, url: null })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {course.preview_video_url && (
                      <video
                        src={course.preview_video_url}
                        controls
                        className="w-full max-w-md rounded border"
                        preload="metadata"
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No courses match.</p>
            )}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
