/**
 * Group Assignments Component
 * Assignment management for study groups
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { FileText, Plus, Upload, CheckCircle, Clock } from 'lucide-react';
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
import { GroupAssignment, AssignmentStatus } from '@/types/study-group';
import { useToast } from '@/hooks/use-toast';

interface GroupAssignmentsProps {
  groupId: string;
  canCreate: boolean;
}

export const GroupAssignments: React.FC<GroupAssignmentsProps> = ({
  groupId,
  canCreate
}) => {
  const [assignments, setAssignments] = useState<GroupAssignment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<GroupAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: ''
  });
  const [submissionContent, setSubmissionContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, [groupId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await legacyApiCall(`/api/study-groups/${groupId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch assignments');

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assignments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await legacyApiCall(`/api/study-groups/${groupId}/assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
        })
      });

      if (!response.ok) throw new Error('Failed to create assignment');

      toast({
        title: 'Success',
        description: 'Assignment created successfully'
      });

      setIsCreating(false);
      resetForm();
      fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssignment) return;

    try {
      const response = await legacyApiCall(`/api/study-groups/assignments/${selectedAssignment.id}/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: submissionContent
          })
        }
      );

      if (!response.ok) throw new Error('Failed to submit assignment');

      toast({
        title: 'Success',
        description: 'Assignment submitted successfully'
      });

      setIsSubmitting(false);
      setSelectedAssignment(null);
      setSubmissionContent('');
      fetchAssignments();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit assignment',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: ''
    });
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    const variants: Record<AssignmentStatus, any> = {
      [AssignmentStatus.PENDING]: { variant: 'secondary', icon: Clock },
      [AssignmentStatus.IN_PROGRESS]: { variant: 'default', icon: Clock },
      [AssignmentStatus.SUBMITTED]: { variant: 'outline', icon: CheckCircle },
      [AssignmentStatus.COMPLETED]: { variant: 'default', icon: CheckCircle },
      [AssignmentStatus.OVERDUE]: { variant: 'destructive', icon: Clock }
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
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
            <CardTitle>Group Assignments</CardTitle>
            {canCreate && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No assignments yet</h3>
              <p className="text-muted-foreground mt-2">
                {canCreate
                  ? 'Create your first group assignment'
                  : 'No assignments have been created yet'}
              </p>
              {canCreate && (
                <Button onClick={() => setIsCreating(true)} className="mt-4">
                  Create Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{assignment.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.description}
                      </p>
                      {assignment.dueDate && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                  {assignment.status === AssignmentStatus.PENDING && (
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setIsSubmitting(true);
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Assignment
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Assignment Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for your study group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div>
              <Label htmlFor="title">Assignment Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Assignment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Assignment Dialog */}
      <Dialog open={isSubmitting} onOpenChange={setIsSubmitting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            <div>
              <Label htmlFor="submission">Your Submission *</Label>
              <Textarea
                id="submission"
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                rows={10}
                placeholder="Enter your assignment submission..."
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsSubmitting(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Upload className="mr-2 h-4 w-4" />
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
