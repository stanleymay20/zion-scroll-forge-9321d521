/**
 * Refund Request Component
 * "We establish this refund system not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getUserFriendlyError } from "@/lib/errors";

interface RefundRequestProps {
  paymentIntentId: string;
  amount: number;
  currency: string;
  description: string;
  onSuccess?: () => void;
}

export function RefundRequest({
  paymentIntentId,
  amount,
  currency,
  description,
  onSuccess,
}: RefundRequestProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState<'duplicate' | 'fraudulent' | 'requested_by_customer'>('requested_by_customer');
  const [explanation, setExplanation] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const handleSubmitRefund = async () => {
    if (!explanation.trim()) {
      toast({
        title: 'Explanation Required',
        description: 'Please provide an explanation for the refund request.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await legacyApiCall('/api/payments/refund-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          reason,
          explanation,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit refund request');
      }

      setSuccess(true);
      toast({
        title: '✝️ Refund Request Submitted',
        description: 'Your refund request has been submitted and will be reviewed by our team.',
      });

      setTimeout(() => {
        setShowDialog(false);
        setSuccess(false);
        setExplanation('');
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      toast({
        title: 'Error Submitting Refund Request',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="w-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Request Refund
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Submit a refund request for this payment. Our team will review your request and
              respond within 2-3 business days.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Request Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  We'll review your refund request and get back to you soon.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Payment Details */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Amount:</span>
                  <span className="font-semibold">{formatAmount(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <span className="text-sm">{description}</span>
                </div>
              </div>

              {/* Refund Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Refund</Label>
                <Select value={reason} onValueChange={(value: any) => setReason(value)}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested_by_customer">
                      Customer Request
                    </SelectItem>
                    <SelectItem value="duplicate">Duplicate Payment</SelectItem>
                    <SelectItem value="fraudulent">Fraudulent Transaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <Label htmlFor="explanation">
                  Explanation <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Please provide details about why you're requesting a refund..."
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Please provide as much detail as possible to help us process your request.
                </p>
              </div>

              {/* Warning */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Refund requests are reviewed on a case-by-case basis. Processing may take 2-3
                  business days, and refunds typically appear in your account within 5-10 business
                  days.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitRefund} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
