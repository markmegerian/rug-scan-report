import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, CheckCircle, Image, FileText, DollarSign, 
  ChevronDown, ChevronUp, Check, X, CreditCard, LogOut, History, Lock,
  Calendar, Bell, MessageSquare, Download, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePushToken } from '@/hooks/usePushToken';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import RugPhoto from '@/components/RugPhoto';

// Helper to check if a service is a mandatory cleaning service
const isCleaningService = (serviceName: string): boolean => {
  const lowerName = serviceName.toLowerCase();
  return lowerName.includes('cleaning') || 
         lowerName.includes('wash') || 
         lowerName.includes('clean');
};

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
}

interface RugData {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  estimate_id: string;
  services: ServiceItem[];
  total: number;
}

interface JobData {
  id: string;
  job_number: string;
  client_name: string;
  status: string;
  created_at?: string | null;
  client_approved_at?: string | null;
}

interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
}

const ClientPortal = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { registerAndSaveToken, removePushToken, pushToken } = usePushToken();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [rugs, setRugs] = useState<RugData[]>([]);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedServices, setSelectedServices] = useState<Map<string, Set<string>>>(new Map());
  const [expandedRugs, setExpandedRugs] = useState<Set<string>>(new Set());
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [clientJobAccessId, setClientJobAccessId] = useState<string | null>(null);
  const [scheduleRequest, setScheduleRequest] = useState({
    date: '',
    time: '',
    notes: '',
  });
  const [question, setQuestion] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to client auth with the token
        navigate(`/client/auth?token=${accessToken}`);
      } else {
        // Check if user needs to set up their password
        if (user.user_metadata?.needs_password_setup) {
          // Fetch branding first for the password setup page
          fetchBrandingForPasswordSetup();
        } else {
          checkAccessAndLoadData();
        }
      }
    }
  }, [user, authLoading, accessToken]);

  useEffect(() => {
    if (!job?.id) return;
    const scheduleKey = `client-portal-${job.id}-schedule`;
    const notificationsKey = `client-portal-${job.id}-notifications`;
    const reviewKey = `client-portal-${job.id}-review`;

    const storedSchedule = window.localStorage.getItem(scheduleKey);
    if (storedSchedule) {
      try {
        setScheduleRequest(JSON.parse(storedSchedule));
      } catch {
        // ignore invalid storage
      }
    }

    setNotificationsEnabled(window.localStorage.getItem(notificationsKey) === 'true');
    setReviewSubmitted(window.localStorage.getItem(reviewKey) === 'true');
  }, [job?.id]);

  const fetchBrandingForPasswordSetup = async () => {
    try {
      // Use secure RPC function to validate token and get staff user
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: accessToken })
        .single();

      let businessName = 'Rug Cleaning';
      
      if (!tokenError && tokenData?.staff_user_id) {
        const { data: brandingData } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('user_id', tokenData.staff_user_id)
          .single();
        
        if (brandingData?.business_name) {
          businessName = brandingData.business_name;
        }
      }
      
      // Redirect to password setup
      navigate(`/client/set-password?token=${accessToken}&business=${encodeURIComponent(businessName)}`);
    } catch (error) {
      console.error('Error fetching branding:', error);
      navigate(`/client/set-password?token=${accessToken}`);
    }
  };

  const checkAccessAndLoadData = async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      // Use secure RPC function to validate token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: accessToken })
        .single();

      if (tokenError || !tokenData) {
        toast.error('Invalid or expired access link');
        navigate('/');
        return;
      }

      // Build access data structure from RPC result
      const accessData = {
        id: tokenData.access_id as string,
        job_id: tokenData.job_id as string,
        client_id: tokenData.client_id as string | null,
        jobs: {
          id: tokenData.job_id as string,
          job_number: tokenData.job_number as string,
          client_name: tokenData.client_name as string,
          status: tokenData.job_status as string,
          user_id: tokenData.staff_user_id as string
        }
      };
      

      // Check if user's client account is linked
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientAccount) {
        // Create client account and link
        const { data: newClient, error: createError } = await supabase
          .from('client_accounts')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
          })
          .select('id')
          .single();

        if (createError) throw createError;

        // Link to job access
        await supabase
          .from('client_job_access')
          .update({ client_id: newClient.id })
          .eq('id', accessData.id);

        // Add client role
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'client' })
          .select();
      } else if (!accessData.client_id) {
        // Link existing client to this job access
        await supabase
          .from('client_job_access')
          .update({ client_id: clientAccount.id })
          .eq('id', accessData.id);
      }

      // Track first access
      const { error: trackingError } = await supabase.rpc('update_client_access_tracking', {
        _access_token: accessToken,
        _first_accessed: true,
        _password_set: false,
      });
      if (trackingError) {
        console.error('Error updating access tracking:', trackingError);
      }

      setHasAccess(true);
      setClientJobAccessId(accessData.id);

      const { data: jobDetails } = await supabase
        .from('jobs')
        .select('created_at, client_approved_at, status')
        .eq('id', accessData.job_id)
        .maybeSingle();

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, status, amount, currency, created_at, paid_at')
        .eq('job_id', accessData.job_id)
        .order('created_at', { ascending: false });

      setPayments((paymentsData || []) as Payment[]);

      const jobData = accessData.jobs as unknown as JobData;
      setJob({
        ...jobData,
        created_at: jobDetails?.created_at || null,
        client_approved_at: jobDetails?.client_approved_at || null,
      });

      // Fetch branding
      const { data: brandingData } = await supabase
        .from('profiles')
        .select('business_name, business_phone, business_email')
        .eq('user_id', (accessData.jobs as any).user_id)
        .single();

      if (brandingData) {
        setBranding(brandingData);
      }

      // Fetch rugs for this job using the client view (excludes sensitive contact info)
      const { data: rugsData, error: rugsError } = await supabase
        .from('inspections_client_view')
        .select(`
          id,
          rug_number,
          rug_type,
          length,
          width,
          photo_urls,
          analysis_report
        `)
        .eq('job_id', jobData.id);

      if (rugsError) throw rugsError;

      // Fetch approved estimates separately (RLS uses job_id directly)
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('approved_estimates')
        .select('id, inspection_id, services, total_amount')
        .eq('job_id', jobData.id);

      if (estimatesError) throw estimatesError;

      // Create a map of inspection_id -> estimate for quick lookup
      const estimateMap = new Map<string, { id: string; services: unknown; total_amount: number }>();
      (estimatesData || []).forEach(est => {
        estimateMap.set(est.inspection_id, est);
      });

      const processedRugs: RugData[] = (rugsData || [])
        .filter(r => estimateMap.has(r.id))
        .map(r => {
          const estimate = estimateMap.get(r.id)!;
          return {
            id: r.id,
            rug_number: r.rug_number,
            rug_type: r.rug_type,
            length: r.length,
            width: r.width,
            photo_urls: r.photo_urls,
            analysis_report: r.analysis_report,
            estimate_id: estimate.id,
            services: Array.isArray(estimate.services) ? estimate.services as ServiceItem[] : [],
            total: estimate.total_amount,
          };
        });

      setRugs(processedRugs);

      // Initialize all services as selected by default
      const initialSelections = new Map<string, Set<string>>();
      processedRugs.forEach(rug => {
        const serviceIds = new Set(rug.services.map(s => s.id));
        initialSelections.set(rug.id, serviceIds);
      });
      setSelectedServices(initialSelections);

      // Expand all rugs by default
      setExpandedRugs(new Set(processedRugs.map(r => r.id)));
    } catch (error) {
      console.error('Error loading portal data:', error);
      toast.error('Failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (rugId: string, serviceId: string) => {
    // Find the service to check if it's mandatory
    const rug = rugs.find(r => r.id === rugId);
    const service = rug?.services.find(s => s.id === serviceId);
    
    // Prevent toggling off cleaning services (mandatory)
    if (service && isCleaningService(service.name)) {
      return; // Don't allow toggling cleaning services
    }

    setSelectedServices(prev => {
      const newMap = new Map(prev);
      const rugServices = new Set(newMap.get(rugId) || []);
      
      if (rugServices.has(serviceId)) {
        rugServices.delete(serviceId);
      } else {
        rugServices.add(serviceId);
      }
      
      newMap.set(rugId, rugServices);
      return newMap;
    });
  };

  const toggleAllServices = (rugId: string, selectAll: boolean) => {
    const rug = rugs.find(r => r.id === rugId);
    if (!rug) return;

    setSelectedServices(prev => {
      const newMap = new Map(prev);
      if (selectAll) {
        newMap.set(rugId, new Set(rug.services.map(s => s.id)));
      } else {
        // When clearing all, keep mandatory cleaning services selected
        const mandatoryServiceIds = rug.services
          .filter(s => isCleaningService(s.name))
          .map(s => s.id);
        newMap.set(rugId, new Set(mandatoryServiceIds));
      }
      return newMap;
    });
  };

  const calculateSelectedTotal = () => {
    let total = 0;
    rugs.forEach(rug => {
      const selectedIds = selectedServices.get(rug.id) || new Set();
      rug.services.forEach(service => {
        if (selectedIds.has(service.id)) {
          total += service.quantity * service.unitPrice;
        }
      });
    });
    return total;
  };

  const getSelectedServicesCount = () => {
    let count = 0;
    selectedServices.forEach(services => {
      count += services.size;
    });
    return count;
  };

  const handleProceedToPayment = async (paymentOption?: { label: string; multiplier?: number }) => {
    const selectedCount = getSelectedServicesCount();
    if (selectedCount === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Prepare selected services data per rug with estimate ID
      const servicesForCheckout: { 
        rugNumber: string; 
        rugId: string;
        estimateId: string;
        services: ServiceItem[] 
      }[] = [];
      
      rugs.forEach(rug => {
        const selectedIds = selectedServices.get(rug.id) || new Set();
        const rugSelectedServices = rug.services.filter(s => selectedIds.has(s.id));
        if (rugSelectedServices.length > 0) {
          servicesForCheckout.push({
            rugNumber: rug.rug_number,
            rugId: rug.id,
            estimateId: rug.estimate_id,
            services: rugSelectedServices,
          });
        }
      });

      const total = calculateSelectedTotal();
      const multiplier = paymentOption?.multiplier ?? 1;
      const totalAmount = Number((total * multiplier).toFixed(2));

      // Save client service selections to database before checkout
      for (const rugSelection of servicesForCheckout) {
        const selectionTotal = rugSelection.services.reduce(
          (sum, s) => sum + (s.quantity * s.unitPrice), 0
        );
        
        // First try to find existing selection
        const { data: existingSelection } = await supabase
          .from('client_service_selections')
          .select('id')
          .eq('client_job_access_id', clientJobAccessId!)
          .eq('approved_estimate_id', rugSelection.estimateId)
          .maybeSingle();
        
        if (existingSelection) {
          // Update existing
          await supabase
            .from('client_service_selections')
            .update({
              selected_services: rugSelection.services as unknown as any,
              total_selected: selectionTotal,
            })
            .eq('id', existingSelection.id);
        } else {
          // Insert new
          await supabase
            .from('client_service_selections')
            .insert({
              client_job_access_id: clientJobAccessId!,
              approved_estimate_id: rugSelection.estimateId,
              selected_services: rugSelection.services as unknown as any,
              total_selected: selectionTotal,
            });
        }
      }

      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          jobId: job?.id,
          clientJobAccessId,
          selectedServices: servicesForCheckout,
          totalAmount,
          customerEmail: user?.email,
          successUrl: `${window.location.origin}/client/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
          paymentLabel: paymentOption?.label || 'Full payment',
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleScheduleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!job?.id) return;
    const scheduleKey = `client-portal-${job.id}-schedule`;
    window.localStorage.setItem(scheduleKey, JSON.stringify(scheduleRequest));
    toast.success('Schedule request submitted. We’ll confirm shortly.');
  };

  const handleQuestionSubmit = () => {
    if (!question.trim()) {
      toast.error('Please enter your question.');
      return;
    }
    toast.success('Question sent. We’ll follow up soon.');
    setQuestion('');
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (!job?.id) return;
    const notificationsKey = `client-portal-${job.id}-notifications`;
    setNotificationsEnabled(enabled);
    window.localStorage.setItem(notificationsKey, String(enabled));

    if (enabled) {
      try {
        await registerAndSaveToken();
        toast.success('Notifications enabled.');
      } catch (error) {
        console.error('Notification enable error:', error);
        toast.error('Unable to enable notifications.');
      }
    } else if (pushToken) {
      await removePushToken();
      toast.success('Notifications disabled.');
    }
  };

  const handleReviewSubmit = () => {
    if (!job?.id) return;
    const reviewKey = `client-portal-${job.id}-review`;
    window.localStorage.setItem(reviewKey, 'true');
    setReviewSubmitted(true);
  };

  const handleDownloadReport = (rug: RugData) => {
    if (!rug.analysis_report) return;
    const blob = new Blob([rug.analysis_report], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rug.rug_number}-report.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const timelineSteps = [
    {
      label: 'Job created',
      date: job?.created_at,
      done: !!job?.created_at,
    },
    {
      label: 'Estimate approved',
      date: job?.client_approved_at || null,
      done: !!job?.client_approved_at,
    },
    {
      label: 'Payment received',
      date: payments.find((payment) => payment.status === 'completed')?.paid_at || null,
      done: payments.some((payment) => payment.status === 'completed'),
    },
    {
      label: 'Cleaning completed',
      date: job?.status === 'completed' ? new Date().toISOString() : null,
      done: job?.status === 'completed',
    },
  ];

  const beforeAfterPairs = rugs
    .filter((rug) => (rug.photo_urls || []).length >= 2)
    .map((rug) => ({
      rugNumber: rug.rug_number,
      before: rug.photo_urls?.[0] || '',
      after: rug.photo_urls?.[rug.photo_urls.length - 1] || '',
    }));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Welcome Card Skeleton */}
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full max-w-md" />
            </CardContent>
          </Card>

          {/* Main Content Skeleton */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <Skeleton className="h-5 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-5 w-16" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary Skeleton */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!hasAccess || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view this estimate.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSelected = calculateSelectedTotal();
  const selectedCount = getSelectedServicesCount();
  const totalServices = rugs.reduce((sum, r) => sum + r.services.length, 0);

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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/client/history')}
              className="gap-1 hidden sm:flex"
            >
              <History className="h-4 w-4" />
              History
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Your Rug Inspection Estimate
            </CardTitle>
            <CardDescription>
              Job #{job.job_number} for {job.client_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review the recommended services below and select the ones you'd like to proceed with.
              You can deselect any services you don't need.
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Job timeline
              </CardTitle>
              <CardDescription>Track progress from intake to completion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineSteps.map((step) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.date ? new Date(step.date).toLocaleString() : 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Stay updated on status changes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable updates</p>
                  <p className="text-xs text-muted-foreground">Email or push notifications</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationsToggle} />
              </div>
              <p className="text-xs text-muted-foreground">
                {notificationsEnabled ? 'We’ll notify you when your job moves to the next step.' : 'Notifications are currently off.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule pickup or delivery
            </CardTitle>
            <CardDescription>Request a time window that works for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleScheduleSubmit}>
              <Input
                type="date"
                value={scheduleRequest.date}
                onChange={(event) => setScheduleRequest((prev) => ({ ...prev, date: event.target.value }))}
              />
              <Input
                type="time"
                value={scheduleRequest.time}
                onChange={(event) => setScheduleRequest((prev) => ({ ...prev, time: event.target.value }))}
              />
              <Button type="submit" className="w-full">
                Submit request
              </Button>
              <Textarea
                className="md:col-span-3"
                placeholder="Add any pickup or delivery notes..."
                value={scheduleRequest.notes}
                onChange={(event) => setScheduleRequest((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </form>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rugs List - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {rugs.map((rug) => {
              const rugSelectedServices = selectedServices.get(rug.id) || new Set();
              const allSelected = rugSelectedServices.size === rug.services.length;
              const mandatoryServiceIds = rug.services.filter(s => isCleaningService(s.name)).map(s => s.id);
              const onlyMandatorySelected = rugSelectedServices.size === mandatoryServiceIds.length && 
                mandatoryServiceIds.every(id => rugSelectedServices.has(id));
              const isExpanded = expandedRugs.has(rug.id);

              const rugTotal = rug.services
                .filter(s => rugSelectedServices.has(s.id))
                .reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);

              return (
                <Card key={rug.id}>
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={(open) => {
                      setExpandedRugs(prev => {
                        const newSet = new Set(prev);
                        if (open) {
                          newSet.add(rug.id);
                        } else {
                          newSet.delete(rug.id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <CardTitle className="text-lg">{rug.rug_number}</CardTitle>
                              <CardDescription>
                                {rug.rug_type} • {rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'Dimensions TBD'}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {rugSelectedServices.size}/{rug.services.length} services
                              </p>
                              <p className="font-semibold text-primary">
                                ${rugTotal.toFixed(2)}
                              </p>
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
                      <CardContent className="pt-0">
                        <Tabs defaultValue="services">
                          <TabsList className="mb-4">
                            <TabsTrigger value="services" className="gap-1">
                              <DollarSign className="h-4 w-4" />
                              Services
                            </TabsTrigger>
                            <TabsTrigger value="photos" className="gap-1">
                              <Image className="h-4 w-4" />
                              Photos
                            </TabsTrigger>
                            <TabsTrigger value="report" className="gap-1">
                              <FileText className="h-4 w-4" />
                              Report
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="services" className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Select Services</span>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAllServices(rug.id, true)}
                                  disabled={allSelected}
                                >
                                  Select All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAllServices(rug.id, false)}
                                  disabled={onlyMandatorySelected}
                                >
                                  Clear Optional
                                </Button>
                              </div>
                            </div>

                            {rug.services.map((service) => {
                              const isSelected = rugSelectedServices.has(service.id);
                              const serviceTotal = service.quantity * service.unitPrice;
                              const isMandatory = isCleaningService(service.name);

                              return (
                                <div
                                  key={service.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    isSelected 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border bg-muted/30'
                                  } ${isMandatory ? 'bg-primary/10' : ''}`}
                                >
                                  <div className="flex items-center gap-3">
                                    {isMandatory ? (
                                      <div className="flex items-center justify-center h-5 w-5">
                                        <Lock className="h-4 w-4 text-primary" />
                                      </div>
                                    ) : (
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleService(rug.id, service.id)}
                                      />
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-medium ${!isSelected ? 'text-muted-foreground' : ''}`}>
                                          {service.name}
                                        </span>
                                        {isMandatory && (
                                          <Badge variant="secondary" className="text-xs">
                                            Required
                                          </Badge>
                                        )}
                                        <Badge 
                                          variant="outline" 
                                          className={
                                            service.priority === 'high' ? 'border-red-300 text-red-700' :
                                            service.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                            'border-green-300 text-green-700'
                                          }
                                        >
                                          {service.priority}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {service.quantity} × ${service.unitPrice.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`font-semibold ${!isSelected ? 'text-muted-foreground line-through' : ''}`}>
                                    ${serviceTotal.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </TabsContent>

                          <TabsContent value="photos">
                            {rug.photo_urls && rug.photo_urls.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {rug.photo_urls.map((url, idx) => (
                                  <RugPhoto
                                    key={idx}
                                    filePath={url}
                                    alt={`${rug.rug_number} photo ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border"
                                    loadingClassName="w-full h-32"
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-center py-8">
                                No photos available
                              </p>
                            )}
                          </TabsContent>

                          <TabsContent value="report">
                            {rug.analysis_report ? (
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mb-2 gap-1"
                                    onClick={() => handleDownloadReport(rug)}
                                  >
                                    <Download className="h-3 w-3" />
                                    Download report
                                  </Button>
                                </div>
                                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                                  {rug.analysis_report}
                                </pre>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-center py-8">
                                No report available
                              </p>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Services Selected</span>
                    <span>{selectedCount} of {totalServices}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Rugs</span>
                    <span>{rugs.length}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {rugs.map(rug => {
                    const rugSelectedServices = selectedServices.get(rug.id) || new Set();
                    const rugTotal = rug.services
                      .filter(s => rugSelectedServices.has(s.id))
                      .reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);

                    if (rugTotal === 0) return null;

                    return (
                      <div key={rug.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{rug.rug_number}</span>
                        <span>${rugTotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${totalSelected.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => handleProceedToPayment({ label: 'Full payment', multiplier: 1 })}
                    disabled={isProcessingPayment || selectedCount === 0}
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Pay in full
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    variant="outline"
                    onClick={() => handleProceedToPayment({ label: 'Deposit', multiplier: 0.5 })}
                    disabled={isProcessingPayment || selectedCount === 0}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay 50% deposit
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Secure payment powered by Stripe
                </p>
              </CardContent>
            </Card>

            {beforeAfterPairs.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Before & after
                  </CardTitle>
                  <CardDescription>See the transformation for your rug.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {beforeAfterPairs.slice(0, 1).map((pair) => (
                    <div key={pair.rugNumber} className="space-y-2">
                      <p className="text-sm font-medium">{pair.rugNumber}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <RugPhoto
                          filePath={pair.before}
                          alt={`${pair.rugNumber} before`}
                          className="w-full h-28 object-cover rounded-lg border"
                          loadingClassName="w-full h-28"
                        />
                        <RugPhoto
                          filePath={pair.after}
                          alt={`${pair.rugNumber} after`}
                          className="w-full h-28 object-cover rounded-lg border"
                          loadingClassName="w-full h-28"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Invoices & receipts
                </CardTitle>
                <CardDescription>Access payment records for your job.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {payments.length === 0 ? (
                  <p className="text-muted-foreground">No payments yet.</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <p className="font-medium">
                          {payment.status === 'completed' ? 'Paid' : 'Pending'} • ${payment.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => toast('Receipt will be emailed shortly.')}>
                        Email receipt
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Ask a question
                </CardTitle>
                <CardDescription>Need help or changes? Send us a message.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder="Type your question here..."
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <Button onClick={handleQuestionSubmit} className="w-full">
                  Send question
                </Button>
              </CardContent>
            </Card>

            {job.status === 'completed' && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Share your experience
                  </CardTitle>
                  <CardDescription>Help others by leaving a review.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your feedback helps us improve and helps neighbors find trusted service.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleReviewSubmit();
                      window.open(
                        `https://www.google.com/search?q=${encodeURIComponent(branding?.business_name || 'Rug cleaning')}+reviews`,
                        '_blank'
                      );
                    }}
                    className="w-full"
                    disabled={reviewSubmitted}
                  >
                    {reviewSubmitted ? 'Thanks for reviewing!' : 'Leave a review'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Contact Info */}
        {branding && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-center text-muted-foreground">
                Questions? Contact us at{' '}
                {branding.business_email && (
                  <a href={`mailto:${branding.business_email}`} className="text-primary hover:underline">
                    {branding.business_email}
                  </a>
                )}
                {branding.business_phone && (
                  <>
                    {branding.business_email && ' or '}
                    <a href={`tel:${branding.business_phone}`} className="text-primary hover:underline">
                      {branding.business_phone}
                    </a>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
