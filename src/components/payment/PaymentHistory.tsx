/**
 * Payment History Component
 * "We establish this payment history not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Receipt, Download, Search, Filter, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { getUserFriendlyError } from "@/lib/errors";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: Date;
  receiptUrl?: string;
  refunded: boolean;
  refundAmount?: number;
}

interface PaymentHistoryProps {
  userId: string;
}

export function PaymentHistory({ userId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hasMore, setHasMore] = useState(false);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const { data: invs, error } = await supabase
        .from('invoices')
        .select('id, number, status, amount_cents, currency, description, pdf_url, issued_at, paid_at')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const invoiceIds = (invs ?? []).map((i: any) => i.id);
      let refundsByInvoice: Record<string, number> = {};
      if (invoiceIds.length > 0) {
        const { data: refs } = await supabase
          .from('refund_requests')
          .select('invoice_id, amount_cents, status')
          .in('invoice_id', invoiceIds)
          .in('status', ['approved', 'refunded']);
        for (const r of refs ?? []) {
          if (r.invoice_id) {
            refundsByInvoice[r.invoice_id] = (refundsByInvoice[r.invoice_id] || 0) + (r.amount_cents || 0);
          }
        }
      }

      const mapped: PaymentHistoryItem[] = (invs ?? []).map((row: any) => {
        const refunded = !!refundsByInvoice[row.id] || row.status === 'refunded';
        return {
          id: row.id,
          amount: row.amount_cents,
          currency: row.currency,
          status: row.status === 'paid' ? 'succeeded' : row.status === 'open' || row.status === 'draft' ? 'pending' : row.status === 'void' || row.status === 'uncollectible' ? 'failed' : row.status,
          description: row.description || row.number,
          created: new Date(row.paid_at || row.issued_at),
          receiptUrl: row.pdf_url || undefined,
          refunded,
          refundAmount: refundsByInvoice[row.id],
        };
      });
      setPayments(mapped);
      setHasMore(false);
    } catch (err: any) {
      toast({
        title: 'Error Loading Payment History',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchPaymentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      succeeded: { variant: 'default', label: 'Completed' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' },
      canceled: { variant: 'outline', label: 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const handleDownloadReceipt = async (paymentIntentId: string) => {
    try {
      const response = await legacyApiCall(`/api/payments/receipt/${paymentIntentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate receipt');
      }

      // Open receipt URL in new tab
      window.open(data.receiptUrl, '_blank');

      toast({
        title: '✝️ Receipt Downloaded',
        description: 'Your receipt has been opened in a new tab.',
      });
    } catch (err: any) {
      toast({
        title: 'Error Downloading Receipt',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading payment history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[hsl(var(--scroll-gold))]" />
          Payment History
        </CardTitle>
        <CardDescription>View and manage your payment transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="succeeded">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="canceled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Table */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'No payments match your filters'
                : 'No payment history yet'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(payment.created), 'PP')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-xs text-muted-foreground">ID: {payment.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        {payment.refunded && (
                          <p className="text-xs text-destructive">
                            Refunded: {formatAmount(payment.refundAmount || payment.amount, payment.currency)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      {payment.status === 'succeeded' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center pt-4">
            <Button variant="outline" onClick={fetchPaymentHistory}>
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
