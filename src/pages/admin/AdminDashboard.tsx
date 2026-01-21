import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, Briefcase, TrendingUp, Clock, CheckCircle, Loader2, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DashboardMetrics {
  totalBusinesses: number;
  totalJobs: number;
  totalRevenue: number;
  platformFees: number;
  platformFeePercentage: number;
  pendingPayouts: number;
  completedPayouts: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job: {
    job_number: string;
    client_name: string;
  } | null;
  business: {
    business_name: string | null;
    full_name: string | null;
  } | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalBusinesses: 0,
    totalJobs: 0,
    totalRevenue: 0,
    platformFees: 0,
    platformFeePercentage: 10,
    pendingPayouts: 0,
    completedPayouts: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles (businesses)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id');
      if (profilesError) throw profilesError;

      // Fetch all jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, user_id');
      if (jobsError) throw jobsError;

      // Fetch all completed payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, job_id')
        .eq('status', 'completed');
      if (paymentsError) throw paymentsError;

      // Fetch all payouts
      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('id, amount, status, platform_fees_deducted');
      if (payoutsError) throw payoutsError;

      // Fetch platform fee percentage
      const { data: feeSettings } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_fee_percentage')
        .single();
      
      const feePercentage = feeSettings ? parseFloat(feeSettings.setting_value) : 10;

      // Calculate metrics
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const platformFees = totalRevenue * (feePercentage / 100);
      const pendingPayouts = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const completedPayouts = payouts?.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setMetrics({
        totalBusinesses: profiles?.length || 0,
        totalJobs: jobs?.length || 0,
        totalRevenue,
        platformFees,
        platformFeePercentage: feePercentage,
        pendingPayouts,
        completedPayouts,
      });

      // Fetch recent payments with job info
      const { data: recentPaymentsData, error: recentError } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, job_id')
        .order('created_at', { ascending: false })
        .limit(10);
      if (recentError) throw recentError;

      // Get job details for each payment
      const paymentsWithDetails: RecentPayment[] = await Promise.all(
        (recentPaymentsData || []).map(async (payment) => {
          const { data: job } = await supabase
            .from('jobs')
            .select('job_number, client_name, user_id')
            .eq('id', payment.job_id)
            .single();

          let business = null;
          if (job) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('business_name, full_name')
              .eq('user_id', job.user_id)
              .single();
            business = profile;
          }

          return {
            ...payment,
            job: job ? { job_number: job.job_number, client_name: job.client_name } : null,
            business,
          };
        })
      );

      setRecentPayments(paymentsWithDetails);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const netPayableToBusiness = metrics.totalRevenue - metrics.platformFees;
  const outstandingBalance = netPayableToBusiness - metrics.completedPayouts;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Platform Revenue Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <AdminMetricCard
              title="Total Businesses"
              value={metrics.totalBusinesses}
              icon={Users}
              description="Registered businesses"
            />
            <AdminMetricCard
              title="Total Jobs"
              value={metrics.totalJobs}
              icon={Briefcase}
              description="All time"
            />
            <AdminMetricCard
              title="Gross Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              icon={DollarSign}
              description="Total collected"
            />
            <AdminMetricCard
              title="Platform Fees"
              value={formatCurrency(metrics.platformFees)}
              icon={Percent}
              description={`${metrics.platformFeePercentage}% of revenue`}
              className="border-2 border-primary/20"
            />
            <AdminMetricCard
              title="Due to Businesses"
              value={formatCurrency(outstandingBalance)}
              icon={TrendingUp}
              description="Net after fees & payouts"
            />
          </div>

          {/* Payout Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-amber-100 p-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payouts</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.pendingPayouts)}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(metrics.completedPayouts)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {payment.business?.business_name || payment.business?.full_name || '—'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {payment.job?.job_number || '—'}
                          </TableCell>
                          <TableCell>
                            {payment.job?.client_name || '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                payment.status === 'completed'
                                  ? 'border-green-500 text-green-600'
                                  : 'border-yellow-500 text-yellow-600'
                              }
                            >
                              {payment.status}
                            </Badge>
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

export default AdminDashboard;
