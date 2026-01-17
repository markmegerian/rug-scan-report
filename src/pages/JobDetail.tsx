import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Loader2, Eye, Download, Trash2, 
  Edit2, FileText, CheckCircle, Clock, PlayCircle, Sparkles, FolderOpen, Mail
} from 'lucide-react';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { generatePDF, generateJobPDF, BusinessBranding } from '@/lib/pdfGenerator';
import RugForm from '@/components/RugForm';
import JobForm from '@/components/JobForm';
import EditRugDialog from '@/components/EditRugDialog';
import AnalysisReport from '@/components/AnalysisReport';

interface Job {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: PlayCircle, color: 'bg-blue-500' },
  { value: 'in-progress', label: 'In Progress', icon: Clock, color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500' },
];

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [rugs, setRugs] = useState<Rug[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRug, setIsAddingRug] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editingRug, setEditingRug] = useState<Rug | null>(null);
  const [addingRug, setAddingRug] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingRugId, setAnalyzingRugId] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [savingRug, setSavingRug] = useState(false);
  const [selectedRug, setSelectedRug] = useState<Rug | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && jobId) {
      fetchJobDetails();
      fetchBranding();
    }
  }, [user, jobId]);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, business_address, business_phone, business_email, logo_url')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching branding:', error);
        return;
      }

      if (data) {
        setBranding(data);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) throw jobError;
      if (!jobData) {
        toast.error('Job not found');
        navigate('/dashboard');
        return;
      }

      setJob(jobData);

      const { data: rugsData, error: rugsError } = await supabase
        .from('inspections')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (rugsError) throw rugsError;
      setRugs(rugsData || []);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photos) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${photo.name}`;
      
      const { data, error } = await supabase.storage
        .from('rug-photos')
        .upload(fileName, photo, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload ${photo.name}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('rug-photos')
        .getPublicUrl(data.path);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', job.id);

      if (error) throw error;
      
      setJob({ ...job, status: newStatus });
      toast.success(`Job status updated to ${newStatus}`);
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleEditJob = async (formData: {
    jobNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    if (!job) return;

    setSavingJob(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          job_number: formData.jobNumber,
          client_name: formData.clientName,
          client_email: formData.clientEmail || null,
          client_phone: formData.clientPhone || null,
          notes: formData.notes || null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Job updated successfully!');
      setIsEditingJob(false);
      fetchJobDetails();
    } catch (error) {
      console.error('Update job error:', error);
      toast.error('Failed to update job');
    } finally {
      setSavingJob(false);
    }
  };

  const handleEditRug = async (
    rugId: string,
    formData: { rugNumber: string; rugType: string; length: string; width: string; notes: string }
  ) => {
    setSavingRug(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          rug_number: formData.rugNumber,
          rug_type: formData.rugType,
          length: formData.length ? parseFloat(formData.length) : null,
          width: formData.width ? parseFloat(formData.width) : null,
          notes: formData.notes || null,
        })
        .eq('id', rugId);

      if (error) throw error;

      toast.success('Rug updated successfully!');
      setEditingRug(null);
      fetchJobDetails();
    } catch (error) {
      console.error('Update rug error:', error);
      toast.error('Failed to update rug');
    } finally {
      setSavingRug(false);
    }
  };

  const handleAddRug = async (
    formData: { rugNumber: string; length: string; width: string; rugType: string; notes: string },
    photos: File[]
  ) => {
    if (!user || !job) return;

    setAddingRug(true);
    
    try {
      toast.info('Uploading photos...');
      const photoUrls = await uploadPhotos(photos);

      // Just save the rug without AI analysis
      const { error: insertError } = await supabase.from('inspections').insert({
        user_id: user.id,
        job_id: job.id,
        client_name: job.client_name,
        rug_number: formData.rugNumber,
        rug_type: formData.rugType,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        notes: formData.notes || null,
        photo_urls: photoUrls,
        analysis_report: null // No analysis yet
      });

      if (insertError) throw insertError;

      toast.success('Rug added to job!');
      setIsAddingRug(false);
      fetchJobDetails();
    } catch (error) {
      console.error('Add rug failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add rug');
    } finally {
      setAddingRug(false);
    }
  };

  const analyzeRug = async (rug: Rug) => {
    if (!job) return;

    setAnalyzingRugId(rug.id);
    
    try {
      toast.info(`Analyzing ${rug.rug_number}...`);
      
      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: rug.photo_urls || [],
          rugInfo: {
            clientName: job.client_name,
            rugNumber: rug.rug_number,
            rugType: rug.rug_type,
            length: rug.length?.toString() || '',
            width: rug.width?.toString() || '',
            notes: rug.notes || ''
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update the rug with analysis
      const { error: updateError } = await supabase
        .from('inspections')
        .update({ analysis_report: data.report })
        .eq('id', rug.id);

      if (updateError) throw updateError;

      toast.success(`${rug.rug_number} analyzed!`);
      fetchJobDetails();
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : `Failed to analyze ${rug.rug_number}`);
    } finally {
      setAnalyzingRugId(null);
    }
  };

  const handleAnalyzeAllRugs = async () => {
    if (!job) return;

    const pendingRugs = rugs.filter(r => !r.analysis_report);
    if (pendingRugs.length === 0) {
      toast.info('All rugs have already been analyzed');
      return;
    }

    setAnalyzingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const rug of pendingRugs) {
      try {
        toast.info(`Analyzing ${rug.rug_number} (${successCount + errorCount + 1}/${pendingRugs.length})...`);
        
        const { data, error } = await supabase.functions.invoke('analyze-rug', {
          body: {
            photos: rug.photo_urls || [],
            rugInfo: {
              clientName: job.client_name,
              rugNumber: rug.rug_number,
              rugType: rug.rug_type,
              length: rug.length?.toString() || '',
              width: rug.width?.toString() || '',
              notes: rug.notes || ''
            }
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        await supabase
          .from('inspections')
          .update({ analysis_report: data.report })
          .eq('id', rug.id);

        successCount++;
      } catch (error) {
        console.error(`Analysis failed for ${rug.rug_number}:`, error);
        errorCount++;
      }
    }

    setAnalyzingAll(false);
    fetchJobDetails();

    if (errorCount === 0) {
      toast.success(`All ${successCount} rugs analyzed successfully!`);
    } else {
      toast.warning(`Analyzed ${successCount} rugs, ${errorCount} failed`);
    }
  };

  const handleViewReport = (rug: Rug) => {
    setSelectedRug(rug);
    setShowReport(true);
  };

  const handleDownloadPDF = async (rug: Rug) => {
    if (!job) return;
    
    try {
      await generatePDF({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      }, branding);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadJobPDF = async () => {
    if (!job || rugs.length === 0) {
      toast.error('No rugs to include in the report');
      return;
    }

    try {
      const rugsWithClient = rugs.map(rug => ({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      }));

      await generateJobPDF(job, rugsWithClient, branding);
      toast.success('Complete job report downloaded!');
    } catch (error) {
      console.error('Job PDF generation error:', error);
      toast.error('Failed to generate job report');
    }
  };

  const handleSendEmail = async () => {
    if (!job || rugs.length === 0) {
      toast.error('No rugs to include in the report');
      return;
    }

    if (!job.client_email) {
      toast.error('Client email is required to send report');
      return;
    }

    const analyzedRugs = rugs.filter(r => r.analysis_report);
    if (analyzedRugs.length === 0) {
      toast.error('Please analyze at least one rug before sending the report');
      return;
    }

    setSendingEmail(true);
    try {
      const rugDetails = analyzedRugs.map(rug => ({
        rugNumber: rug.rug_number,
        rugType: rug.rug_type,
        dimensions: rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
      }));

      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: job.client_email,
          clientName: job.client_name,
          jobNumber: job.job_number,
          rugDetails,
          businessName: branding?.business_name,
          businessEmail: branding?.business_email,
          businessPhone: branding?.business_phone,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Report sent to ${job.client_email}!`);
    } catch (error) {
      console.error('Email send error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteRug = async (rugId: string) => {
    if (!confirm('Are you sure you want to delete this rug?')) return;

    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', rugId);

      if (error) throw error;
      toast.success('Rug deleted');
      fetchJobDetails();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete rug');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const Icon = statusConfig.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={`gap-1 ${
          status === 'completed' ? 'border-green-500 text-green-600' :
          status === 'in-progress' ? 'border-yellow-500 text-yellow-600' :
          'border-blue-500 text-blue-600'
        }`}
      >
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return null;

  if (showReport && selectedRug) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">RugBoost</h1>
                <p className="text-xs text-muted-foreground">{selectedRug.rug_number}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <AnalysisReport
              report={selectedRug.analysis_report || ''}
              rugInfo={{
                clientName: job.client_name,
                rugNumber: selectedRug.rug_number,
                rugType: selectedRug.rug_type,
                dimensions: `${selectedRug.length || '–'}' × ${selectedRug.width || '–'}'`,
              }}
              onNewInspection={() => setShowReport(false)}
            />
          </div>
        </main>
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
              <p className="text-xs text-muted-foreground">Job Details</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Job Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="font-display text-2xl">
                  Job {job.job_number}
                </CardTitle>
                {getStatusBadge(job.status)}
              </div>
              <div className="flex items-center gap-2">
                <Select value={job.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isEditingJob} onOpenChange={setIsEditingJob}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit2 className="h-4 w-4" />
                      Edit Job
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl">Edit Job</DialogTitle>
                    </DialogHeader>
                    <JobForm
                      onSubmit={handleEditJob}
                      isLoading={savingJob}
                      mode="edit"
                      initialData={{
                        jobNumber: job.job_number,
                        clientName: job.client_name,
                        clientEmail: job.client_email || '',
                        clientPhone: job.client_phone || '',
                        notes: job.notes || '',
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{job.client_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{job.client_email || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{job.client_phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(job.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
            {job.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-muted-foreground text-sm">Notes</p>
                <p className="text-sm">{job.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rugs Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <CardTitle className="font-display text-xl">
                  Rugs ({rugs.length})
                </CardTitle>
                {rugs.length > 0 && (
                  <Badge variant="secondary">
                    {rugs.filter(r => r.analysis_report).length}/{rugs.length} analyzed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {rugs.length > 0 && rugs.some(r => !r.analysis_report) && (
                  <Button 
                    variant="warm"
                    className="gap-2"
                    onClick={handleAnalyzeAllRugs}
                    disabled={analyzingAll}
                  >
                    {analyzingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze All Rugs
                      </>
                    )}
                  </Button>
                )}
                {rugs.length > 0 && rugs.some(r => r.analysis_report) && (
                  <>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleDownloadJobPDF}
                    >
                      <FileText className="h-4 w-4" />
                      Download Report
                    </Button>
                    {job.client_email && (
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={handleSendEmail}
                        disabled={sendingEmail}
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            Email Report
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
                <Dialog open={isAddingRug} onOpenChange={setIsAddingRug}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Rug
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl">Add Rug to Job</DialogTitle>
                    </DialogHeader>
                    <RugForm
                      onSubmit={handleAddRug}
                      isLoading={addingRug}
                      rugIndex={rugs.length}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rugs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rugs added yet</p>
                <p className="text-sm mt-1">Click "Add Rug" to add rugs, then analyze them all at once</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rug #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Photos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rugs.map((rug) => (
                    <TableRow key={rug.id}>
                      <TableCell className="font-medium">{rug.rug_number}</TableCell>
                      <TableCell>{rug.rug_type}</TableCell>
                      <TableCell>
                        {rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—'}
                      </TableCell>
                      <TableCell>{rug.photo_urls?.length || 0}</TableCell>
                      <TableCell>
                        {rug.analysis_report ? (
                          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Analyzed
                          </Badge>
                        ) : analyzingRugId === rug.id ? (
                          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analyzing
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-muted-foreground text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {rug.analysis_report ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReport(rug)}
                                title="View Report"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(rug)}
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => analyzeRug(rug)}
                              disabled={!!analyzingRugId || analyzingAll}
                              title="Analyze Rug"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRug(rug)}
                            title="Edit Rug"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRug(rug.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete Rug"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Rug Dialog */}
      <EditRugDialog
        rug={editingRug}
        open={!!editingRug}
        onOpenChange={(open) => !open && setEditingRug(null)}
        onSave={handleEditRug}
        isLoading={savingRug}
      />
    </div>
  );
};

export default JobDetail;
