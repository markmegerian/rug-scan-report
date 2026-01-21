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

      // For each profile, get job count, revenue, and payouts
      const businessesWithMetrics: Business[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get jobs for this user
          const { data: jobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('user_id', profile.user_id);

          const jobIds = jobs?.map(j => j.id) || [];

          // Get completed payments for this user's jobs
          let totalRevenue = 0;
          if (jobIds.length > 0) {
            const { data: payments } = await supabase
              .from('payments')
              .select('amount')
              .in('job_id', jobIds)
              .eq('status', 'completed');
            totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          }

          // Get completed payouts for this user
          const { data: payouts } = await supabase
            .from('payouts')
            .select('amount')
            .eq('user_id', profile.user_id)
            .eq('status', 'completed');
          const totalPaidOut = payouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

          return {
            id: profile.id,
            user_id: profile.user_id,
            business_name: profile.business_name,
            full_name: profile.full_name,
            business_email: profile.business_email,
            created_at: profile.created_at,
            jobCount: jobs?.length || 0,
            totalRevenue,
            outstandingBalance: totalRevenue - totalPaidOut,
          };
        })
      );

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
