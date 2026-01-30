import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { BusinessTable } from '@/components/admin/BusinessTable';

interface Business {
  id: string;
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  business_email: string | null;
  created_at: string;
  jobCount: number;
  totalRevenue: number;
  outstandingBalance: number;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchBusinesses();
    }
  }, [isAdmin]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setBusinesses([]);
        setLoading(false);
        return;
      }

      // Get all user IDs
      const userIds = profiles.map(p => p.user_id);

      // Fetch all jobs for these users in ONE query
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, user_id')
        .in('user_id', userIds);

      // Get all job IDs
      const allJobIds = (allJobs || []).map(j => j.id);

      // Fetch all completed payments in ONE query
      const { data: allPayments } = allJobIds.length > 0 
        ? await supabase
            .from('payments')
            .select('job_id, amount')
            .in('job_id', allJobIds)
            .eq('status', 'completed')
        : { data: [] };

      // Fetch all completed payouts in ONE query
      const { data: allPayouts } = await supabase
        .from('payouts')
        .select('user_id, amount')
        .in('user_id', userIds)
        .eq('status', 'completed');

      // Create lookup maps
      const jobsByUser = new Map<string, string[]>();
      (allJobs || []).forEach(job => {
        const jobs = jobsByUser.get(job.user_id) || [];
        jobs.push(job.id);
        jobsByUser.set(job.user_id, jobs);
      });

      const revenueByJob = new Map<string, number>();
      (allPayments || []).forEach(payment => {
        const current = revenueByJob.get(payment.job_id) || 0;
        revenueByJob.set(payment.job_id, current + Number(payment.amount));
      });

      const payoutsByUser = new Map<string, number>();
      (allPayouts || []).forEach(payout => {
        const current = payoutsByUser.get(payout.user_id) || 0;
        payoutsByUser.set(payout.user_id, current + Number(payout.amount));
      });

      // Build business metrics
      const businessesWithMetrics: Business[] = profiles.map(profile => {
        const userJobs = jobsByUser.get(profile.user_id) || [];
        const totalRevenue = userJobs.reduce((sum, jobId) => {
          return sum + (revenueByJob.get(jobId) || 0);
        }, 0);
        const totalPaidOut = payoutsByUser.get(profile.user_id) || 0;

        return {
          id: profile.id,
          user_id: profile.user_id,
          business_name: profile.business_name,
          full_name: profile.full_name,
          business_email: profile.business_email,
          created_at: profile.created_at,
          jobCount: userJobs.length,
          totalRevenue,
          outstandingBalance: totalRevenue - totalPaidOut,
        };
      });

      setBusinesses(businessesWithMetrics);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      b.business_name?.toLowerCase().includes(searchLower) ||
      b.full_name?.toLowerCase().includes(searchLower) ||
      b.business_email?.toLowerCase().includes(searchLower)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Businesses" subtitle="Manage all registered businesses" />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search Businesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by business name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Businesses Table */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Businesses
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredBusinesses.length} total)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessTable businesses={filteredBusinesses} loading={loading} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;
