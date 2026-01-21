import { useState, useEffect } from 'react';
import { Loader2, Percent, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';

export const PlatformFeeSettings = () => {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [feePercentage, setFeePercentage] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCurrentFee();
  }, []);

  const fetchCurrentFee = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_fee_percentage')
        .single();

      if (error) throw error;
      if (data) {
        setFeePercentage(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching platform fee:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const fee = parseFloat(feePercentage);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error('Please enter a valid percentage between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          setting_value: feePercentage,
          updated_by: user?.id 
        })
        .eq('setting_key', 'platform_fee_percentage');

      if (error) throw error;
      
      // Log the action
      logAction({
        action: 'fee_updated',
        entity_type: 'platform_settings',
        entity_id: 'platform_fee_percentage',
        details: { new_value: feePercentage },
      });
      
      toast.success(`Platform fee updated to ${feePercentage}%`);
    } catch (error) {
      console.error('Error updating platform fee:', error);
      toast.error('Failed to update platform fee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Platform Fee
        </CardTitle>
        <CardDescription>
          Set the percentage fee taken from each transaction. This fee is deducted from business payouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="feePercentage">Fee Percentage</Label>
            <div className="relative">
              <Input
                id="feePercentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={feePercentage}
                onChange={(e) => setFeePercentage(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Example: A $100 payment with {feePercentage}% fee = ${(100 * parseFloat(feePercentage || '0') / 100).toFixed(2)} platform revenue
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
