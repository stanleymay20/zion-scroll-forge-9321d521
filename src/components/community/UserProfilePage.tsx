/**
 * User Profile Page Component
 * Display user profile with activity feed
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, PostWithAuthor } from '@/types/community';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CommunityFeed } from './CommunityFeed';
import {
  Users,
  UserPlus,
  UserMinus,
  MessageCircle,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await legacyApiCall(`/api/community/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load profile');

      const data = await response.json();
      setProfile(data.profile);
      setIsFollowing(data.profile.isFollowing || false);
      setFollowersCount(data.profile.followersCount);
      setFollowingCount(data.profile.followingCount);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await legacyApiCall(`/api/community/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to follow user');

      const data = await response.json();
      setIsFollowing(data.following);
      setFollowersCount(prev => data.following ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="p-8 mb-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-3xl">
                {profile.firstName[0]}{profile.lastName[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-gray-600 text-lg">@{profile.username}</p>
                  <Badge className="mt-2">{profile.role}</Badge>
                </div>

                {!isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? 'outline' : 'default'}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 text-gray-700">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{profile.postsCount}</div>
                  <div className="text-sm text-gray-600">Posts</div>
                </div>
                <div className="text-center cursor-pointer hover:text-blue-600" onClick={() => setActiveTab('followers')}>
                  <div className="text-2xl font-bold text-gray-900">{followersCount}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="text-center cursor-pointer hover:text-blue-600" onClick={() => setActiveTab('following')}>
                  <div className="text-2xl font-bold text-gray-900">{followingCount}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Activity Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <CommunityFeed
              filters={{ userId }}
            />
          </TabsContent>

          <TabsContent value="followers" className="mt-6">
            <FollowersList userId={userId!} />
          </TabsContent>

          <TabsContent value="following" className="mt-6">
            <FollowingList userId={userId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Followers List Component
const FollowersList: React.FC<{ userId: string }> = ({ userId }) => {
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowers();
  }, [userId]);

  const loadFollowers = async () => {
    try {
      const response = await legacyApiCall(`/api/community/users/${userId}/followers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load followers');

      const data = await response.json();
      setFollowers(data.followers);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (followers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No followers yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {followers.map(follower => (
        <UserCard key={follower.id} user={follower} />
      ))}
    </div>
  );
};

// Following List Component
const FollowingList: React.FC<{ userId: string }> = ({ userId }) => {
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowing();
  }, [userId]);

  const loadFollowing = async () => {
    try {
      const response = await legacyApiCall(`/api/community/users/${userId}/following`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load following');

      const data = await response.json();
      setFollowing(data.following);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Not following anyone yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {following.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};

// User Card Component
const UserCard: React.FC<{ user: UserProfile }> = ({ user }) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback>
            {user.firstName[0]}{user.lastName[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-sm text-gray-600">@{user.username}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span>{user.followersCount} followers</span>
            <span>{user.postsCount} posts</span>
          </div>
        </div>

        <Button size="sm" variant="outline">
          View Profile
        </Button>
      </div>
    </Card>
  );
};

export default UserProfilePage;
