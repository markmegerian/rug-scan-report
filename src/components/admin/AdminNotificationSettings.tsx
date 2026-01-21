import { useState, useEffect } from 'react';
import { Loader2, Bell, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';

export const AdminNotificationSettings = () => {
  const { logAction } = useAuditLog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    payout_created_email: true,
    payout_completed_email: true,
    new_business_signup_email: true,
    low_balance_alert: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'payout_created_email',
          'payout_completed_email',
          'new_business_signup_email',
          'low_balance_alert',
        ]);

      if (error) throw error;

      if (data) {
        const newSettings = { ...settings };
        data.forEach((setting) => {
          if (setting.setting_key in newSettings) {
            (newSettings as Record<string, boolean>)[setting.setting_key] = 
              setting.setting_value === 'true';
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: String(value),
        description: getSettingDescription(key),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      // Log the action
      logAction({
        action: 'settings_updated',
        entity_type: 'notification_settings',
        details: settings,
      });

      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      payout_created_email: 'Send email when a payout is created',
      payout_completed_email: 'Send email when a payout is marked complete',
      new_business_signup_email: 'Notify admin when a new business signs up',
      low_balance_alert: 'Alert when a business has low balance',
    };
    return descriptions[key] || '';
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
          <Bell className="h-5 w-5 text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure which email notifications are sent automatically by the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="payout_created">Payout Created Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Send email to businesses when a payout is created
            </p>
          </div>
          <Switch
            id="payout_created"
            checked={settings.payout_created_email}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, payout_created_email: checked }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="payout_completed">Payout Completed Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Send email to businesses when a payout is marked as completed
            </p>
          </div>
          <Switch
            id="payout_completed"
            checked={settings.payout_completed_email}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, payout_completed_email: checked }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="new_business">New Business Signup Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notification when a new business signs up
            </p>
          </div>
          <Switch
            id="new_business"
            checked={settings.new_business_signup_email}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, new_business_signup_email: checked }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="low_balance">Low Balance Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get alerted when a business has outstanding balance for extended periods
            </p>
          </div>
          <Switch
            id="low_balance"
            checked={settings.low_balance_alert}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, low_balance_alert: checked }))
            }
          />
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
