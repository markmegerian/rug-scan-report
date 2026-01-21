import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, CheckCircle, Image, FileText, DollarSign, 
  ChevronDown, ChevronUp, Check, X, CreditCard, LogOut, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';

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
}

interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
}

const ClientPortal = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [rugs, setRugs] = useState<RugData[]>([]);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [selectedServices, setSelectedServices] = useState<Map<string, Set<string>>>(new Map());
  const [expandedRugs, setExpandedRugs] = useState<Set<string>>(new Set());
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [clientJobAccessId, setClientJobAccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to client auth with the token
        navigate(`/client/auth?token=${accessToken}`);
      } else {
        checkAccessAndLoadData();
      }
    }
  }, [user, authLoading, accessToken]);

  const checkAccessAndLoadData = async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      // Check if this user has access to this job
      const { data: accessData, error: accessError } = await supabase
        .from('client_job_access')
        .select(`
          id,
          job_id,
          client_id,
          jobs (
            id,
            job_number,
            client_name,
            status,
            user_id
          )
        `)
        .eq('access_token', accessToken)
        .single();

      if (accessError) throw accessError;
      if (!accessData || !accessData.jobs) {
        toast.error('Invalid or expired access link');
        navigate('/');
        return;
      }

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

      setHasAccess(true);
      setClientJobAccessId(accessData.id);
      
      const jobData = accessData.jobs as unknown as JobData;
      setJob(jobData);

      // Fetch branding
      const { data: brandingData } = await supabase
        .from('profiles')
        .select('business_name, business_phone, business_email')
        .eq('user_id', (accessData.jobs as any).user_id)
        .single();

      if (brandingData) {
        setBranding(brandingData);
      }

      // Fetch rugs with approved estimates
      const { data: rugsData, error: rugsError } = await supabase
        .from('inspections')
        .select(`
          id,
          rug_number,
          rug_type,
          length,
          width,
          photo_urls,
          analysis_report,
          approved_estimates (
            id,
            services,
            total_amount
          )
        `)
        .eq('job_id', jobData.id);

      if (rugsError) throw rugsError;

      const processedRugs: RugData[] = (rugsData || [])
        .filter(r => {
          // Cast to array since Supabase returns array for one-to-many relations
          const estimates = r.approved_estimates as unknown as Array<{ id: string; services: unknown; total_amount: number }>;
          return estimates && estimates.length > 0;
        })
        .map(r => {
          const estimates = r.approved_estimates as unknown as Array<{ id: string; services: unknown; total_amount: number }>;
          const estimate = estimates[0];
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
        newMap.set(rugId, new Set());
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

  const handleProceedToPayment = async () => {
    const selectedCount = getSelectedServicesCount();
    if (selectedCount === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Prepare selected services data
      const servicesForCheckout: { rugNumber: string; services: ServiceItem[] }[] = [];
      
      rugs.forEach(rug => {
        const selectedIds = selectedServices.get(rug.id) || new Set();
        const rugSelectedServices = rug.services.filter(s => selectedIds.has(s.id));
        if (rugSelectedServices.length > 0) {
          servicesForCheckout.push({
            rugNumber: rug.rug_number,
            services: rugSelectedServices,
          });
        }
      });

      const total = calculateSelectedTotal();

      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          jobId: job?.id,
          clientJobAccessId,
          selectedServices: servicesForCheckout,
          totalAmount: total,
          customerEmail: user?.email,
          successUrl: `${window.location.origin}/client/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your estimate...</p>
        </div>
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

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rugs List - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {rugs.map((rug) => {
              const rugSelectedServices = selectedServices.get(rug.id) || new Set();
              const allSelected = rugSelectedServices.size === rug.services.length;
              const noneSelected = rugSelectedServices.size === 0;
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
                                  disabled={noneSelected}
                                >
                                  Clear All
                                </Button>
                              </div>
                            </div>

                            {rug.services.map((service) => {
                              const isSelected = rugSelectedServices.has(service.id);
                              const serviceTotal = service.quantity * service.unitPrice;

                              return (
                                <div
                                  key={service.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    isSelected 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border bg-muted/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleService(rug.id, service.id)}
                                    />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-medium ${!isSelected ? 'text-muted-foreground' : ''}`}>
                                          {service.name}
                                        </span>
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
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`${rug.rug_number} photo ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border"
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

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleProceedToPayment}
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
                      Proceed to Payment
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure payment powered by Stripe
                </p>
              </CardContent>
            </Card>
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
