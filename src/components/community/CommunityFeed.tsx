/**
 * Community Feed Component
 * Infinite scroll feed with posts
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from './PostCard';
import { PostWithAuthor, FeedFilters as FeedFiltersType } from '@/types/community';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CommunityFeedProps {
  filters: FeedFiltersType;
  refreshTrigger?: number;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ filters, refreshTrigger = 0 }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const limit = 20;

  const loadPosts = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setOffset(0);
      }

      const currentOffset = isLoadMore ? offset : 0;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.hashtag && { hashtag: filters.hashtag }),
        ...(filters.visibility && { visibility: filters.visibility }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await legacyApiCall(`/api/community/feed?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      const data = await response.json();

      if (isLoadMore) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }

      setHasMore(data.hasMore);
      setOffset(currentOffset + data.posts.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Initial load and filter changes
  useEffect(() => {
    loadPosts(false);
  }, [filters, refreshTrigger]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadPosts(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, loadPosts]);

  const handlePostUpdate = useCallback((updatedPost: PostWithAuthor) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  }, []);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No posts found</p>
        <p className="text-gray-400 text-sm mt-2">
          Be the first to share something with the community!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      ))}

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10">
        {loadingMore && (
          <div className="flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
};
