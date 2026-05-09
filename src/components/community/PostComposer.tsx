/**
 * Post Composer Component
 * Rich text editor for creating posts
 */

import React, { useState, useRef } from 'react';
import { createPost } from "@/services/community";
import { useAuth } from '@/contexts/AuthContext';
import { PostType, PostVisibility, ScriptureReference } from '@/types/community';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Image,
  Video,
  FileText,
  Send,
  X,
  Globe,
  Users,
  Lock,
  BookOpen,
  Hash,
  AtSign,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PostComposerProps {
  onPostCreated: () => void;
  onCancel: () => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onPostCreated, onCancel }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>(PostType.TEXT);
  const [visibility, setVisibility] = useState<PostVisibility>(PostVisibility.PUBLIC);
  const [isPrayerRequest, setIsPrayerRequest] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 5000;
  const remainingChars = maxLength - content.length;

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setMediaFiles(prev => [...prev, ...validFiles]);
    setMediaPreview(prev => [...prev, ...newPreviews]);
    setError(null);
  };

  const handleRemoveMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreview[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      setError('Please add some content or media to your post');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('type', postType);
      formData.append('visibility', visibility);
      formData.append('isPrayerRequest', isPrayerRequest.toString());

      // Add media files
      mediaFiles.forEach((file, index) => {
        formData.append('media', file);
      });

      const response = await legacyApiCall('/api/community/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      // Clean up preview URLs
      mediaPreview.forEach(url => URL.revokeObjectURL(url));

      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const insertHashtag = () => {
    const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPos) + '#' + content.slice(cursorPos);
    setContent(newContent);
  };

  const insertMention = () => {
    const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPos) + '@' + content.slice(cursorPos);
    setContent(newContent);
  };

  const getVisibilityIcon = (vis: PostVisibility) => {
    switch (vis) {
      case PostVisibility.PUBLIC:
        return <Globe className="w-4 h-4" />;
      case PostVisibility.FOLLOWERS:
        return <Users className="w-4 h-4" />;
      case PostVisibility.PRIVATE:
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-12 h-12">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          {/* Post Type and Visibility */}
          <div className="flex items-center gap-3 mb-4">
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PostType.TEXT}>Text Post</SelectItem>
                <SelectItem value={PostType.QUESTION}>Question</SelectItem>
                <SelectItem value={PostType.ANNOUNCEMENT}>Announcement</SelectItem>
                <SelectItem value={PostType.TESTIMONY}>Testimony</SelectItem>
                <SelectItem value={PostType.PRAYER_REQUEST}>Prayer Request</SelectItem>
                <SelectItem value={PostType.RESOURCE}>Resource</SelectItem>
              </SelectContent>
            </Select>

            <Select value={visibility} onValueChange={(v) => setVisibility(v as PostVisibility)}>
              <SelectTrigger className="w-[150px]">
                <div className="flex items-center gap-2">
                  {getVisibilityIcon(visibility)}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PostVisibility.PUBLIC}>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value={PostVisibility.FOLLOWERS}>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Followers
                  </div>
                </SelectItem>
                <SelectItem value={PostVisibility.PRIVATE}>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {postType === PostType.PRAYER_REQUEST && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Prayer Request
              </Badge>
            )}
          </div>

          {/* Content Editor */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Share your thoughts, questions, or testimonies..."
            className="min-h-[150px] mb-3 resize-none"
            maxLength={maxLength}
          />

          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm ${remainingChars < 100 ? 'text-red-600' : 'text-gray-500'}`}>
              {remainingChars} characters remaining
            </span>
          </div>

          {/* Media Preview */}
          {mediaPreview.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {mediaPreview.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title="Add image or video"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertHashtag}
                title="Add hashtag"
              >
                <Hash className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertMention}
                title="Mention someone"
              >
                <AtSign className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Add scripture reference"
              >
                <BookOpen className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || (!content.trim() && mediaFiles.length === 0)}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
