/**
 * User Profile Page Component
 * Displays user profile with follow/unfollow and follower/following lists.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CommunityFeed } from './CommunityFeed';
import { UserPlus, UserMinus, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  spiritual_profile: any;
}

interface UICardUser {
  id: string;
  name: string;
  initials: string;
  username: string;
  avatarUrl?: string | null;
  followersCount: number;
  postsCount: number;
}

const splitName = (full: string | null, email: string | null) => {
  const name = (full && full.trim()) || (email ? email.split('@')[0] : 'User');
  const parts = name.split(/\s+/);
  return {
    full: name,
    first: parts[0] || 'U',
    last: parts[1] || '',
    username: (email ? email.split('@')[0] : name).toLowerCase().replace(/\s+/g, ''),
  };
};

const initialsFor = (full: string | null, email: string | null) => {
  const { first, last } = splitName(full, email);
  return `${first[0] ?? 'U'}${last[0] ?? ''}`.toUpperCase();
};

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');

  const isOwnProfile = currentUser?.id === userId;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [{ data: profileRow }, followersRes, followingRes, postsRes, followingMeRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url, role, spiritual_profile').eq('id', userId).maybeSingle(),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        currentUser?.id
          ? supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setProfile(profileRow as ProfileRow | null);
      setFollowersCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setPostsCount(postsRes.count ?? 0);
      setIsFollowing(!!(followingMeRes as any)?.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!currentUser?.id || !userId) {
      toast.error('Please sign in to follow users');
      return;
    }
    try {
      if (isFollowing) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', currentUser.id).eq('following_id', userId);
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount((p) => Math.max(0, p - 1));
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount((p) => p + 1);
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      toast.error(error?.message || 'Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const { full, first, last, username } = splitName(profile.full_name, profile.email);
  const bio = (profile.spiritual_profile && typeof profile.spiritual_profile === 'object' && (profile.spiritual_profile as any).bio) || '';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 mb-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-3xl">
                {(first[0] ?? 'U')}{last[0] ?? ''}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{full}</h1>
                  <p className="text-muted-foreground text-lg">@{username}</p>
                  {profile.role && <Badge className="mt-2">{profile.role}</Badge>}
                </div>

                {!isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <Button onClick={handleFollow} variant={isFollowing ? 'outline' : 'default'}>
                      {isFollowing ? (
                        <><UserMinus className="w-4 h-4 mr-2" />Unfollow</>
                      ) : (
                        <><UserPlus className="w-4 h-4 mr-2" />Follow</>
                      )}
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="w-4 h-4 mr-2" />Message
                    </Button>
                  </div>
                )}
              </div>

              {bio && <p className="mt-4 text-foreground/80">{bio}</p>}

              <div className="flex items-center gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{postsCount}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div className="text-center cursor-pointer hover:text-primary" onClick={() => setActiveTab('followers')}>
                  <div className="text-2xl font-bold text-foreground">{followersCount}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center cursor-pointer hover:text-primary" onClick={() => setActiveTab('following')}>
                  <div className="text-2xl font-bold text-foreground">{followingCount}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <CommunityFeed filters={{ userId }} />
          </TabsContent>

          <TabsContent value="followers" className="mt-6">
            <RelationList userId={userId!} mode="followers" />
          </TabsContent>

          <TabsContent value="following" className="mt-6">
            <RelationList userId={userId!} mode="following" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const RelationList: React.FC<{ userId: string; mode: 'followers' | 'following' }> = ({ userId, mode }) => {
  const [users, setUsers] = useState<UICardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const column = mode === 'followers' ? 'following_id' : 'follower_id';
        const idColumn = mode === 'followers' ? 'follower_id' : 'following_id';
        const { data: rels, error } = await supabase.from('follows').select(idColumn).eq(column, userId);
        if (error) throw error;
        const ids = (rels ?? []).map((r: any) => r[idColumn]).filter(Boolean);
        if (ids.length === 0) {
          if (!cancelled) setUsers([]);
          return;
        }
        const { data: profs } = await supabase.from('profiles')
          .select('id, full_name, email, avatar_url').in('id', ids);

        const counts = await Promise.all(
          (profs ?? []).map(async (p: any) => {
            const [followersRes, postsRes] = await Promise.all([
              supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', p.id),
              supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
            ]);
            const { full, username } = splitName(p.full_name, p.email);
            return {
              id: p.id,
              name: full,
              initials: initialsFor(p.full_name, p.email),
              username,
              avatarUrl: p.avatar_url,
              followersCount: followersRes.count ?? 0,
              postsCount: postsRes.count ?? 0,
            } as UICardUser;
          })
        );
        if (!cancelled) setUsers(counts);
      } catch (e) {
        console.error('Error loading relation list:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, mode]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {users.map((u) => <UserCard key={u.id} user={u} />)}
    </div>
  );
};

const UserCard: React.FC<{ user: UICardUser }> = ({ user }) => (
  <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
    <div className="flex items-center gap-3">
      <Avatar className="w-12 h-12">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{user.name}</h3>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{user.followersCount} followers</span>
          <span>{user.postsCount} posts</span>
        </div>
      </div>
      <Button size="sm" variant="outline">View Profile</Button>
    </div>
  </Card>
);

export default UserProfilePage;
