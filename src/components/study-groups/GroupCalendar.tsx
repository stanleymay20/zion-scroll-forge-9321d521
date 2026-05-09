/**
 * Group Calendar Component
 * Event scheduling and calendar for study groups
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Calendar as CalendarIcon, Plus, Video, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GroupEvent, EventType, AttendanceStatus } from '@/types/study-group';
import { useToast } from '@/hooks/use-toast';

interface GroupCalendarProps {
  groupId: string;
}

export const GroupCalendar: React.FC<GroupCalendarProps> = ({ groupId }) => {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: EventType.STUDY_SESSION,
    startTime: '',
    endTime: '',
    location: '',
    videoConferenceUrl: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, [groupId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await legacyApiCall(`/api/study-groups/${groupId}/events`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await legacyApiCall(`/api/study-groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          startTime: new Date(formData.startTime),
          endTime: new Date(formData.endTime)
        })
      });

      if (!response.ok) throw new Error('Failed to create event');

      toast({
        title: 'Success',
        description: 'Event created successfully'
      });

      setIsCreating(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateAttendance = async (eventId: string, status: AttendanceStatus) => {
    try {
      const response = await legacyApiCall(`/api/study-groups/events/${eventId}/attendance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update attendance');

      toast({
        title: 'Success',
        description: 'Attendance updated'
      });

      fetchEvents();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update attendance',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventType: EventType.STUDY_SESSION,
      startTime: '',
      endTime: '',
      location: '',
      videoConferenceUrl: ''
    });
  };

  const getEventTypeColor = (type: EventType) => {
    const colors: Record<EventType, string> = {
      [EventType.STUDY_SESSION]: 'bg-blue-500',
      [EventType.VIDEO_CALL]: 'bg-green-500',
      [EventType.ASSIGNMENT_DUE]: 'bg-red-500',
      [EventType.EXAM_PREP]: 'bg-orange-500',
      [EventType.SOCIAL]: 'bg-purple-500',
      [EventType.OTHER]: 'bg-gray-500'
    };
    return colors[type];
  };

  const formatEventTime = (start: Date, end: Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Group Calendar</CardTitle>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No events scheduled</h3>
              <p className="text-muted-foreground mt-2">
                Create your first group event
              </p>
              <Button onClick={() => setIsCreating(true)} className="mt-4">
                Create Event
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={`w-1 rounded ${getEventTypeColor(event.eventType)}`} />
                      <div className="flex-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatEventTime(event.startTime, event.endTime)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          {event.videoConferenceUrl && (
                            <span className="flex items-center gap-1">
                              <Video className="h-4 w-4" />
                              Video Call
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateAttendance(event.id, AttendanceStatus.ATTENDING)}
                    >
                      Attending
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateAttendance(event.id, AttendanceStatus.MAYBE)}
                    >
                      Maybe
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateAttendance(event.id, AttendanceStatus.NOT_ATTENDING)}
                    >
                      Can't Attend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Schedule a new event for your study group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
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
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value as EventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EventType.STUDY_SESSION}>Study Session</SelectItem>
                  <SelectItem value={EventType.VIDEO_CALL}>Video Call</SelectItem>
                  <SelectItem value={EventType.ASSIGNMENT_DUE}>Assignment Due</SelectItem>
                  <SelectItem value={EventType.EXAM_PREP}>Exam Prep</SelectItem>
                  <SelectItem value={EventType.SOCIAL}>Social</SelectItem>
                  <SelectItem value={EventType.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Physical location (optional)"
              />
            </div>

            <div>
              <Label htmlFor="videoUrl">Video Conference URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoConferenceUrl}
                onChange={(e) => setFormData({ ...formData, videoConferenceUrl: e.target.value })}
                placeholder="https://meet.example.com/..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Event</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
