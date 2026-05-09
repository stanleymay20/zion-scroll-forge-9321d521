/**
 * Comment Section Component
 * Display and manage comments on posts
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModerationStatus } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';
import { CommentWithAuthor } from '@/types/community';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Reply, MoreVertical, Trash2, Flag, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface CommentSectionProps {
  postId: string;
  onCommentAdded: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const mapRow = (row: any, likedIds: Set<string>): CommentWithAuthor => {
    const profile = row.profiles || {};
    const fullName: string = profile.full_name || profile.email || 'User';
    const parts = fullName.trim().split(/\s+/);
    return {
      id: row.id,
      postId: row.post_id,
      authorId: row.user_id,
      content: row.content,
      isEdited: false,
      likesCount: row.likes_count || 0,
      flagged: false,
      moderationStatus: ModerationStatus.APPROVED,
      createdAt: row.created_at,
      updatedAt: row.created_at,
      isLiked: likedIds.has(row.id),
      author: {
        id: row.user_id,
        username: profile.email?.split('@')[0] || 'user',
        firstName: parts[0] || 'U',
        lastName: parts[1] || '',
        avatarUrl: profile.avatar_url,
        role: 'student',
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
      },
      replies: [],
    };
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*, profiles:user_id(email, full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      let likedIds = new Set<string>();
      if (user && data && data.length > 0) {
        const ids = data.map((c: any) => c.id);
        const { data: likes } = await supabase
          .from('post_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', ids);
        likedIds = new Set((likes || []).map((l: any) => l.comment_id));
      }
      setComments((data || []).map((r: any) => mapRow(r, likedIds)));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: user.id, content: newComment })
        .select('*, profiles:user_id(email, full_name, avatar_url)')
        .single();
      if (error) throw error;

      setComments((prev) => [...prev, mapRow(data, new Set())]);
      setNewComment('');
      setReplyingTo(null);
      onCommentAdded();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const { supabase } = await import('@/integrations/supabase/client');

    // Find current state
    let currentLiked = false;
    const findInTree = (list: CommentWithAuthor[]): void => {
      for (const c of list) {
        if (c.id === commentId) currentLiked = !!c.isLiked;
        if (c.replies) findInTree(c.replies);
      }
    };
    findInTree(comments);

    // Optimistic update
    const updateTree = (list: CommentWithAuthor[]): CommentWithAuthor[] =>
      list.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: !currentLiked,
            likesCount: Math.max(0, (c.likesCount || 0) + (currentLiked ? -1 : 1)),
          };
        }
        if (c.replies) return { ...c, replies: updateTree(c.replies) };
        return c;
      });
    setComments((prev) => updateTree(prev));

    try {
      if (currentLiked) {
        const { error } = await supabase
          .from('post_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Rollback
      setComments((prev) => updateTree(prev));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await legacyApiCall(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const renderComment = (comment: CommentWithAuthor, isReply = false) => {
    const isOwnComment = user?.id === comment.authorId;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.author.avatarUrl} />
            <AvatarFallback>
              {comment.author.firstName[0]}{comment.author.lastName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {comment.author.firstName} {comment.author.lastName}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {comment.isEdited && (
                    <span className="text-gray-400 text-xs">(edited)</span>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwnComment ? (
                      <DropdownMenuItem
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-gray-800">{comment.content}</p>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center gap-1 ${
                  comment.isLiked ? 'text-red-600' : 'text-gray-500'
                } hover:text-red-600`}
              >
                <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />
                {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
              </button>

              {!isReply && (
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              )}
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Comment Input */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            {replyingTo && (
              <div className="mb-2 text-sm text-gray-600">
                Replying to comment...
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="ml-2"
                >
                  Cancel
                </Button>
              </div>
            )}
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                size="sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Comment'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div>
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};
