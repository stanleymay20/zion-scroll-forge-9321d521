/**
 * Create Study Group Dialog Component
 * Form for creating new study groups
 */

import React, { useState } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MeetingFrequency } from '@/types/study-group';

interface CreateStudyGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateStudyGroupDialog: React.FC<CreateStudyGroupDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    maxMembers: 20,
    tags: [] as string[],
    interests: [] as string[],
    meetingFrequency: '' as MeetingFrequency | '',
    meetingDay: '',
    meetingTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [tagInput, setTagInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const meetingSchedule = formData.meetingFrequency ? {
        frequency: formData.meetingFrequency,
        dayOfWeek: formData.meetingDay ? parseInt(formData.meetingDay) : undefined,
        time: formData.meetingTime || undefined,
        timezone: formData.timezone,
        duration: 60
      } : undefined;

      const response = await legacyApiCall('/api/study-groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isPrivate: formData.isPrivate,
          maxMembers: formData.maxMembers,
          tags: formData.tags,
          interests: formData.interests,
          meetingSchedule
        })
      });

      if (!response.ok) throw new Error('Failed to create study group');

      toast({
        title: 'Success',
        description: 'Study group created successfully'
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating study group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create study group',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isPrivate: false,
      maxMembers: 20,
      tags: [],
      interests: [],
      meetingFrequency: '',
      meetingDay: '',
      meetingTime: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    setTagInput('');
    setInterestInput('');
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const addInterest = () => {
    if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, interestInput.trim()]
      });
      setInterestInput('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Study Group</DialogTitle>
          <DialogDescription>
            Create a collaborative space for learning together
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Advanced Theology Study Group"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose and goals of your study group..."
                rows={3}
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
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tags (e.g., theology, bible-study)"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <Label>Interests</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                placeholder="Add interests (e.g., apologetics, missions)"
              />
              <Button type="button" onClick={addInterest} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Meeting Schedule */}
          <div className="space-y-4">
            <Label>Meeting Schedule (Optional)</Label>
            
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.meetingFrequency}
                onValueChange={(value) => setFormData({ ...formData, meetingFrequency: value as MeetingFrequency })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
