/**
 * Community Search Component
 * Search for posts and users
 */

import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { PostWithAuthor, UserProfile } from '@/types/community';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, FileText, User } from 'lucide-react';
// Lightweight debounce (avoids lodash dependency)
function debounce<T extends (...args: any[]) => any>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  (debounced as any).cancel = () => { if (t) clearTimeout(t); };
  return debounced as T & { cancel: () => void };
}

export const CommunitySearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    posts: PostWithAuthor[];
    users: UserProfile[];
  }>({ posts: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchContent = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults({ posts: [], users: [] });
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const like = `%${searchQuery.trim()}%`;
        const [{ data: postRows }, { data: userRows }] = await Promise.all([
          supabase
            .from('community_posts')
            .select('id, content, image_url, created_at, user_id, profiles:user_id(full_name, email, avatar_url)')
            .or(`content.ilike.${like},title.ilike.${like}`)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .or(`full_name.ilike.${like},email.ilike.${like}`)
            .limit(5),
        ]);

        const mapName = (full?: string | null, email?: string | null) => {
          const base = (full || email?.split('@')[0] || 'Member').trim();
          const [first, ...rest] = base.split(' ');
          return { first: first || 'Member', last: rest.join(' ') };
        };

        const users: UserProfile[] = (userRows ?? []).map((u: any) => {
          const n = mapName(u.full_name, u.email);
          return {
            id: u.id,
            firstName: n.first,
            lastName: n.last,
            username: u.email?.split('@')[0] ?? 'member',
            avatarUrl: u.avatar_url ?? undefined,
          } as UserProfile;
        });

        const posts: PostWithAuthor[] = (postRows ?? []).map((p: any) => {
          const n = mapName(p.profiles?.full_name, p.profiles?.email);
          return {
            id: p.id,
            content: p.content,
            imageUrl: p.image_url ?? undefined,
            createdAt: p.created_at,
            author: {
              id: p.user_id,
              firstName: n.first,
              lastName: n.last,
              username: p.profiles?.email?.split('@')[0] ?? 'member',
              avatarUrl: p.profiles?.avatar_url ?? undefined,
            },
          } as unknown as PostWithAuthor;
        });

        setResults({ posts, users });
        setShowResults(true);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchContent(query);
  }, [query, searchContent]);

  const handlePostClick = (postId: string) => {
    navigate(`/community/posts/${postId}`);
    setShowResults(false);
    setQuery('');
  };

  const handleUserClick = (userId: string) => {
    navigate(`/community/users/${userId}`);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Search posts, users, or hashtags..."
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-blue-600" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (results.posts.length > 0 || results.users.length > 0) && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          {/* Users Section */}
          {results.users.length > 0 && (
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Users
              </h3>
              <div className="space-y-2">
                {results.users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {results.posts.length > 0 && (
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Posts
              </h3>
              <div className="space-y-2">
                {results.posts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post.id)}
                    className="p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={post.author.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {post.author.firstName[0]}{post.author.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {post.author.firstName} {post.author.lastName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* No Results */}
      {showResults && query && !loading && results.posts.length === 0 && results.users.length === 0 && (
        <Card className="absolute top-full mt-2 w-full p-4 z-50 shadow-lg">
          <p className="text-sm text-gray-500 text-center">No results found</p>
        </Card>
      )}
    </div>
  );
};
