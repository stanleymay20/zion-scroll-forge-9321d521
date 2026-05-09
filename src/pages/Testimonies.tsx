import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Heart, Share2, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

console.info("✝️ Testimonies — Christ governs testimony");

type TestimonyRow = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  status: string | null;
  user_id: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

type TestimonyView = TestimonyRow & {
  encouragements: number;
  encouraged_by_me: boolean;
  author: string;
};

export default function Testimonies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTestimony, setNewTestimony] = useState({ title: "", content: "", category: "" });

  const { data: testimonies, isLoading } = useQuery({
    queryKey: ["testimonies", user?.id],
    queryFn: async (): Promise<TestimonyView[]> => {
      const { data, error } = await supabase
        .from("testimonies")
        .select("id, title, content, category, status, user_id, created_at, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as unknown as TestimonyRow[];

      const ids = rows.map(r => r.id);
      let counts: Record<string, number> = {};
      let mine = new Set<string>();
      if (ids.length) {
        const { data: encs } = await supabase
          .from("testimony_encouragements")
          .select("testimony_id, user_id")
          .in("testimony_id", ids);
        (encs ?? []).forEach(e => {
          counts[e.testimony_id] = (counts[e.testimony_id] ?? 0) + 1;
          if (user && e.user_id === user.id) mine.add(e.testimony_id);
        });
      }

      return rows.map(r => ({
        ...r,
        author: r.profiles?.full_name || r.profiles?.email?.split("@")[0] || "Anonymous",
        encouragements: counts[r.id] ?? 0,
        encouraged_by_me: mine.has(r.id),
      }));
    },
  });

  const submitTestimony = useMutation({
    mutationFn: async (testimony: typeof newTestimony) => {
      if (!user) throw new Error("Sign in required");
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_institution_id")
        .eq("id", user.id)
        .maybeSingle();
      const { error } = await supabase.from("testimonies").insert({
        user_id: user.id,
        title: testimony.title,
        content: testimony.content,
        category: testimony.category || null,
        institution_id: profile?.current_institution_id ?? null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "🙏 Testimony submitted for review!" });
      queryClient.invalidateQueries({ queryKey: ["testimonies"] });
      setIsOpen(false);
      setNewTestimony({ title: "", content: "", category: "" });
    },
    onError: (e: any) => toast({ title: "Failed to submit", description: e.message, variant: "destructive" }),
  });

  const toggleEncourage = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      if (!user) throw new Error("Sign in required");
      if (on) {
        const { error } = await supabase
          .from("testimony_encouragements")
          .insert({ testimony_id: id, user_id: user.id });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("testimony_encouragements")
          .delete()
          .eq("testimony_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["testimonies"] }),
    onError: (e: any) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const shareTestimony = async (t: TestimonyView) => {
    const url = `${window.location.origin}/testimonies#${t.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.title, text: t.content.slice(0, 140), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied" });
      }
    } catch {
      // user dismissed
    }
  };

  return (
    <PageTemplate title="Testimonies" description="Share how God is working in your life">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-end">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button disabled={!user}>
                <Plus className="mr-2 h-4 w-4" />
                Share Your Testimony
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Share Your Testimony</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newTestimony.title}
                    onChange={(e) => setNewTestimony({ ...newTestimony, title: e.target.value })}
                    placeholder="Give your testimony a title..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    value={newTestimony.category}
                    onChange={(e) => setNewTestimony({ ...newTestimony, category: e.target.value })}
                    placeholder="e.g., Healing, Academic, Spiritual Growth"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Your Testimony</label>
                  <Textarea
                    value={newTestimony.content}
                    onChange={(e) => setNewTestimony({ ...newTestimony, content: e.target.value })}
                    placeholder="Share how God has worked in your life..."
                    className="min-h-[200px]"
                  />
                </div>
                <Button
                  onClick={() => submitTestimony.mutate(newTestimony)}
                  disabled={!newTestimony.title || !newTestimony.content || submitTestimony.isPending}
                  className="w-full"
                >
                  {submitTestimony.isPending ? "Submitting..." : "Submit Testimony"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading testimonies...</div>
        ) : !testimonies?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No testimonies yet — be the first to share how God is working in your life.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {testimonies.map((t) => (
              <Card key={t.id} id={t.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle>{t.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t.author}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                        {t.status && t.status !== "approved" && t.user_id === user?.id && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">{t.status}</Badge>
                          </>
                        )}
                      </div>
                    </div>
                    {t.category && <Badge variant="secondary">{t.category}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>

                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEncourage.mutate({ id: t.id, on: !t.encouraged_by_me })}
                      disabled={!user || toggleEncourage.isPending}
                      className={t.encouraged_by_me ? "text-primary" : ""}
                    >
                      <Heart className={`mr-1 h-4 w-4 ${t.encouraged_by_me ? "fill-current" : ""}`} />
                      Encourage{t.encouragements > 0 ? ` (${t.encouragements})` : ""}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => shareTestimony(t)}>
                      <Share2 className="mr-1 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
