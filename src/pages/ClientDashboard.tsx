import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, ChevronRight, 
  LogOut, Loader2, Briefcase,
  CheckCircle, DollarSign, AlertCircle, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import rugboostLogo from '@/assets/rugboost-logo.svg';

interface ClientJob {
  id: string;
  job_number: string;
  client_name: string;
  status: string;
  created_at: string;
  payment_status: string | null;
  rug_count: number;
  total_amount: number;
  access_token: string;
}

interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
}

const getStatusConfig = (status: string, paymentStatus: string | null) => {
  if (paymentStatus === 'paid') {
    if (status === 'completed') {
      return { label: 'Completed', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' };
    }
    return { label: 'In Progress', icon: Play, color: 'text-blue-600 bg-blue-50 border-blue-200' };
  }
  
  if (status === 'pending-approval') {
    return { label: 'Awaiting Your Approval', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' };
  }
  
  return { label: 'Pending', icon: Clock, color: 'text-muted-foreground bg-muted border-border' };
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, isClient, isStaff } = useAuth();
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/client/auth');
      } else if (isStaff && !isClient) {
        // If they're staff but not client, send them to staff dashboard
        navigate('/dashboard');
      } else {
        fetchClientJobs();
      }
    }
  }, [user, authLoading, isClient, isStaff, navigate]);

  const fetchClientJobs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get client account
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientAccount) {
        setLoading(false);
        return;
      }

      // Get all job access for this client
      const { data: accessData, error: accessError } = await supabase
        .from('client_job_access')
        .select(`
          id,
          access_token,
          job_id,
          jobs (
            id,
            job_number,
            client_name,
            status,
            created_at,
            payment_status,
            user_id
          )
        `)
        .eq('client_id', clientAccount.id);

      if (accessError) throw accessError;

      // Fetch rugs and estimates for each job
      const jobsWithDetails = await Promise.all(
        (accessData || [])
          .filter(a => a.jobs)
          .map(async (access) => {
            const job = access.jobs as any;

            // Get branding from first job's owner
            if (!branding) {
              const { data: brandingData } = await supabase
                .from('profiles')
                .select('business_name, business_phone, business_email')
                .eq('user_id', job.user_id)
                .single();

              if (brandingData) {
                setBranding(brandingData);
              }
            }

            // Get rug count
            const { count } = await supabase
              .from('inspections')
              .select('id', { count: 'exact', head: true })
              .eq('job_id', job.id);

            // Get approved estimates total
            const { data: estimatesData } = await supabase
              .from('approved_estimates')
              .select('total_amount')
              .eq('job_id', job.id);

            const totalAmount = (estimatesData || []).reduce(
              (sum, est) => sum + (est.total_amount || 0), 0
            );

            return {
              id: job.id,
              job_number: job.job_number,
              client_name: job.client_name,
              status: job.status,
              created_at: job.created_at,
              payment_status: job.payment_status,
              rug_count: count || 0,
              total_amount: totalAmount,
              access_token: access.access_token,
            };
          })
      );

      // Sort by created_at descending
      jobsWithDetails.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error fetching client jobs:', error);
      toast.error('Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Separate jobs by status
  const activeJobs = jobs.filter(j => j.status !== 'completed');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                {branding?.business_name || 'Rug Cleaning'}
              </h1>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8 max-w-3xl mx-auto">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
            </h2>
            <p className="text-muted-foreground">
              View your rug cleaning jobs and manage your services
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  No jobs yet. When you bring in rugs for service, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Active Jobs */}
              {activeJobs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Active Jobs
                  </h3>
                  <div className="grid gap-4">
                    {activeJobs.map((job) => {
                      const statusConfig = getStatusConfig(job.status, job.payment_status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <Card 
                          key={job.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(`/client/${job.access_token}`)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  Job #{job.job_number}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(job.created_at), 'MMMM d, yyyy')}
                                  <span>•</span>
                                  <span>{job.rug_count} rug{job.rug_count !== 1 ? 's' : ''}</span>
                                </CardDescription>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="outline" 
                                className={statusConfig.color}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              {job.total_amount > 0 && (
                                <span className="font-semibold text-primary">
                                  ${job.total_amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Jobs */}
              {completedJobs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Completed Jobs
                  </h3>
                  <div className="grid gap-4">
                    {completedJobs.map((job) => {
                      const statusConfig = getStatusConfig(job.status, job.payment_status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <Card 
                          key={job.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer opacity-80"
                          onClick={() => navigate(`/client/${job.access_token}`)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  Job #{job.job_number}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(job.created_at), 'MMMM d, yyyy')}
                                  <span>•</span>
                                  <span>{job.rug_count} rug{job.rug_count !== 1 ? 's' : ''}</span>
                                </CardDescription>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="outline" 
                                className={statusConfig.color}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              {job.total_amount > 0 && (
                                <span className="font-semibold text-muted-foreground">
                                  ${job.total_amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Contact Info */}
          {branding && (branding.business_phone || branding.business_email) && (
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Questions? Contact us at{' '}
                  {branding.business_phone && (
                    <a href={`tel:${branding.business_phone}`} className="text-primary hover:underline">
                      {branding.business_phone}
                    </a>
                  )}
                  {branding.business_phone && branding.business_email && ' or '}
                  {branding.business_email && (
                    <a href={`mailto:${branding.business_email}`} className="text-primary hover:underline">
                      {branding.business_email}
                    </a>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
