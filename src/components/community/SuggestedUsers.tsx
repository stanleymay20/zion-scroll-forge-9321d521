/**
 * Suggested Users Component
 * Display suggested users to follow
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
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
      const response = await legacyApiCall('/api/community/users/suggested?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load suggested users');

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const response = await legacyApiCall(`/api/community/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to follow user');

      const data = await response.json();
      
      if (data.following) {
        setFollowingIds(prev => new Set(prev).add(userId));
      } else {
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
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
