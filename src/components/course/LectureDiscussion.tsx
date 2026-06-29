/**
 * Lecture Discussion Component
 * Forum for lecture-specific discussions and Q&A
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Reply, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getUserFriendlyError } from "@/lib/errors";

interface LectureDiscussionProps {
  lectureId: string;
  courseId: string;
  userId: string;
}

interface DiscussionPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  replies: DiscussionPost[];
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function LectureDiscussion({ lectureId, courseId, userId }: LectureDiscussionProps) {
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Fetch discussion posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['discussion', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_posts')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url),
          replies:discussion_posts(
            *,
            user:profiles(id, full_name, avatar_url)
          )
        `)
        .eq('lecture_id', lectureId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    }
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase
        .from('discussion_posts')
        .insert({
          lecture_id: lectureId,
          user_id: userId,
          content,
          likes_count: 0
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', lectureId] });
      setNewPostContent('');
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Posted', {
        description: 'Your message has been posted'
      });
    },
    onError: (error: any) => {
      toast.error('Post Failed', {
        description: getUserFriendlyError(error)
      });
    }
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('discussion_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('discussion_likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;

        // Decrement likes count
        const { error: updateError } = await supabase.rpc('decrement_post_likes', {
          post_id: postId
        });

        if (updateError) throw updateError;
      } else {
        // Like
        const { error } = await supabase
          .from('discussion_likes')
          .insert({
            post_id: postId,
            user_id: userId
          });

        if (error) throw error;

        // Increment likes count
        const { error: updateError } = await supabase.rpc('increment_post_likes', {
          post_id: postId
        });

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion', lectureId] });
    }
  });

  const handlePostSubmit = () => {
    if (!newPostContent.trim()) {
      toast.error('Empty Post', {
        description: 'Please enter a message'
      });
      return;
    }

    createPostMutation.mutate({ content: newPostContent });
  };

  const handleReplySubmit = (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error('Empty Reply', {
        description: 'Please enter a reply'
      });
      return;
    }

    createPostMutation.mutate({ content: replyContent, parentId });
  };

  const handleLike = (postId: string) => {
    likePostMutation.mutate(postId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Lecture Discussion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Post Form */}
        <div className="space-y-3">
          <Textarea
            placeholder="Share your thoughts, ask questions, or discuss the lecture..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handlePostSubmit}
              disabled={createPostMutation.isPending || !newPostContent.trim()}
            >
              {createPostMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Discussion Posts */}
        {!posts || posts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              No discussions yet. Be the first to start a conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border rounded-lg p-4 space-y-3">
                {/* Post Header */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.user.avatar_url} />
                    <AvatarFallback>
                      {post.user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{post.user.full_name || 'Anonymous'}</span>
                      {post.user_id === userId && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center gap-4 pl-13">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {post.likes_count || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    Reply
                  </Button>
                </div>

                {/* Reply Form */}
                {replyingTo === post.id && (
                  <div className="pl-13 space-y-2">
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReplySubmit(post.id)}
                        disabled={createPostMutation.isPending || !replyContent.trim()}
                      >
                        {createPostMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {post.replies && post.replies.length > 0 && (
                  <div className="pl-13 space-y-3 border-l-2 border-muted ml-5">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="pl-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reply.user.avatar_url} />
                            <AvatarFallback>
                              {reply.user.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {reply.user.full_name || 'Anonymous'}
                              </span>
                              {reply.user_id === userId && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pl-11 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(reply.id)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {reply.likes_count || 0}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
