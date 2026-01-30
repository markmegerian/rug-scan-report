import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, DollarSign, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PlatformFeeSettings } from '@/components/admin/PlatformFeeSettings';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import BatchActionBar from '@/components/BatchActionBar';
import PaginatedTable from '@/components/PaginatedTable';
import ExportCsvButton from '@/components/ExportCsvButton';
import { formatCurrencyCsv, formatDateCsv } from '@/lib/csvExport';
import { toast } from 'sonner';

interface Payout {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  paid_at: string | null;
  business?: {
    business_name: string | null;
    full_name: string | null;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminPayouts = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { logAction } = useAuditLog();
  
  // Batch selection
  const { 
    selectedIds, 
    isSelected, 
    toggle, 
    toggleAll, 
    clearSelection, 
    selectedCount,
    isAllSelected,
    isSomeSelected 
  } = useBatchSelection<Payout>();
  
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPayouts();
    }
  }, [isAdmin]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      // Use a single query with nested select to avoid N+1
      const { data: payoutsData, error } = await supabase
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch all profiles in one query
      const userIds = [...new Set((payoutsData || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, business_name, full_name')
        .in('user_id', userIds);

      // Map profiles to payouts
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { business_name: p.business_name, full_name: p.full_name }])
      );

      const payoutsWithBusiness: Payout[] = (payoutsData || []).map(payout => ({
        ...payout,
        business: profileMap.get(payout.user_id) || undefined
      }));

      setPayouts(payoutsWithBusiness);
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendPayoutNotification = async (payoutId: string, type: 'created' | 'completed') => {
    try {
      const { error } = await supabase.functions.invoke('notify-payout', {
        body: { payout_id: payoutId, notification_type: type }
      });
      if (error) {
        console.error('Error sending notification:', error);
      }
    } catch (err) {
      console.error('Error invoking notify-payout:', err);
    }
  };

  const handleMarkCompleted = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('payouts')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .eq('id', payoutId);

      if (error) throw error;
      toast.success('Payout marked as completed');
      
      logAction({
        action: 'payout_completed',
        entity_type: 'payout',
        entity_id: payoutId,
        details: { status: 'completed' },
      });
      
      sendPayoutNotification(payoutId, 'completed');
      fetchPayouts();
    } catch (error) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  const handleMarkFailed = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('payouts')
        .update({ status: 'failed' })
        .eq('id', payoutId);

      if (error) throw error;
      toast.success('Payout marked as failed');
      
      logAction({
        action: 'payout_failed',
        entity_type: 'payout',
        entity_id: payoutId,
        details: { status: 'failed' },
      });
      
      fetchPayouts();
    } catch (error) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  // Batch operations
  const handleBatchComplete = async () => {
    setIsBatchProcessing(true);
    const ids = Array.from(selectedIds);
    
    try {
      const { error } = await supabase
        .from('payouts')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      
      // Log each action
      ids.forEach(id => {
        logAction({
          action: 'payout_completed',
          entity_type: 'payout',
          entity_id: id,
          details: { status: 'completed', batch: true },
        });
        sendPayoutNotification(id, 'completed');
      });
      
      toast.success(`${ids.length} payouts marked as completed`);
      clearSelection();
      fetchPayouts();
    } catch (error) {
      console.error('Error batch updating payouts:', error);
      toast.error('Failed to update payouts');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchFailed = async () => {
    setIsBatchProcessing(true);
    const ids = Array.from(selectedIds);
    
    try {
      const { error } = await supabase
        .from('payouts')
        .update({ status: 'failed' })
        .in('id', ids);

      if (error) throw error;
      
      ids.forEach(id => {
        logAction({
          action: 'payout_failed',
          entity_type: 'payout',
          entity_id: id,
          details: { status: 'failed', batch: true },
        });
      });
      
      toast.success(`${ids.length} payouts marked as failed`);
      clearSelection();
      fetchPayouts();
    } catch (error) {
      console.error('Error batch updating payouts:', error);
      toast.error('Failed to update payouts');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const matchesSearch =
        p.business?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.business?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payouts, searchQuery, statusFilter]);

  // Pagination
  const paginatedPayouts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPayouts.slice(startIndex, startIndex + pageSize);
  }, [filteredPayouts, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // CSV export columns
  const csvColumns = [
    { key: 'created_at' as const, label: 'Date', formatter: (v: unknown) => formatDateCsv(String(v)) },
    { key: 'business' as const, label: 'Business', formatter: (v: unknown) => {
      const b = v as Payout['business'];
      return b?.business_name || b?.full_name || '';
    }},
    { key: 'amount' as const, label: 'Amount', formatter: (v: unknown) => formatCurrencyCsv(Number(v)) },
    { key: 'payment_method' as const, label: 'Method', formatter: (v: unknown) => String(v || '') },
    { key: 'reference_number' as const, label: 'Reference', formatter: (v: unknown) => String(v || '') },
    { key: 'status' as const, label: 'Status', formatter: (v: unknown) => String(v || '') },
    { key: 'paid_at' as const, label: 'Paid At', formatter: (v: unknown) => v ? formatDateCsv(String(v)) : '' },
  ];

  // Only pending payouts can be selected
  const selectablePayouts = paginatedPayouts.filter(p => p.status === 'pending');
  const getId = (p: Payout) => p.id;

  const pendingTotal = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const completedTotal = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Payouts" subtitle="Manage business payouts" />

      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="space-y-6">
          {/* Platform Fee Settings */}
          <PlatformFeeSettings />
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-amber-100 p-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payouts</p>
                    <p className="text-2xl font-bold">{formatCurrency(pendingTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Payouts</p>
                    <p className="text-2xl font-bold">{formatCurrency(completedTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by business or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payouts Table */}
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payouts
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredPayouts.length} total)
                </span>
              </CardTitle>
              <ExportCsvButton
                data={filteredPayouts}
                columns={csvColumns}
                filename="payouts"
              />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPayouts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payouts found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllSelected(selectablePayouts, getId)}
                            onCheckedChange={() => toggleAll(selectablePayouts, getId)}
                            aria-label="Select all pending payouts"
                          />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayouts.map((payout) => (
                        <TableRow key={payout.id} className={isSelected(payout.id) ? 'bg-muted/50' : ''}>
                          <TableCell>
                            {payout.status === 'pending' ? (
                              <Checkbox
                                checked={isSelected(payout.id)}
                                onCheckedChange={() => toggle(payout.id)}
                                aria-label={`Select payout for ${payout.business?.business_name || 'Unknown'}`}
                              />
                            ) : (
                              <div className="w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payout.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => navigate(`/admin/users/${payout.user_id}`)}
                              className="text-primary hover:underline"
                            >
                              {payout.business?.business_name || payout.business?.full_name || '—'}
                            </button>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payout.amount)}
                          </TableCell>
                          <TableCell>{payout.payment_method || '—'}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {payout.reference_number || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                payout.status === 'completed'
                                  ? 'border-green-500 text-green-600'
                                  : payout.status === 'pending'
                                  ? 'border-amber-500 text-amber-600'
                                  : 'border-red-500 text-red-600'
                              }
                            >
                              {payout.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {payout.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {payout.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                              {payout.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {payout.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-green-600 border-green-500 hover:bg-green-50"
                                  onClick={() => handleMarkCompleted(payout.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-red-600 border-red-500 hover:bg-red-50"
                                  onClick={() => handleMarkFailed(payout.id)}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Failed
                                </Button>
                              </div>
                            )}
                            {payout.status === 'completed' && payout.paid_at && (
                              <span className="text-xs text-muted-foreground">
                                Paid {format(new Date(payout.paid_at), 'MMM d')}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <PaginatedTable
                currentPage={currentPage}
                totalItems={filteredPayouts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedCount}
        onClear={clearSelection}
        actions={[
          {
            label: 'Mark Complete',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: handleBatchComplete,
            className: 'text-green-600 border-green-500 hover:bg-green-50',
            loading: isBatchProcessing,
          },
          {
            label: 'Mark Failed',
            icon: <XCircle className="h-4 w-4" />,
            onClick: handleBatchFailed,
            variant: 'outline',
            className: 'text-red-600 border-red-500 hover:bg-red-50',
            loading: isBatchProcessing,
          },
        ]}
      />
    </div>
  );
};

export default AdminPayouts;
