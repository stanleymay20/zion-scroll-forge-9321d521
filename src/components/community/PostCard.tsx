/**
 * Post Card Component
 * Individual post display with interactions
 */

import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/contexts/AuthContext';
import { PostWithAuthor, PostType } from '@/types/community';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { CommentSection } from './CommentSection';
import { PostMediaGallery } from './PostMediaGallery';
import { ScriptureReferences } from './ScriptureReferences';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  Pin,
  Eye,
  Bookmark
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: PostWithAuthor;
  onUpdate: (post: PostWithAuthor) => void;
  onDelete: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isFollowing, setIsFollowing] = useState(post.isFollowing || false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isOwnPost = user?.id === post.authorId;

  const handleLike = async () => {
    if (!user) {
      const { toast } = await import('sonner');
      toast.error('Sign in required', { description: 'Please sign in to like posts.' });
      return;
    }
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('sonner');
    const wasLiked = isLiked;
    // optimistic
    setIsLiked(!wasLiked);
    setLikesCount((c) => c + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      }
    } catch (err: any) {
      // rollback
      setIsLiked(wasLiked);
      setLikesCount((c) => c + (wasLiked ? 1 : -1));
      console.error('Like failed:', err);
      toast.error('Could not update like', { description: err?.message });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community/posts/${post.id}`;
    const shareData = {
      title: 'ScrollUniversity Community',
      text: 'Check out this post on ScrollUniversity',
      url: shareUrl,
    };
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      const { toast } = await import('sonner');
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Error sharing post:', error);
      const { toast } = await import('sonner');
      toast.error('Could not share', { description: 'Please try copying the link manually.' });
    }
  };

  const handleFollow = async () => {
    if (!user) {
      const { toast } = await import('sonner');
      toast.error('Sign in required', { description: 'Please sign in to follow authors.' });
      return;
    }
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('sonner');
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', post.authorId);
        if (error) throw error;
        toast.success('Unfollowed');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: post.authorId });
        if (error) throw error;
        toast.success('Following');
      }
    } catch (err: any) {
      setIsFollowing(wasFollowing);
      console.error('Follow failed:', err);
      toast.error('Could not update follow', { description: err?.message });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;
      const { toast } = await import('sonner');
      toast.success('Post deleted');
      onDelete(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      const { toast } = await import('sonner');
      toast.error('Could not delete post', {
        description: 'You may not have permission, or the post no longer exists.',
      });
    }
  };

  const getPostTypeColor = (type: PostType) => {
    switch (type) {
      case PostType.QUESTION:
        return 'bg-blue-100 text-blue-800';
      case PostType.ANNOUNCEMENT:
        return 'bg-purple-100 text-purple-800';
      case PostType.TESTIMONY:
        return 'bg-green-100 text-green-800';
      case PostType.PRAYER_REQUEST:
        return 'bg-yellow-100 text-yellow-800';
      case PostType.RESOURCE:
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContent = () => {
    // First sanitize the raw content to prevent XSS
    let content = DOMPurify.sanitize(post.content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

    // Highlight hashtags (safe since content is now sanitized)
    content = content.replace(/#(\w+)/g, '<span class="text-blue-600 font-medium cursor-pointer hover:underline">#$1</span>');

    // Highlight mentions
    content = content.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium cursor-pointer hover:underline">@$1</span>');

    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.author.avatarUrl} />
            <AvatarFallback>
              {post.author.firstName[0]}{post.author.lastName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                {post.author.firstName} {post.author.lastName}
              </h3>
              <span className="text-gray-500 text-sm">@{post.author.username}</span>
              {!isOwnPost && !isFollowing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFollow}
                  disabled
                  title="Launching with the next release"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Follow
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 text-sm">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
              {post.isEdited && (
                <span className="text-gray-400 text-xs">(edited)</span>
              )}
              {post.isPinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwnPost ? (
              <>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                  <Flag className="w-4 h-4 mr-2" />
                  Report Post
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save Post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Type Badge */}
      {post.type !== PostType.TEXT && (
        <Badge className={`mb-3 ${getPostTypeColor(post.type)}`}>
          {post.type.replace('_', ' ').toUpperCase()}
        </Badge>
      )}

      {/* Content */}
      <div className="mb-4 text-gray-800 whitespace-pre-wrap">
        {renderContent()}
      </div>

      {/* Scripture References */}
      {post.scriptureReferences && post.scriptureReferences.length > 0 && (
        <ScriptureReferences references={post.scriptureReferences} />
      )}

      {/* Media Gallery */}
      {post.media && post.media.length > 0 && (
        <PostMediaGallery media={post.media} />
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {post.hashtags.map((tag) => (
            <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-blue-50">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {post.viewsCount} views
        </span>
        <span>{likesCount} likes</span>
        <span>{commentsCount} comments</span>
        <span>{post.sharesCount} shares</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
        <Button
          variant={isLiked ? "default" : "ghost"}
          size="sm"
          onClick={handleLike}
          disabled
          title="Launching with the next release"
          className="flex-1"
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
          {isLiked ? 'Liked' : 'Like'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="flex-1"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Comment
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex-1"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-6 pt-6 border-t">
          <CommentSection
            postId={post.id}
            onCommentAdded={() => setCommentsCount(prev => prev + 1)}
          />
        </div>
      )}
    </Card>
  );
};
