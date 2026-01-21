import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, DollarSign, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
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
      const { data: payoutsData, error } = await supabase
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get business names for each payout
      const payoutsWithBusiness: Payout[] = await Promise.all(
        (payoutsData || []).map(async (payout) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_name, full_name')
            .eq('user_id', payout.user_id)
            .single();
          return { ...payout, business: profile || undefined };
        })
      );

      setPayouts(payoutsWithBusiness);
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
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
      fetchPayouts();
    } catch (error) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    const matchesSearch =
      p.business?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.business?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
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
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payouts
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredPayouts.length} total)
                </span>
              </CardTitle>
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
                      {filteredPayouts.map((payout) => (
                        <TableRow key={payout.id}>
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminPayouts;
