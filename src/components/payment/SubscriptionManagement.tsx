/**
 * Subscription Management Component
 * "We establish this subscription system not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import { useState } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Calendar, CreditCard, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { getUserFriendlyError } from "@/lib/errors";

interface Subscription {
  id: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

interface SubscriptionManagementProps {
  subscription: Subscription | null;
  onUpdate?: () => void;
}

export function SubscriptionManagement({ subscription, onUpdate }: SubscriptionManagementProps) {
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const handleCancelSubscription = async (immediate: boolean) => {
    setLoading(true);
    try {
      const response = await legacyApiCall(`/api/payments/subscription/${subscription?.subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          cancelImmediately: immediate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast({
        title: '✝️ Subscription Cancelled',
        description: immediate
          ? 'Your subscription has been cancelled immediately.'
          : 'Your subscription will be cancelled at the end of the billing period.',
      });

      setShowCancelDialog(false);
      onUpdate?.();
    } catch (err: any) {
      toast({
        title: 'Cancellation Failed',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setLoading(true);
    try {
      const response = await legacyApiCall(`/api/payments/subscription/${subscription?.subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: false,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      toast({
        title: '✝️ Subscription Reactivated',
        description: 'Your subscription has been reactivated successfully.',
      });

      setShowReactivateDialog(false);
      onUpdate?.();
    } catch (err: any) {
      toast({
        title: 'Reactivation Failed',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
          <p className="text-muted-foreground mb-4">
            Subscribe to access premium features and support God's work.
          </p>
          <Button>Browse Subscription Plans</Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      active: { variant: 'default', icon: CheckCircle2, label: 'Active' },
      canceled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
      past_due: { variant: 'destructive', icon: AlertCircle, label: 'Past Due' },
      incomplete: { variant: 'secondary', icon: AlertCircle, label: 'Incomplete' },
      trialing: { variant: 'secondary', icon: Calendar, label: 'Trial' },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[hsl(var(--scroll-gold))]" />
                {subscription.plan.name}
              </CardTitle>
              <CardDescription>Your current subscription plan</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Billing Amount</p>
              <p className="text-2xl font-bold text-[hsl(var(--scroll-gold))]">
                {formatAmount(subscription.plan.amount, subscription.plan.currency)}
              </p>
              <p className="text-xs text-muted-foreground">per {subscription.plan.interval}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-lg font-semibold">
                {format(new Date(subscription.currentPeriodEnd), 'PPP')}
              </p>
            </div>
          </div>

          {/* Cancellation Warning */}
          {subscription.cancelAtPeriodEnd && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be cancelled on{' '}
                {format(new Date(subscription.currentPeriodEnd), 'PPP')}. You can reactivate it
                before this date.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={() => setShowReactivateDialog(true)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Reactivate Subscription
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You can choose to cancel
              immediately or at the end of your billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If you cancel at the end of the billing period, you'll retain access until{' '}
                {format(new Date(subscription.currentPeriodEnd), 'PPP')}.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={loading}
            >
              Keep Subscription
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCancelSubscription(false)}
              disabled={loading}
            >
              Cancel at Period End
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleCancelSubscription(true)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Immediately'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Confirmation Dialog */}
      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Subscription</DialogTitle>
            <DialogDescription>
              Would you like to reactivate your subscription? Your next billing date will be{' '}
              {format(new Date(subscription.currentPeriodEnd), 'PPP')}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReactivateDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleReactivateSubscription} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Subscription'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
