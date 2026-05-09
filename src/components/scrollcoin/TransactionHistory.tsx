/**
 * Transaction History Component
 * Displays filterable transaction history with blockchain verification
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Filter, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { 
  ScrollCoinTransaction, 
  TransactionType, 
  TransactionStatus,
  TransactionHistoryResponse 
} from '@/types/scrollcoin';
import { format } from 'date-fns';

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<ScrollCoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [page, typeFilter, statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await legacyApiCall(`/api/scrollcoin/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }

      const data: { success: boolean; data: TransactionHistoryResponse } = await response.json();
      setTransactions(data.data.transactions);
      setTotal(data.data.total);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.CONFIRMED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case TransactionStatus.PENDING:
      case TransactionStatus.PROCESSING:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case TransactionStatus.FAILED:
      case TransactionStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants: Record<TransactionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [TransactionStatus.CONFIRMED]: 'default',
      [TransactionStatus.PENDING]: 'secondary',
      [TransactionStatus.PROCESSING]: 'secondary',
      [TransactionStatus.FAILED]: 'destructive',
      [TransactionStatus.CANCELLED]: 'outline',
    };

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.MINT:
      case TransactionType.REWARD:
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case TransactionType.BURN:
      case TransactionType.PURCHASE:
        return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
      case TransactionType.TRANSFER:
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: TransactionType) => {
    const colors: Record<TransactionType, string> = {
      [TransactionType.MINT]: 'bg-green-100 text-green-800',
      [TransactionType.REWARD]: 'bg-green-100 text-green-800',
      [TransactionType.BURN]: 'bg-orange-100 text-orange-800',
      [TransactionType.PURCHASE]: 'bg-orange-100 text-orange-800',
      [TransactionType.TRANSFER]: 'bg-blue-100 text-blue-800',
      [TransactionType.REFUND]: 'bg-purple-100 text-purple-800',
    };

    return (
      <Badge variant="outline" className={`${colors[type]} flex items-center gap-1`}>
        {getTypeIcon(type)}
        {type}
      </Badge>
    );
  };

  const openBlockchainExplorer = (txHash: string) => {
    // In production, this would link to actual blockchain explorer
    const explorerUrl = `https://etherscan.io/tx/${txHash}`;
    window.open(explorerUrl, '_blank');
  };

  const exportTransactions = () => {
    // Convert transactions to CSV
    const headers = ['Date', 'Type', 'Amount', 'Status', 'Reason', 'TX Hash'];
    const rows = transactions.map(tx => [
      format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      tx.type,
      tx.amount.toString(),
      tx.status,
      tx.reason,
      tx.blockchainTxHash || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrollcoin-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const filteredTransactions = transactions.filter(tx => {
    if (!searchTerm) return true;
    return (
      tx.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.blockchainTxHash?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View and filter your ScrollCoin transaction history
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportTransactions}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={TransactionType.MINT}>Mint</SelectItem>
                <SelectItem value={TransactionType.REWARD}>Reward</SelectItem>
                <SelectItem value={TransactionType.TRANSFER}>Transfer</SelectItem>
                <SelectItem value={TransactionType.BURN}>Burn</SelectItem>
                <SelectItem value={TransactionType.PURCHASE}>Purchase</SelectItem>
                <SelectItem value={TransactionType.REFUND}>Refund</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={TransactionStatus.CONFIRMED}>Confirmed</SelectItem>
                <SelectItem value={TransactionStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={TransactionStatus.PROCESSING}>Processing</SelectItem>
                <SelectItem value={TransactionStatus.FAILED}>Failed</SelectItem>
                <SelectItem value={TransactionStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blockchain</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{getTypeBadge(tx.type)}</TableCell>
                        <TableCell className="font-semibold">
                          {tx.type === TransactionType.MINT || tx.type === TransactionType.REWARD ? '+' : '-'}
                          {tx.amount.toFixed(2)} SC
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{tx.reason}</TableCell>
                        <TableCell>
                          {tx.blockchainTxHash ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openBlockchainExplorer(tx.blockchainTxHash!)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} transactions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
