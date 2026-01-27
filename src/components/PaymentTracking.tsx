import React, { useState } from 'react';
import { 
  CreditCard, Clock, CheckCircle, AlertCircle, 
  Download, FileText, ExternalLink, Receipt, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SelectedService {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface RugDetail {
  rugNumber: string;
  rugType: string;
  dimensions: string;
  services: SelectedService[];
  total: number;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  metadata: any;
}

interface BusinessBranding {
  business_name?: string | null;
  business_address?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  logo_url?: string | null;
}

interface PaymentTrackingProps {
  payments: Payment[];
  jobNumber: string;
  clientName: string;
  branding?: BusinessBranding | null;
  rugs?: RugDetail[];
  onGenerateInvoice?: (paymentId: string) => void;
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
  refunded: { 
    label: 'Refunded', 
    icon: CreditCard, 
    className: 'bg-gray-100 text-gray-800 border-gray-200' 
  },
};

const PaymentTracking: React.FC<PaymentTrackingProps> = ({ 
  payments, 
  jobNumber, 
  clientName,
  branding,
  rugs,
  onGenerateInvoice 
}) => {
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleGenerateInvoice = async (payment: Payment) => {
    if (onGenerateInvoice) {
      setGeneratingInvoice(payment.id);
      try {
        await onGenerateInvoice(payment.id);
      } finally {
        setGeneratingInvoice(null);
      }
      return;
    }

    // Call the generate-invoice-pdf edge function directly
    if (!payment.paid_at) {
      toast.error('Invoice can only be generated for completed payments');
      return;
    }

    setGeneratingInvoice(payment.id);
    try {
      // Build rug details for the invoice
      const rugDetails: RugDetail[] = rugs?.map(rug => ({
        rugNumber: rug.rugNumber,
        rugType: rug.rugType,
        dimensions: rug.dimensions,
        services: (rug.services || []).map((s: any) => ({
          id: s.id || s.name,
          name: s.name,
          quantity: s.quantity || 1,
          unitPrice: s.unitPrice || s.price || 0,
        })),
        total: rug.total,
      })) || [];

      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: {
          jobNumber,
          clientName,
          clientEmail: '', // We don't need this for download
          amount: Math.round(payment.amount * 100), // Convert to cents
          rugs: rugDetails,
          businessName: branding?.business_name || undefined,
          businessEmail: branding?.business_email || undefined,
          businessPhone: branding?.business_phone || undefined,
          businessAddress: branding?.business_address || undefined,
          paidAt: payment.paid_at,
        },
      });

      if (error) throw error;

      if (data?.pdfBase64) {
        // Download the PDF
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = `Invoice-${data.invoiceNumber || jobNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('No PDF data received');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Accounts Receivable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No payment records yet</p>
            <p className="text-sm">Payments will appear here once the client proceeds to checkout</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Accounts Receivable
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">Collected</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              ${totalPaid.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Outstanding</span>
            </div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              ${totalPending.toFixed(2)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Records Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const config = getStatusConfig(payment.status);
                const StatusIcon = config.icon;
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        ${payment.amount.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">
                        {payment.currency?.toUpperCase() || 'USD'}
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {payment.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateInvoice(payment)}
                            disabled={generatingInvoice === payment.id}
                          >
                            {generatingInvoice === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">Invoice</span>
                          </Button>
                        )}
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
      </CardContent>
    </Card>
  );
};

export default PaymentTracking;
