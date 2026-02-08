import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, CheckCircle, Clock, AlertCircle,
  TrendingUp, Filter, Search, ExternalLink, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';

interface Payment {
  id: string;
  job_id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  job?: {
    job_number: string;
    client_name: string;
    client_email: string | null;
  };
}

const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
  },
  completed: { 
    label: 'Paid', 
    icon: CheckCircle, 
    className: 'bg-green-100 text-green-800 border-green-200' 
  },
  failed: { 
    label: 'Failed', 
    icon: AlertCircle, 
    className: 'bg-red-100 text-red-800 border-red-200' 
  },
};

const AccountsReceivable = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Fetch payments with job info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch related jobs
      const jobIds = [...new Set((paymentsData || []).map(p => p.job_id))];
      
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, job_number, client_name, client_email')
        .in('id', jobIds);

      // Merge job data with payments
      const jobsMap = new Map((jobsData || []).map(j => [j.id, j]));
      const paymentsWithJobs = (paymentsData || []).map(p => ({
        ...p,
        job: jobsMap.get(p.job_id),
      }));

      setPayments(paymentsWithJobs);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  };

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.job?.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.job?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.job?.client_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalCollected = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalOutstanding = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const collectionRate = payments.length > 0 
    ? Math.round((payments.filter(p => p.status === 'completed').length / payments.length) * 100) 
    : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <p className="text-xs text-muted-foreground">Accounts Receivable</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Total Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                ${totalCollected.toFixed(2)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-500">
                {payments.filter(p => p.status === 'completed').length} payments received
              </p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                ${totalOutstanding.toFixed(2)}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                {payments.filter(p => p.status === 'pending').length} payments pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {collectionRate}%
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500">
                of total invoices
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                All Payments
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job, client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No payments found</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Job</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const config = getStatusConfig(payment.status);
                      const StatusIcon = config.icon;

                      return (
                        <TableRow 
                          key={payment.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/jobs/${payment.job_id}`)}
                        >
                          <TableCell>
                            <span className="font-medium">
                              {payment.job?.job_number || 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {payment.job?.client_name || 'Unknown'}
                              </div>
                              {payment.job?.client_email && (
                                <div className="text-xs text-muted-foreground">
                                  {payment.job.client_email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-lg">
                              ${payment.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            {payment.paid_at && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Paid {format(new Date(payment.paid_at), 'MMM d')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(payment.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(payment.created_at), 'h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/jobs/${payment.job_id}`)}
                              >
                                View Job
                              </Button>
                              {payment.stripe_payment_intent_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <a 
                                    href={`https://dashboard.stripe.com/payments/${payment.stripe_payment_intent_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AccountsReceivable;
