/**
 * Group Settings Component
 * Settings management for study group owners/moderators
 */

import React, { useState } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudyGroupWithMembers, MeetingFrequency, StudyGroupStatus } from '@/types/study-group';
import { useToast } from '@/hooks/use-toast';

interface GroupSettingsProps {
  group: StudyGroupWithMembers;
  onUpdate: () => void;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({ group, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description,
    isPrivate: group.isPrivate,
    maxMembers: group.maxMembers,
    status: group.status,
    meetingFrequency: group.meetingSchedule?.frequency || '',
    meetingDay: group.meetingSchedule?.dayOfWeek?.toString() || '',
    meetingTime: group.meetingSchedule?.time || ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setLoading(true);

      const meetingSchedule = formData.meetingFrequency ? {
        frequency: formData.meetingFrequency as MeetingFrequency,
        dayOfWeek: formData.meetingDay ? parseInt(formData.meetingDay) : undefined,
        time: formData.meetingTime || undefined,
        timezone: group.meetingSchedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        duration: group.meetingSchedule?.duration || 60
      } : undefined;

      const response = await legacyApiCall(`/api/study-groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isPrivate: formData.isPrivate,
          maxMembers: formData.maxMembers,
          status: formData.status,
          meetingSchedule
        })
      });

      if (!response.ok) throw new Error('Failed to update group');

      toast({
        title: 'Success',
        description: 'Group settings updated successfully'
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await legacyApiCall(`/api/study-groups/${group.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete group');

      toast({
        title: 'Success',
        description: 'Group deleted successfully'
      });

      // Navigate back or refresh
      window.location.href = '/study-groups';
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>
            Update your study group's basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="maxMembers">Maximum Members</Label>
            <Input
              id="maxMembers"
              type="number"
              min="2"
              max="100"
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="private">Private Group</Label>
              <p className="text-sm text-muted-foreground">
                Only invited members can join
              </p>
            </div>
            <Switch
              id="private"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
            />
          </div>

          <div>
            <Label htmlFor="status">Group Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as StudyGroupStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={StudyGroupStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={StudyGroupStatus.INACTIVE}>Inactive</SelectItem>
                <SelectItem value={StudyGroupStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Schedule</CardTitle>
          <CardDescription>
            Configure regular meeting times for your group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.meetingFrequency}
              onValueChange={(value) => setFormData({ ...formData, meetingFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value={MeetingFrequency.DAILY}>Daily</SelectItem>
                <SelectItem value={MeetingFrequency.WEEKLY}>Weekly</SelectItem>
                <SelectItem value={MeetingFrequency.BIWEEKLY}>Bi-weekly</SelectItem>
                <SelectItem value={MeetingFrequency.MONTHLY}>Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.meetingFrequency && (
            <>
              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={formData.meetingDay}
                  onValueChange={(value) => setFormData({ ...formData, meetingDay: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.meetingTime}
                  onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="destructive"
          onClick={handleDeleteGroup}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Group
        </Button>

        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};
