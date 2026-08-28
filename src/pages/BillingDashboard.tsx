import { CreditCard, DollarSign, LockKeyhole, ReceiptText } from 'lucide-react';
import { format } from 'date-fns';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBillingTransactions } from '@/hooks/useBilling';

export default function BillingDashboard() {
  const { data: transactions = [], isLoading } = useBillingTransactions();

  const money = (amountCents: number, currency = 'USD') => new Intl.NumberFormat(undefined, {
    style: 'currency', currency: currency.toUpperCase(),
  }).format(Number(amountCents ?? 0) / 100);

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
          <Card><CardContent className="p-4"><CreditCard className="h-5 w-5 mb-2 text-primary" /><p className="font-semibold">Provider-verified</p><p className="text-xs text-muted-foreground">Only trusted financial workflows can post payment facts.</p></CardContent></Card>
          <Card><CardContent className="p-4"><ReceiptText className="h-5 w-5 mb-2 text-primary" /><p className="font-semibold">Immutable ledger</p><p className="text-xs text-muted-foreground">Charges, payments, aid, and corrections are recorded as ledger entries.</p></CardContent></Card>
          <Card><CardContent className="p-4"><DollarSign className="h-5 w-5 mb-2 text-primary" /><p className="font-semibold">No learning currency</p><p className="text-xs text-muted-foreground">Payments do not mint points, coins, mastery, or credentials.</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Account history</CardTitle><CardDescription>Entries from the authoritative student account ledger</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <p className="py-8 text-center text-muted-foreground">Loading financial record…</p> : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No posted financial records are available.</p>
            ) : (
              <div className="space-y-3">{transactions.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.notes || entry.transaction_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.created_at), 'PPP')}</p>
                    <Badge variant="outline" className="mt-2 capitalize">{entry.status}</Badge>
                  </div>
                  <div className="text-right"><p className="font-bold">{money(entry.amount_cents, entry.currency)}</p></div>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
