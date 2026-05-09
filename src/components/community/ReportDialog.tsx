/**
 * Report Dialog Component
 * Report inappropriate content
 */

import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { ReportReason } from '@/types/community';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  onReportSubmitted: () => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({
  open,
  onClose,
  postId,
  onReportSubmitted
}) => {
  const [reason, setReason] = useState<ReportReason>(ReportReason.SPAM);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please provide a description of the issue');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await legacyApiCall(`/api/community/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, description })
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      onReportSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const reportReasons = [
    { value: ReportReason.SPAM, label: 'Spam or misleading' },
    { value: ReportReason.HARASSMENT, label: 'Harassment or bullying' },
    { value: ReportReason.INAPPROPRIATE_CONTENT, label: 'Inappropriate content' },
    { value: ReportReason.FALSE_INFORMATION, label: 'False information' },
    { value: ReportReason.HATE_SPEECH, label: 'Hate speech' },
    { value: ReportReason.VIOLENCE, label: 'Violence or dangerous content' },
    { value: ReportReason.THEOLOGICAL_CONCERN, label: 'Theological concern' },
    { value: ReportReason.OTHER, label: 'Other' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us maintain a safe and respectful community by reporting content that violates our guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Selection */}
          <div>
            <Label className="mb-3 block">Why are you reporting this content?</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              {reportReasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="mb-2 block">
              Additional details (required)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details about why you're reporting this content..."
              className="min-h-[100px]"
            />
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Message */}
          <Alert>
            <AlertDescription className="text-sm">
              Your report will be reviewed by our moderation team. False reports may result in account restrictions.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !description.trim()}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
