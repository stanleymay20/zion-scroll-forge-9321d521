/**
 * Moderation Queue Component
 * Admin interface for content moderation
 */

import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { PostWithAuthor, ModerationStatus } from '@/types/community';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Flag, Eye, Loader2, AlertTriangle } from 'lucide-react';

export const ModerationQueue: React.FC = () => {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModerationStatus>(ModerationStatus.PENDING);
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await legacyApiCall(`/api/community/moderation/queue?status=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load moderation queue');

      const data = await response.json();
      setPosts(data.posts);
    } catch (error) {
      console.error('Error loading moderation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (postId: string, action: 'approve' | 'reject' | 'flag') => {
    setSubmitting(true);
    try {
      const response = await legacyApiCall(`/api/community/moderation/posts/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          notes: moderationNotes
        })
      });

      if (!response.ok) throw new Error('Failed to moderate post');

      // Remove post from queue
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedPost(null);
      setModerationNotes('');
    } catch (error) {
      console.error('Error moderating post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ModerationStatus) => {
    switch (status) {
      case ModerationStatus.APPROVED:
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case ModerationStatus.REJECTED:
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case ModerationStatus.FLAGGED:
        return <Badge className="bg-yellow-100 text-yellow-800">Flagged</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
        <p className="text-gray-600 mt-1">Review and moderate community content</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ModerationStatus)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value={ModerationStatus.PENDING}>
            Pending ({posts.filter(p => p.moderationStatus === ModerationStatus.PENDING).length})
          </TabsTrigger>
          <TabsTrigger value={ModerationStatus.FLAGGED}>
            Flagged ({posts.filter(p => p.moderationStatus === ModerationStatus.FLAGGED).length})
          </TabsTrigger>
          <TabsTrigger value={ModerationStatus.APPROVED}>Approved</TabsTrigger>
          <TabsTrigger value={ModerationStatus.REJECTED}>Rejected</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500">No posts to review</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <Card key={post.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">
                          {post.author.firstName} {post.author.lastName}
                        </span>
                        <span className="text-gray-500 text-sm">@{post.author.username}</span>
                        {getStatusBadge(post.moderationStatus)}
                      </div>
                      {post.flagged && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription>
                            This content has been flagged by the AI moderation system
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

                  {post.moderationNotes && (
                    <Alert className="mb-4">
                      <AlertDescription>
                        <strong>Moderation Notes:</strong> {post.moderationNotes}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPost(post)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                    {post.moderationStatus === ModerationStatus.PENDING && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleModerate(post.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModerate(post.id, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerate(post.id, 'flag')}
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Flag for Review
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>

      {/* Review Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Post</DialogTitle>
              <DialogDescription>
                Review this content and take appropriate moderation action
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold mb-2">Content</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Author</h4>
                <p className="text-gray-700">
                  {selectedPost.author.firstName} {selectedPost.author.lastName} (@{selectedPost.author.username})
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Moderation Notes</h4>
                <Textarea
                  value={moderationNotes}
                  onChange={(e) => setModerationNotes(e.target.value)}
                  placeholder="Add notes about your moderation decision..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedPost(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => handleModerate(selectedPost.id, 'approve')}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleModerate(selectedPost.id, 'reject')}
                disabled={submitting}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ModerationQueue;
