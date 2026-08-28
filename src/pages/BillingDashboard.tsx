import { useQuery } from '@tanstack/react-query';
import { CreditCard, DollarSign, LockKeyhole, ReceiptText } from 'lucide-react';
import { format } from 'date-fns';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BillingDashboard() {
  const { user } = useAuth();
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['verified-payments', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('payments')
        .select('id,amount,currency,status,description,receipt_url,created_at,stripe_invoice_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const money = (amount: number, currency = 'usd') => new Intl.NumberFormat(undefined, {
    style: 'currency', currency: currency.toUpperCase(),
  }).format(Number(amount ?? 0) / 100);

  return (
    <PageTemplate title="Billing & Payments" description="Verified financial records and payment readiness">
      <div className="space-y-5 max-w-5xl mx-auto">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" />Online checkout is not yet enabled</CardTitle><CardDescription>Launch safety boundary</CardDescription></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Students cannot create invoices, mark payments paid, create subscriptions, or activate academic access from the browser.</p>
            <p>Online payment collection remains disabled until production Stripe keys, webhook delivery, authoritative tuition charges, refund handling, reconciliation, and end-to-end smoke tests are verified.</p>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><CreditCard className="h-5 w-5 mb-2 text-primary" /><p className="font-semibold">Provider-verified</p><p className="text-xs text-muted-foreground">Only signed provider events can create payment facts.</p></CardContent></Card>
          <Card><CardContent className="p-4"><ReceiptText className="h-5 w-5 mb-2 text-primary" /><p className="font-semibold">Bursar reconciliation</p><p className="text-xs text-muted-foreground">Payment and academic entitlement are reconciled separately.</p></CardContent></Card>
          <Card><CardContent className="p-4"><DollarSign className="h-5 w-5 mb-2 text-primary" /><p className="font-semibold">No learning currency</p><p className="text-xs text-muted-foreground">Payments do not mint points, coins, mastery, or credentials.</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Payment history</CardTitle><CardDescription>Records confirmed through trusted financial workflows</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <p className="py-8 text-center text-muted-foreground">Loading financial record…</p> : payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No verified payment records are available.</p>
            ) : (
              <div className="space-y-3">{payments.map((p: any) => (
                <div key={p.id} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                  <div><p className="font-medium">{p.description || 'Payment'}</p><p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'PPP')}{p.stripe_invoice_id ? ` · ${p.stripe_invoice_id}` : ''}</p><Badge variant="outline" className="mt-2 capitalize">{p.status}</Badge></div>
                  <div className="text-right"><p className="font-bold">{money(p.amount, p.currency)}</p>{p.receipt_url && <a className="text-xs text-primary underline" href={p.receipt_url} target="_blank" rel="noreferrer">Provider receipt</a>}</div>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
