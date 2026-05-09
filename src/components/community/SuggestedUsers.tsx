/**
 * Suggested Users Component
 * Display suggested users to follow
 */

import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from '@/types/community';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';

export const SuggestedUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  const loadSuggestedUsers = async () => {
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      if (!me) { setLoading(false); return; }

      const { data: existing } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', me.id);
      const followedIds = new Set((existing ?? []).map(f => f.following_id));

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .neq('id', me.id)
        .limit(20);
      if (error) throw error;

      const mapped: UserProfile[] = (profiles ?? [])
        .filter(p => !followedIds.has(p.id))
        .slice(0, 5)
        .map(p => {
          const full = (p.full_name || p.email?.split('@')[0] || 'Member').trim();
          const [first, ...rest] = full.split(' ');
          return {
            id: p.id,
            firstName: first || 'Member',
            lastName: rest.join(' ') || '',
            username: (p.email?.split('@')[0] || 'member') as string,
            avatarUrl: p.avatar_url ?? undefined,
          } as UserProfile;
        });
      setUsers(mapped);
      setFollowingIds(followedIds);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      if (!me) return;

      const isFollowing = followingIds.has(userId);
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', me.id)
          .eq('following_id', userId);
        if (error) throw error;
        setFollowingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: me.id, following_id: userId });
        if (error) throw error;
        setFollowingIds(prev => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-gray-500">No suggestions available</p>
    );
  }

  return (
    <div className="space-y-4">
      {users.map(user => (
        <div key={user.id} className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback>
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">@{user.username}</p>
          </div>

          <Button
            size="sm"
            variant={followingIds.has(user.id) ? "outline" : "default"}
            onClick={() => handleFollow(user.id)}
          >
            {followingIds.has(user.id) ? 'Following' : (
              <>
                <UserPlus className="w-3 h-3 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
};
