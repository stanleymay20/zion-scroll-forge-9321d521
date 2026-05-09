import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/errors";

console.info("✝️ ScrollUniversity Billing — Christ provides for His people");

// Types
export interface BillingProduct {
  id: string;
  name: string;
  description?: string;
  product_type: 'course' | 'degree' | 'subscription' | 'service';
  price_cents: number;
  currency: string;
  stripe_product_id?: string;
  stripe_price_id?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BillingTransaction {
  id: string;
  user_id: string;
  product_id?: string;
  amount_cents: number;
  currency: string;
  payment_method: string;
  transaction_type: string;
  status: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  scrollcoin_amount: number;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  product?: BillingProduct;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: string;
  price_cents: number;
  currency: string;
  status: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

// Fetchers - Use existing tables
export async function getBillingProducts(): Promise<BillingProduct[]> {
  // Use courses as products since billing_products table doesn't exist
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, price_cents, price, created_at")
    .order("title", { ascending: true })
    .limit(20);

  if (error) throw error;
  
  // Transform courses to BillingProduct format
  return (data || []).map((course: any) => ({
    id: course.id,
    name: course.title,
    description: course.description,
    product_type: 'course' as const,
    price_cents: course.price_cents || (course.price ? Math.round(course.price * 100) : 0),
    currency: 'USD',
    is_active: true,
    created_at: course.created_at
  }));
}

export async function getBillingTransactions(): Promise<BillingTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Use transactions table which does exist
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  
  // Transform to BillingTransaction format
  return (data || []).map((tx: any) => ({
    id: tx.id,
    user_id: tx.user_id,
    amount_cents: Math.round(Number(tx.amount) * 100),
    currency: 'USD',
    payment_method: 'scrollcoin',
    transaction_type: tx.type || 'purchase',
    status: 'completed',
    scrollcoin_amount: Number(tx.amount),
    notes: tx.description,
    created_at: tx.created_at
  }));
}

export async function getUserSubscriptions(): Promise<Subscription[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    plan_name: s.plan_name,
    plan_type: s.interval,
    price_cents: s.amount_cents,
    currency: s.currency,
    status: s.status,
    current_period_start: s.current_period_start,
    current_period_end: s.current_period_end,
    cancel_at: s.cancel_at_period_end ? s.current_period_end : undefined,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));
}

export async function getActiveSubscription(): Promise<Subscription | null> {
  const subs = await getUserSubscriptions();
  return subs.find((s) => s.status === 'active' || s.status === 'trialing') ?? null;
}

export async function createCheckoutSession(params: {
  product_id: string;
  scrollcoin_discount?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  const { data: course } = await supabase.from('courses')
    .select('id, title, price_cents, price').eq('id', params.product_id).maybeSingle();
  if (!course) throw new Error('Product not found');
  const cents = (course as any).price_cents || Math.round(((course as any).price ?? 0) * 100);
  const discountCents = Math.min(cents, (params.scrollcoin_discount ?? 0));
  const finalCents = Math.max(0, cents - discountCents);

  const { data: invoice, error } = await supabase.from('invoices').insert({
    user_id: user.id,
    amount_cents: finalCents,
    currency: 'USD',
    description: course.title,
    status: finalCents === 0 ? 'paid' : 'open',
    paid_at: finalCents === 0 ? new Date().toISOString() : null,
  }).select('id, number').single();
  if (error) throw error;
  return { invoice_id: invoice.id, number: invoice.number, url: null as string | null };
}

export async function createSubscription(params: {
  plan_name: string;
  plan_type: 'monthly' | 'annual';
  amount_cents?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  const interval = params.plan_type === 'annual' ? 'year' : 'month';
  const now = new Date();
  const end = new Date(now);
  if (interval === 'year') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);

  const { data, error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    plan_name: params.plan_name,
    status: 'active',
    amount_cents: params.amount_cents ?? 0,
    currency: 'USD',
    interval,
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function cancelSubscription(subscriptionId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('id', subscriptionId);
  if (error) throw error;
  return { id: subscriptionId };
}

// Hooks
export const useBillingProducts = () =>
  useQuery({ 
    queryKey: ["billing-products"], 
    queryFn: getBillingProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useBillingTransactions = () =>
  useQuery({ 
    queryKey: ["billing-transactions"], 
    queryFn: getBillingTransactions,
    staleTime: 60 * 1000, // 1 minute
  });

export const useUserSubscriptions = () =>
  useQuery({ 
    queryKey: ["user-subscriptions"], 
    queryFn: getUserSubscriptions 
  });

export const useActiveSubscription = () =>
  useQuery({ 
    queryKey: ["active-subscription"], 
    queryFn: getActiveSubscription 
  });

export const useCreateCheckoutSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
      qc.invalidateQueries({ queryKey: ["billing-transactions"] });
    },
    onError: (e: any) => toast({
      title: "Failed to create checkout session",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};

export const useCreateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["active-subscription"] });
    },
    onError: (e: any) => toast({
      title: "Failed to create subscription",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};

export const useCancelSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast({ title: "✅ Subscription cancelled" });
      qc.invalidateQueries({ queryKey: ["user-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["active-subscription"] });
    },
    onError: (e: any) => toast({
      title: "Failed to cancel subscription",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};
