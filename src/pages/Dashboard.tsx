import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Briefcase, Eye, Plus, LogOut, ChevronRight, PlayCircle, Clock, CheckCircle, Settings, History, BarChart3, DollarSign, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useJobs, Job } from '@/hooks/useJobs';
import { format } from 'date-fns';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import NotificationBell from '@/components/NotificationBell';
import { DashboardSkeleton, DashboardJobTableSkeleton } from '@/components/skeletons/DashboardSkeleton';
import MobileNav from '@/components/MobileNav';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>;
    case 'in-progress':
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>;
    default:
      return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <PlayCircle className="h-3 w-3" />
          Active
        </Badge>;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { data: jobs = [], isLoading, isError } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredJobs = jobs.filter((job: Job) => {
    // Search filter
    const matchesSearch = job.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || job.job_number.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const jobDate = new Date(job.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = jobDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = jobDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = jobDate >= monthAgo;
      }
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10 border-0" />
            <div>
              <h1 className="text-xl font-bold text-foreground font-sans">RugBoost</h1>
              <p className="text-xs text-muted-foreground">Job Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/jobs/new')} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New Job</span>
            </Button>
            <Button onClick={() => navigate('/history')} variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <History className="h-4 w-4" />
              History
            </Button>
            <Button onClick={() => navigate('/analytics')} variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button onClick={() => navigate('/accounts-receivable')} variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <DollarSign className="h-4 w-4" />
              A/R
            </Button>
            {isAdmin && (
              <Button onClick={() => navigate('/admin')} variant="outline" size="sm" className="gap-2 hidden sm:flex">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            )}
            <NotificationBell />
            <Button onClick={() => navigate('/settings')} variant="ghost" size="icon" className="hidden sm:flex">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="icon" className="hidden sm:flex">
              <LogOut className="h-4 w-4" />
            </Button>
            {/* Mobile Navigation */}
            <MobileNav isAdmin={isAdmin} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by client or job number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          {isLoading ? (
            <DashboardJobTableSkeleton />
          ) : (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Jobs
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredJobs.length} total)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No jobs found</p>
                    {jobs.length === 0 && (
                      <Button onClick={() => navigate('/jobs/new')} className="mt-4">
                        Create Your First Job
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Job #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Rugs</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job: Job) => (
                          <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/jobs/${job.id}`)}>
                            <TableCell className="font-medium">
                              {format(new Date(job.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="font-mono">{job.job_number}</TableCell>
                            <TableCell>{job.client_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{job.rug_count} rugs</Badge>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(job.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                View
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
