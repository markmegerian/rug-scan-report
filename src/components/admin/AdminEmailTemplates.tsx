import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Info, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';

interface AdminEmailTemplate {
  id?: string;
  setting_key: string;
  subject: string;
  body: string;
}

const ADMIN_TEMPLATES: Record<string, { subject: string; body: string; description: string }> = {
  payout_created: {
    subject: 'Payout Initiated - {{amount}}',
    body: `Dear {{business_name}},

A payout has been initiated for your account.

Payout Details:
- Amount: {{amount}}
- Period: {{period_start}} to {{period_end}}
- Status: Pending
- Reference: {{reference_number}}

Payment Method: {{payment_method}}

You will receive another notification when the payout has been completed.

Best regards,
RugBoost Platform Team`,
    description: 'Sent to businesses when a payout is created',
  },
  payout_completed: {
    subject: '✓ Payout Completed - {{amount}}',
    body: `Dear {{business_name}},

Great news! Your payout has been completed.

Payout Details:
- Amount: {{amount}}
- Reference: {{reference_number}}
- Completed: {{completed_date}}
- Payment Method: {{payment_method}}

The funds should appear in your account within 1-3 business days.

Best regards,
RugBoost Platform Team`,
    description: 'Sent to businesses when a payout is marked complete',
  },
};

const TEMPLATE_VARIABLES = [
  { name: '{{business_name}}', description: 'Business name' },
  { name: '{{amount}}', description: 'Payout amount' },
  { name: '{{period_start}}', description: 'Period start date' },
  { name: '{{period_end}}', description: 'Period end date' },
  { name: '{{reference_number}}', description: 'Payment reference' },
  { name: '{{payment_method}}', description: 'Payment method used' },
  { name: '{{completed_date}}', description: 'Completion date' },
];

export const AdminEmailTemplates: React.FC = () => {
  const { logAction } = useAuditLog();
  const [templates, setTemplates] = useState<Record<string, AdminEmailTemplate>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .in('setting_key', ['admin_email_payout_created', 'admin_email_payout_completed']);

      if (error) throw error;

      const templateMap: Record<string, AdminEmailTemplate> = {};
      
      // Initialize with defaults
      Object.entries(ADMIN_TEMPLATES).forEach(([type, defaults]) => {
        templateMap[type] = {
          setting_key: `admin_email_${type}`,
          subject: defaults.subject,
          body: defaults.body,
        };
      });

      // Override with saved values
      (data || []).forEach((setting) => {
        const type = setting.setting_key.replace('admin_email_', '');
        if (templateMap[type]) {
          try {
            const parsed = JSON.parse(setting.setting_value);
            templateMap[type] = {
              id: setting.id,
              setting_key: setting.setting_key,
              subject: parsed.subject || ADMIN_TEMPLATES[type].subject,
              body: parsed.body || ADMIN_TEMPLATES[type].body,
            };
          } catch {
            // Use defaults if parsing fails
          }
        }
      });

      setTemplates(templateMap);
    } catch (error) {
      console.error('Error fetching admin templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: string) => {
    const template = templates[type];
    if (!template) return;

    setSaving(type);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: `admin_email_${type}`,
          setting_value: JSON.stringify({
            subject: template.subject,
            body: template.body,
          }),
          description: ADMIN_TEMPLATES[type].description,
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;

      // Log the action
      logAction({
        action: 'settings_updated',
        entity_type: 'email_template',
        entity_id: type,
        details: { template_type: type },
      });

      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (type: string) => {
    setTemplates(prev => ({
      ...prev,
      [type]: {
        setting_key: `admin_email_${type}`,
        subject: ADMIN_TEMPLATES[type].subject,
        body: ADMIN_TEMPLATES[type].body,
      },
    }));
    toast.success('Template reset to default');
  };

  const updateTemplate = (type: string, field: 'subject' | 'body', value: string) => {
    setTemplates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Platform Email Templates
        </CardTitle>
        <CardDescription>
          Customize the emails sent to businesses from the platform. Use variables to personalize messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Available variables:</strong>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {TEMPLATE_VARIABLES.map(v => (
                <div key={v.name}>
                  <code className="bg-muted px-1 rounded">{v.name}</code> - {v.description}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="payout_created">
          <TabsList className="mb-4">
            <TabsTrigger value="payout_created">Payout Created</TabsTrigger>
            <TabsTrigger value="payout_completed">Payout Completed</TabsTrigger>
          </TabsList>

          {Object.entries(ADMIN_TEMPLATES).map(([type, defaults]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <p className="text-sm text-muted-foreground">{defaults.description}</p>
              
              <div className="space-y-2">
                <Label htmlFor={`${type}-subject`}>Subject Line</Label>
                <Input
                  id={`${type}-subject`}
                  value={templates[type]?.subject || ''}
                  onChange={(e) => updateTemplate(type, 'subject', e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${type}-body`}>Email Body</Label>
                <Textarea
                  id={`${type}-body`}
                  value={templates[type]?.body || ''}
                  onChange={(e) => updateTemplate(type, 'body', e.target.value)}
                  placeholder="Email content..."
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave(type)}
                  disabled={saving === type}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving === type ? 'Saving...' : 'Save Template'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReset(type)}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
