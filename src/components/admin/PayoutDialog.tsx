import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';

interface PayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUserId: string;
  businessName: string;
  maxAmount: number;  // This is gross revenue (before fees)
  grossRevenue: number;  // Total revenue collected
  onSuccess: () => void;
}

export const PayoutDialog = ({
  open,
  onOpenChange,
  businessUserId,
  businessName,
  maxAmount,
  grossRevenue,
  onSuccess,
}: PayoutDialogProps) => {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [loading, setLoading] = useState(false);
  const [feePercentage, setFeePercentage] = useState(10);
  const [amount, setAmount] = useState(maxAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    // Fetch current platform fee percentage
    const fetchFee = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_fee_percentage')
        .single();
      if (data) {
        setFeePercentage(parseFloat(data.setting_value));
      }
    };
    fetchFee();
  }, []);

  useEffect(() => {
    // Update default amount when maxAmount changes
    setAmount(maxAmount.toString());
  }, [maxAmount]);

  const platformFee = grossRevenue * (feePercentage / 100);
  const netPayableAmount = grossRevenue - platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (parsedAmount > netPayableAmount) {
      toast.error(`Amount cannot exceed net payable amount of $${netPayableAmount.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const { data: payout, error } = await supabase
        .from('payouts')
        .insert({
          user_id: businessUserId,
          amount: parsedAmount,
          status: 'pending',
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          notes: notes || null,
          period_start: periodStart || null,
          period_end: periodEnd || null,
          created_by: user?.id,
          gross_revenue: grossRevenue,
          platform_fees_deducted: platformFee,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification email
      if (payout) {
        await supabase.functions.invoke('notify-payout', {
          body: { payout_id: payout.id, notification_type: 'created' }
        });
        
        // Log the action
        logAction({
          action: 'payout_created',
          entity_type: 'payout',
          entity_id: payout.id,
          details: { 
            business: businessName, 
            amount: parsedAmount,
            gross_revenue: grossRevenue,
            platform_fee: platformFee,
          },
        });
      }

      toast.success('Payout created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating payout:', error);
      toast.error('Failed to create payout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payout for {businessName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fee Breakdown Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              Payout Calculation
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Gross Revenue:</span>
              <span className="text-right font-medium">${grossRevenue.toFixed(2)}</span>
              <span className="text-muted-foreground">Platform Fee ({feePercentage}%):</span>
              <span className="text-right font-medium text-amber-600">-${platformFee.toFixed(2)}</span>
              <span className="text-muted-foreground font-medium">Net Payable:</span>
              <span className="text-right font-bold text-green-600">${netPayableAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payout Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={netPayableAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum: ${netPayableAmount.toFixed(2)} (after {feePercentage}% platform fee)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number (optional)</Label>
            <Input
              id="referenceNumber"
              placeholder="Check #, Transfer ID, etc."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Payout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
