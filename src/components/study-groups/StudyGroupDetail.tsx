/**
 * Study Group Detail Component
 * Main view for a study group with tabs for different features
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import {
  Users,
  MessageSquare,
  FileText,
  Calendar,
  Video,
  BarChart3,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudyGroupWithMembers, GroupMemberRole } from '@/types/study-group';
import { useToast } from '@/hooks/use-toast';
import { GroupChat } from './GroupChat';
import { GroupMembers } from './GroupMembers';
import { GroupDocuments } from './GroupDocuments';
import { GroupCalendar } from './GroupCalendar';
import { GroupAssignments } from './GroupAssignments';
import { GroupAnalytics } from './GroupAnalytics';
import { GroupSettings } from './GroupSettings';

interface StudyGroupDetailProps {
  groupId: string;
  onBack: () => void;
}

export const StudyGroupDetail: React.FC<StudyGroupDetailProps> = ({
  groupId,
  onBack
}) => {
  const [group, setGroup] = useState<StudyGroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const { toast } = useToast();

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await legacyApiCall(`/api/study-groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch group details');

      const data = await response.json();
      setGroup(data.group);
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartVideoCall = async () => {
    try {
      const response = await legacyApiCall(`/api/study-groups/${groupId}/video-conference/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'JITSI'
        })
      });

      if (!response.ok) throw new Error('Failed to start video call');

      const data = await response.json();
      window.open(data.joinUrl, '_blank');
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: 'Error',
        description: 'Failed to start video call',
        variant: 'destructive'
      });
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await legacyApiCall(`/api/study-groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to leave group');

      toast({
        title: 'Success',
        description: 'You have left the study group'
      });

      onBack();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave group',
        variant: 'destructive'
      });
    }
  };

  const isOwnerOrModerator = group?.userRole === GroupMemberRole.OWNER || 
                             group?.userRole === GroupMemberRole.MODERATOR;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{group.name}</h1>
              {group.isPrivate && (
                <Badge variant="secondary">Private</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{group.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {group.memberCount} members
              </span>
              {group.meetingSchedule && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {group.meetingSchedule.frequency}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleStartVideoCall} variant="outline">
            <Video className="mr-2 h-4 w-4" />
            Start Call
          </Button>
          {!isOwnerOrModerator && (
            <Button onClick={handleLeaveGroup} variant="outline">
              Leave Group
            </Button>
          )}
        </div>
      </div>

      {/* Tags */}
      {group.tags && group.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {group.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="chat">
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <FileText className="mr-2 h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
          {isOwnerOrModerator && (
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <GroupChat groupId={groupId} />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <GroupMembers
            groupId={groupId}
            members={group.members}
            userRole={group.userRole}
            onMemberUpdate={fetchGroupDetails}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <GroupDocuments groupId={groupId} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <GroupCalendar groupId={groupId} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <GroupAssignments
            groupId={groupId}
            canCreate={isOwnerOrModerator}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <GroupAnalytics groupId={groupId} />
        </TabsContent>

        {isOwnerOrModerator && (
          <TabsContent value="settings" className="space-y-4">
            <GroupSettings
              group={group}
              onUpdate={fetchGroupDetails}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
