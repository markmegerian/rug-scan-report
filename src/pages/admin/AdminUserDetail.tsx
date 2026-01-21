import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Briefcase, DollarSign, Loader2, Plus, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { PayoutDialog } from '@/components/admin/PayoutDialog';

interface Profile {
  id: string;
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  created_at: string;
}

interface Job {
  id: string;
  job_number: string;
  client_name: string;
  status: string;
  payment_status: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_id: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  reference_number: string | null;
  created_at: string;
  paid_at: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin && userId) {
      fetchUserData();
    }
  }, [isAdmin, userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch payments for this user's jobs
      const jobIds = jobsData?.map(j => j.id) || [];
      if (jobIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (payoutsError) throw payoutsError;
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Business not found</p>
        </main>
      </div>
    );
  }

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const totalPaidOut = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const outstandingBalance = totalRevenue - totalPaidOut;
  const businessName = profile.business_name || profile.full_name || 'Unnamed Business';

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title={businessName} subtitle="Business details" />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate('/admin/users')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Businesses
          </Button>

          {/* Business Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{businessName}</span>
                  </div>
                  {profile.business_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.business_email}</span>
                    </div>
                  )}
                  {profile.business_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.business_phone}</span>
                    </div>
                  )}
                  {profile.business_address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.business_address}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Member since: {format(new Date(profile.created_at), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AdminMetricCard
              title="Total Jobs"
              value={jobs.length}
              icon={Briefcase}
            />
            <AdminMetricCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={DollarSign}
            />
            <AdminMetricCard
              title="Outstanding Balance"
              value={formatCurrency(outstandingBalance)}
              icon={DollarSign}
              description={outstandingBalance > 0 ? "Due to business" : "All paid out"}
            />
          </div>

          {/* Create Payout Button */}
          {outstandingBalance > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => setPayoutDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Payout
              </Button>
            </div>
          )}

          {/* Jobs */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No jobs yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>{format(new Date(job.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-mono">{job.job_number}</TableCell>
                          <TableCell>{job.client_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                job.payment_status === 'paid'
                                  ? 'border-green-500 text-green-600'
                                  : 'border-yellow-500 text-yellow-600'
                              }
                            >
                              {job.payment_status || 'pending'}
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

          {/* Payments */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payments ({payments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
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

          {/* Payouts */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Payout History ({payouts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payouts yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>{format(new Date(payout.created_at), 'MMM d, yyyy')}</TableCell>
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
                              {payout.status}
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

      <PayoutDialog
        open={payoutDialogOpen}
        onOpenChange={setPayoutDialogOpen}
        businessUserId={userId!}
        businessName={businessName}
        maxAmount={outstandingBalance}
        onSuccess={fetchUserData}
      />
    </div>
  );
};

export default AdminUserDetail;
