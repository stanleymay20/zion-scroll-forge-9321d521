/**
 * Course Enrollment Flow Component
 * Handles the complete enrollment process including payment options
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Coins, 
  GraduationCap, 
  Loader2, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { useEnrollInCourse } from '@/hooks/useCourses';
import { getUserFriendlyError } from '@/lib/errors';
import { spendScrollCoin } from '@/services/scrollcoin';

interface CourseEnrollmentFlowProps {
  course: {
    id: string;
    title: string;
    price_cents?: number;
    scrollCoinCost?: number;
    scholarshipEligible?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = 'credit_card' | 'scrollcoin' | 'scholarship';

export function CourseEnrollmentFlow({ 
  course, 
  isOpen, 
  onClose,
  onSuccess 
}: CourseEnrollmentFlowProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enrollInCourse = useEnrollInCourse();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [enrollmentStep, setEnrollmentStep] = useState<'payment' | 'processing' | 'success' | 'error'>('payment');
  const [walletBalance, setWalletBalance] = useState(0);

  const scrollCoinCost = course.scrollCoinCost || Math.round((course.price_cents || 0) / 100);
  const usdPrice = ((course.price_cents || 0) / 100).toFixed(2);
  const hasEnoughScrollGold = walletBalance >= scrollCoinCost;

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    (async () => {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      const balance = Number(wallet?.balance) || 0;
      setWalletBalance(balance);
      setPaymentMethod(balance >= scrollCoinCost ? 'scrollcoin' : 'credit_card');
    })();
  }, [isOpen, user?.id, scrollCoinCost]);

  const enrollMutation = useMutation({
    mutationFn: async () => {
      setEnrollmentStep('processing');

      if (paymentMethod === 'scrollcoin') {
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (walletError) throw walletError;

        if ((Number(wallet?.balance) || 0) < scrollCoinCost) {
          throw new Error(`You need ${scrollCoinCost} ScrollGold but your wallet balance is ${Number(wallet?.balance) || 0}.`);
        }
      }

      const enrollmentResult = await enrollInCourse.mutateAsync(course.id);

      // Handle payment based on method
      if (paymentMethod === 'scrollcoin') {
        await spendScrollCoin(user!.id, scrollCoinCost, `Enrolled in ${course.title}`);
      } else if (paymentMethod === 'credit_card') {
        // This would integrate with Stripe
        // For now, we'll simulate the payment
        console.log('Processing credit card payment...');
      } else if (paymentMethod === 'scholarship') {
        // This would check scholarship eligibility
        console.log('Processing scholarship application...');
      }

      return enrollmentResult;
    },
    onSuccess: () => {
      setEnrollmentStep('success');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['course-detail', course.id] });
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setEnrollmentStep('payment');
      }, 2000);
    },
    onError: (error: unknown) => {
      setEnrollmentStep('error');
      const message = getUserFriendlyError(error, 'enroll_course');
      toast.error('Enrollment Failed', {
        description: message,
      });
    },
  });

  const handleEnroll = () => {
    enrollMutation.mutate();
  };

  const handleClose = () => {
    if (enrollmentStep !== 'processing') {
      onClose();
      setEnrollmentStep('payment');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {enrollmentStep === 'payment' && 'Enroll in Course'}
            {enrollmentStep === 'processing' && 'Processing Enrollment...'}
            {enrollmentStep === 'success' && 'Enrollment Successful!'}
            {enrollmentStep === 'error' && 'Enrollment Failed'}
          </DialogTitle>
          <DialogDescription>
            {enrollmentStep === 'payment' && `Complete your enrollment in ${course.title}`}
            {enrollmentStep === 'processing' && 'Please wait while we process your enrollment'}
            {enrollmentStep === 'success' && 'You are now enrolled in this course'}
            {enrollmentStep === 'error' && 'There was an error processing your enrollment'}
          </DialogDescription>
        </DialogHeader>

        {enrollmentStep === 'payment' && (
          <div className="space-y-6 py-4">
            {/* Course Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">{course.title}</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Price</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{scrollCoinCost} SC</span>
                  <span className="text-muted-foreground">or ${usdPrice}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                {/* ScrollCoin Payment */}
                 <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60" data-disabled={!hasEnoughScrollGold}>
                   <RadioGroupItem value="scrollcoin" id="scrollcoin" disabled={!hasEnoughScrollGold} />
                  <Label htmlFor="scrollcoin" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Coins className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                         <p className="font-medium">ScrollCoin</p>
                        <p className="text-sm text-muted-foreground">
                           Pay with your ScrollCoin balance {hasEnoughScrollGold ? `(balance: ${walletBalance})` : `(need ${scrollCoinCost}, have ${walletBalance})`}
                        </p>
                      </div>
                      <Badge variant="secondary">{scrollCoinCost} SC</Badge>
                    </div>
                  </Label>
                </div>

                {/* Credit Card Payment */}
                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-full">
                        <CreditCard className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Credit Card</p>
                        <p className="text-sm text-muted-foreground">
                          Pay with credit or debit card
                        </p>
                      </div>
                      <Badge variant="secondary">${usdPrice}</Badge>
                    </div>
                  </Label>
                </div>

                {/* Scholarship */}
                {course.scholarshipEligible && (
                  <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="scholarship" id="scholarship" />
                    <Label htmlFor="scholarship" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-full">
                          <GraduationCap className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Scholarship</p>
                          <p className="text-sm text-muted-foreground">
                            Apply for financial aid
                          </p>
                        </div>
                        <Badge variant="secondary">Free</Badge>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          </div>
        )}

        {enrollmentStep === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processing your enrollment...</p>
          </div>
        )}

        {enrollmentStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-green-500/10 rounded-full p-4 mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-lg font-medium mb-2">Enrollment Successful!</p>
            <p className="text-sm text-muted-foreground text-center">
              You can now access all course materials and start learning.
            </p>
          </div>
        )}

        {enrollmentStep === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-destructive/10 rounded-full p-4 mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <p className="text-lg font-medium mb-2">Enrollment Failed</p>
            <p className="text-sm text-muted-foreground text-center">
              Please try again or contact support if the problem persists.
            </p>
          </div>
        )}

        {enrollmentStep === 'payment' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Complete Enrollment'
              )}
            </Button>
          </DialogFooter>
        )}

        {enrollmentStep === 'error' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={() => setEnrollmentStep('payment')}>
              Try Again
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
