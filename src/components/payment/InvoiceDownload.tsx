/**
 * Invoice Download Component
 * "We establish this invoice system not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileText, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { getUserFriendlyError } from "@/lib/errors";

interface Invoice {
  id: string;
  invoiceId: string;
  invoiceUrl: string;
  invoicePdf: string;
  status: string;
  amountDue: number;
  currency: string;
  dueDate?: Date;
  created: Date;
  description: string;
}

interface InvoiceDownloadProps {
  userId: string;
}

export function InvoiceDownload({ userId }: InvoiceDownloadProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await legacyApiCall('/api/payments/invoices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch invoices');
      }

      setInvoices(data.invoices);
    } catch (err: any) {
      toast({
        title: 'Error Loading Invoices',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchInvoices();
  });

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      paid: { variant: 'default', label: 'Paid' },
      open: { variant: 'secondary', label: 'Open' },
      draft: { variant: 'outline', label: 'Draft' },
      void: { variant: 'destructive', label: 'Void' },
      uncollectible: { variant: 'destructive', label: 'Uncollectible' },
    };

    const config = statusConfig[status] || statusConfig.open;

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    setDownloading(invoice.id);
    try {
      // Open PDF in new tab
      window.open(invoice.invoicePdf, '_blank');

      toast({
        title: '✝️ Invoice Downloaded',
        description: 'Your invoice has been opened in a new tab.',
      });
    } catch (err: any) {
      toast({
        title: 'Error Downloading Invoice',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleViewOnline = (invoice: Invoice) => {
    window.open(invoice.invoiceUrl, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading invoices...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[hsl(var(--scroll-gold))]" />
          Invoices
        </CardTitle>
        <CardDescription>Download and view your invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No invoices available</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{invoice.invoiceId}</p>
                        <p className="text-xs text-muted-foreground">{invoice.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(invoice.created), 'PP')}</TableCell>
                    <TableCell>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatAmount(invoice.amountDue, invoice.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOnline(invoice)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          disabled={downloading === invoice.id}
                        >
                          {downloading === invoice.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
