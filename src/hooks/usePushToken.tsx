import { useCallback, useEffect } from 'react';
import { useCapacitor } from './useCapacitor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePushToken() {
  const { isNative, platform, registerPushNotifications, pushToken } = useCapacitor();
  const { user } = useAuth();

  const savePushToken = useCallback(async (token: string) => {
    if (!user) return;

    try {
      // Upsert the token (insert or update if exists)
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            platform: platform as 'ios' | 'android' | 'web',
            device_info: {
              registered_at: new Date().toISOString(),
            },
          },
          {
            onConflict: 'user_id,token',
          }
        );

      if (error) {
        console.error('Failed to save push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }, [user, platform]);

  const registerAndSaveToken = useCallback(async () => {
    if (!isNative || !user) return null;

    const token = await registerPushNotifications();
    if (token) {
      await savePushToken(token);
    }
    return token;
  }, [isNative, user, registerPushNotifications, savePushToken]);

  // Auto-register when user logs in on native platforms
  useEffect(() => {
    if (user && isNative) {
      registerAndSaveToken();
    }
  }, [user, isNative, registerAndSaveToken]);

  // Save token when it changes
  useEffect(() => {
    if (pushToken && user) {
      savePushToken(pushToken);
    }
  }, [pushToken, user, savePushToken]);

  const removePushToken = useCallback(async () => {
    if (!user || !pushToken) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', pushToken);

      if (error) {
        console.error('Failed to remove push token:', error);
      }
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }, [user, pushToken]);

  return {
    registerAndSaveToken,
    removePushToken,
    pushToken,
  };
}
