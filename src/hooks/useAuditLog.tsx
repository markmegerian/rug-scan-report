import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AuditAction = 
  | 'settings_updated'
  | 'payout_created'
  | 'payout_completed'
  | 'payout_failed'
  | 'user_viewed'
  | 'fee_updated';

export type AuditEntityType = 
  | 'platform_settings'
  | 'payout'
  | 'user'
  | 'notification_settings'
  | 'email_template';

interface AuditLogEntry {
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async ({ action, entity_type, entity_id, details }: AuditLogEntry) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: user.id,
          action,
          entity_type,
          entity_id: entity_id || null,
          details: details || {},
        } as never);

      if (error) {
        console.error('Failed to log audit action:', error);
      }
    } catch (err) {
      console.error('Audit log error:', err);
    }
  };

  return { logAction };
};
