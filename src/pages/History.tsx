import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Calendar, Clock, ChevronDown, ChevronUp, ChevronRight, 
  LogOut, Loader2, Settings, History as HistoryIcon, 
  CheckCircle, DollarSign, Image, FileText, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isThisYear, isThisMonth, isThisWeek, parseISO } from 'date-fns';
import rugboostLogo from '@/assets/rugboost-logo.svg';

interface HistoryRug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
}

interface HistoryJob {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  created_at: string;
  payment_status: string | null;
  rugs: HistoryRug[];
  total_amount: number;
}

interface TimelineGroup {
  label: string;
  jobs: HistoryJob[];
}

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch completed jobs with their rugs and estimates
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          client_name,
          client_email,
          client_phone,
          status,
          created_at,
          payment_status
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch rugs and estimates for each job
      const jobsWithDetails = await Promise.all(
        (jobsData || []).map(async (job) => {
          // Get rugs
          const { data: rugsData } = await supabase
            .from('inspections')
            .select('id, rug_number, rug_type, length, width, photo_urls, analysis_report')
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
            ...job,
            rugs: rugsData || [],
            total_amount: totalAmount,
          };
        })
      );

      setJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleJob = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // Filter jobs by search query
  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return (
      job.client_name.toLowerCase().includes(query) ||
      job.job_number.toLowerCase().includes(query) ||
      (job.client_email?.toLowerCase().includes(query) ?? false)
    );
  });

  // Group jobs into timeline periods
  const groupJobsByTime = (jobs: HistoryJob[]): TimelineGroup[] => {
    const groups: { [key: string]: HistoryJob[] } = {
      'This Week': [],
      'This Month': [],
      'This Year': [],
      'Older': [],
    };

    jobs.forEach(job => {
      const date = parseISO(job.created_at);
      if (isThisWeek(date)) {
        groups['This Week'].push(job);
      } else if (isThisMonth(date)) {
        groups['This Month'].push(job);
      } else if (isThisYear(date)) {
        groups['This Year'].push(job);
      } else {
        groups['Older'].push(job);
      }
    });

    return Object.entries(groups)
      .filter(([_, jobsList]) => jobsList.length > 0)
      .map(([label, jobsList]) => ({ label, jobs: jobsList }));
  };

  const timelineGroups = groupJobsByTime(filteredJobs);

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
              <h1 className="font-display text-xl font-bold text-foreground">RugBoost</h1>
              <p className="text-xs text-muted-foreground">Client History</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <Button onClick={() => navigate('/settings')} variant="ghost" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-primary" />
                Client Service History
              </CardTitle>
              <CardDescription>
                View completed jobs and past rug services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name, job number, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : timelineGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <HistoryIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {jobs.length === 0 
                    ? 'No completed jobs yet. Complete a job to see it in history.'
                    : 'No jobs match your search.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {timelineGroups.map((group) => (
                <div key={group.label} className="relative">
                  {/* Timeline label */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {group.label}
                    </Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Jobs in this period */}
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    {group.jobs.map((job) => {
                      const isExpanded = expandedJobs.has(job.id);
                      
                      return (
                        <div key={job.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-[25px] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                          
                          <Card className="ml-4">
                            <Collapsible open={isExpanded} onOpenChange={() => toggleJob(job.id)}>
                              <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                          {job.client_name}
                                          <Badge variant="outline" className="font-mono text-xs">
                                            {job.job_number}
                                          </Badge>
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                          <Clock className="h-3 w-3" />
                                          {format(parseISO(job.created_at), 'MMM d, yyyy')}
                                          <span>•</span>
                                          <span>{job.rugs.length} rug{job.rugs.length !== 1 ? 's' : ''}</span>
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <Badge 
                                          variant="outline" 
                                          className={
                                            job.payment_status === 'paid' 
                                              ? 'border-green-500 text-green-600' 
                                              : 'border-muted-foreground text-muted-foreground'
                                          }
                                        >
                                          {job.payment_status === 'paid' ? (
                                            <>
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Paid
                                            </>
                                          ) : (
                                            'Pending'
                                          )}
                                        </Badge>
                                        {job.total_amount > 0 && (
                                          <p className="font-semibold text-primary mt-1">
                                            ${job.total_amount.toFixed(2)}
                                          </p>
                                        )}
                                      </div>
                                      {isExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <CardContent className="pt-0 space-y-4">
                                  <Separator />
                                  
                                  {/* Contact Info */}
                                  {(job.client_email || job.client_phone) && (
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                      {job.client_email && (
                                        <span>{job.client_email}</span>
                                      )}
                                      {job.client_phone && (
                                        <span>{job.client_phone}</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Rugs */}
                                  <div className="grid gap-3">
                                    {job.rugs.map((rug) => (
                                      <div 
                                        key={rug.id} 
                                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                                      >
                                        <div className="flex items-center gap-3">
                                          {rug.photo_urls && rug.photo_urls[0] ? (
                                            <img
                                              src={rug.photo_urls[0]}
                                              alt={rug.rug_number}
                                              className="w-12 h-12 object-cover rounded-md border"
                                            />
                                          ) : (
                                            <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center">
                                              <Image className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                          )}
                                          <div>
                                            <p className="font-medium">{rug.rug_number}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {rug.rug_type}
                                              {rug.length && rug.width && ` • ${rug.length}' × ${rug.width}'`}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {rug.analysis_report && (
                                            <Badge variant="secondary" className="gap-1">
                                              <FileText className="h-3 w-3" />
                                              Report
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* View Job Button */}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/jobs/${job.id}`)}
                                    className="w-full gap-2"
                                  >
                                    View Full Job Details
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
