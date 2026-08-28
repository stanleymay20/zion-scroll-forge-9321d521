import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BillingProduct {
  id: string;
  name: string;
  description?: string;
  product_type: 'course';
  price_cents: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface BillingTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  payment_method: string;
  transaction_type: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: string;
  price_cents: number;
  currency: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export async function getBillingProducts(): Promise<BillingProduct[]> {
  const { data, error } = await supabase.from('courses')
    .select('id,title,description,price_cents,price,created_at')
    .order('title').limit(20);
  if (error) throw error;
  return (data ?? []).map((course: any) => ({
    id: course.id,
    name: course.title,
    description: course.description ?? undefined,
    product_type: 'course' as const,
    price_cents: Number(course.price_cents ?? Math.round(Number(course.price ?? 0) * 100)),
    currency: 'USD',
    is_active: true,
    created_at: course.created_at,
  }));
}

export async function getBillingTransactions(): Promise<BillingTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // student_account_ledger is the canonical immutable financial record. There is
  // intentionally no browser-authoritative `payments` table in the launch model.
  const { data, error } = await supabase
    .from('student_account_ledger' as any)
    .select('id,student_user_id,entry_type,amount,currency,memo,posted_at')
    .eq('student_user_id', user.id)
    .order('posted_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  return ((data ?? []) as any[]).map((entry) => ({
    id: entry.id,
    user_id: entry.student_user_id,
    amount_cents: Math.round(Number(entry.amount ?? 0) * 100),
    currency: String(entry.currency ?? 'USD').toUpperCase(),
    payment_method: 'institution-ledger',
    transaction_type: String(entry.entry_type ?? 'ledger_entry'),
    status: 'posted',
    notes: entry.memo ?? undefined,
    created_at: entry.posted_at,
  }));
}

export async function getUserSubscriptions(): Promise<Subscription[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    id: s.id, user_id: s.user_id, plan_name: s.plan_name, plan_type: s.interval,
    price_cents: s.amount_cents, currency: s.currency, status: s.status,
    current_period_start: s.current_period_start, current_period_end: s.current_period_end,
    created_at: s.created_at, updated_at: s.updated_at,
  }));
}

export async function getActiveSubscription(): Promise<Subscription | null> {
  const subs = await getUserSubscriptions();
  return subs.find((s) => s.status === 'active' || s.status === 'trialing') ?? null;
}

export async function createCheckoutSession(): Promise<never> {
  throw new Error('Online checkout is disabled until the production financial authority gate is verified.');
}
export async function createSubscription(): Promise<never> {
  throw new Error('Self-service subscription creation is disabled until provider-backed billing is verified.');
}
export async function cancelSubscription(): Promise<never> {
  throw new Error('Subscription changes must be processed by the trusted billing provider or bursar workflow.');
}

export const useBillingProducts = () => useQuery({ queryKey: ['billing-products'], queryFn: getBillingProducts, staleTime: 300000 });
export const useBillingTransactions = () => useQuery({ queryKey: ['billing-transactions'], queryFn: getBillingTransactions, staleTime: 60000 });
export const useUserSubscriptions = () => useQuery({ queryKey: ['user-subscriptions'], queryFn: getUserSubscriptions });
export const useActiveSubscription = () => useQuery({ queryKey: ['active-subscription'], queryFn: getActiveSubscription });

// Compatibility hooks fail closed rather than creating financial authority in-browser.
export const useCreateCheckoutSession = () => ({ isPending: false, mutateAsync: createCheckoutSession });
export const useCreateSubscription = () => ({ isPending: false, mutateAsync: createSubscription });
export const useCancelSubscription = () => ({ isPending: false, mutateAsync: cancelSubscription });
