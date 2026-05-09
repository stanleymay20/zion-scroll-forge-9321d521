import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Share2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

console.info("✝️ Community Feed — Christ governs connection");

export default function CommunityFeed() {
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const { data: posts, isLoading } = useQuery({
    queryKey: ["community-posts", activeInstitution?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles:user_id(email),
          post_comments(
            *,
            profiles:user_id(email)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeInstitution,
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("community_posts")
        .insert({ user_id: user!.id, title: "Post", content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setNewPost("");
      toast({ title: "✅ Post created!" });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setCommentText({});
      toast({ title: "💬 Comment added!" });
    },
  });

  return (
    <PageTemplate title="Community Feed" description="Connect with fellow learners">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Create Post */}
        <Card>
          <CardHeader>
            <CardTitle>Share Something</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[100px]"
            />
            <Button
              onClick={() => createPost.mutate(newPost)}
              disabled={!newPost.trim() || createPost.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Post
            </Button>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-2"><div className="h-3 w-32 bg-muted rounded" /><div className="h-2 w-20 bg-muted rounded" /></div>
                </div></CardHeader>
                <CardContent><div className="h-16 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          posts?.map((post: any) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{post.profiles?.email?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{post.profiles?.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap">{post.content}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Button variant="ghost" size="sm" disabled title="Launching with the next release">
                    <Heart className="mr-1 h-4 w-4" />
                    Like
                  </Button>
                  <Button variant="ghost" size="sm" disabled title="Launching with the next release">
                    <MessageCircle className="mr-1 h-4 w-4" />
                    {post.post_comments?.length || 0} Comments
                  </Button>
                  <Button variant="ghost" size="sm" disabled title="Launching with the next release">
                    <Share2 className="mr-1 h-4 w-4" />
                    Share
                  </Button>
                </div>

                {/* Comments */}
                {post.post_comments?.length > 0 && (
                  <div className="space-y-3 pl-4 border-l-2">
                    {post.post_comments.map((comment: any) => (
                      <div key={comment.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {comment.profiles?.email?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold">{comment.profiles?.email}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm pl-8">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    value={commentText[post.id] || ""}
                    onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                    placeholder="Write a comment..."
                    className="min-h-[60px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => addComment.mutate({ postId: post.id, content: commentText[post.id] })}
                    disabled={!commentText[post.id]?.trim() || addComment.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageTemplate>
  );
}
