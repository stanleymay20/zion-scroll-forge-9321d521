/**
 * Group Members Component
 * Displays and manages study group members
 */

import React from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Crown, Shield, User, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudyGroupMemberWithUser, GroupMemberRole } from '@/types/study-group';
import { useToast } from '@/hooks/use-toast';

interface GroupMembersProps {
  groupId: string;
  members: StudyGroupMemberWithUser[];
  userRole?: GroupMemberRole;
  onMemberUpdate: () => void;
}

export const GroupMembers: React.FC<GroupMembersProps> = ({
  groupId,
  members,
  userRole,
  onMemberUpdate
}) => {
  const { toast } = useToast();
  const isOwner = userRole === GroupMemberRole.OWNER;

  const handleUpdateRole = async (userId: string, newRole: GroupMemberRole) => {
    try {
      const response = await legacyApiCall(`/api/study-groups/${groupId}/members/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: newRole })
        }
      );

      if (!response.ok) throw new Error('Failed to update role');

      toast({
        title: 'Success',
        description: 'Member role updated'
      });

      onMemberUpdate();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await legacyApiCall(`/api/study-groups/${groupId}/members/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to remove member');

      toast({
        title: 'Success',
        description: 'Member removed from group'
      });

      onMemberUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive'
      });
    }
  };

  const getRoleIcon = (role: GroupMemberRole) => {
    switch (role) {
      case GroupMemberRole.OWNER:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case GroupMemberRole.MODERATOR:
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: GroupMemberRole) => {
    const variants: Record<GroupMemberRole, any> = {
      [GroupMemberRole.OWNER]: 'default',
      [GroupMemberRole.MODERATOR]: 'secondary',
      [GroupMemberRole.MEMBER]: 'outline'
    };

    return (
      <Badge variant={variants[role]} className="flex items-center gap-1">
        {getRoleIcon(role)}
        {role}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.user.avatarUrl} />
                  <AvatarFallback>
                    {member.user.firstName[0]}{member.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">
                    {member.user.firstName} {member.user.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{member.user.username}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getRoleBadge(member.role)}
                
                {isOwner && member.role !== GroupMemberRole.OWNER && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role !== GroupMemberRole.MODERATOR && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.userId, GroupMemberRole.MODERATOR)}
                        >
                          Make Moderator
                        </DropdownMenuItem>
                      )}
                      {member.role === GroupMemberRole.MODERATOR && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.userId, GroupMemberRole.MEMBER)}
                        >
                          Remove Moderator
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-destructive"
                      >
                        Remove from Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
