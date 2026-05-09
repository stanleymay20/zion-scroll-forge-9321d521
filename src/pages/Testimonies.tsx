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

const mockTestimonies = [
  {
    id: "1",
    title: "God's Faithfulness in My Studies",
    content: "When I started at ScrollUniversity, I was struggling academically and spiritually. Through the prayer support and biblical integration in courses, God transformed my perspective. Now I see every subject as a way to understand His creation better. Praise God!",
    author: "Sarah M.",
    category: "Academic",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "2",
    title: "Healed Through Community",
    content: "The fellowship at ScrollUniversity has been life-changing. When I faced personal crisis, my study group became my prayer warriors. God used this community to heal my broken heart and restore my faith.",
    author: "Michael T.",
    category: "Spiritual Growth",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "3",
    title: "Called to Ministry",
    content: "Through the Theology courses and AI tutor discussions, God clarified my calling to ministry. The deep biblical teaching and spiritual formation have equipped me for service. I'm now pursuing ordination!",
    author: "Pastor James L.",
    category: "Calling",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export default function Testimonies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTestimony, setNewTestimony] = useState({ title: "", content: "", category: "" });

  const { data: testimonies, isLoading } = useQuery({
    queryKey: ["testimonies"],
    queryFn: async () => {
      return mockTestimonies;
    },
  });

  const submitTestimony = useMutation({
    mutationFn: async (testimony: typeof newTestimony) => {
      toast({ title: "🙏 Testimony submitted!" });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonies"] });
      setIsOpen(false);
      setNewTestimony({ title: "", content: "", category: "" });
    },
  });

  return (
    <PageTemplate title="Testimonies" description="Share how God is working in your life">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Action */}
        <div className="flex justify-end">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
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
                  Submit Testimony
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Testimonies Feed */}
        {isLoading ? (
          <div className="text-center py-8">Loading testimonies...</div>
        ) : (
          <div className="space-y-4">
            {testimonies?.map((testimony) => (
              <Card key={testimony.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle>{testimony.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{testimony.author}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(testimony.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{testimony.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap leading-relaxed">{testimony.content}</p>
                  
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Button variant="ghost" size="sm" disabled title="Launching with the next release">
                      <Heart className="mr-1 h-4 w-4" />
                      Encourage
                    </Button>
                    <Button variant="ghost" size="sm" disabled title="Launching with the next release">
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
