import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Subscribe to job status changes
    const jobsChannel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          const jobNumber = payload.new?.job_number;

          // Only notify on meaningful status changes
          if (oldStatus !== newStatus && jobNumber) {
            if (newStatus === 'completed') {
              toast.success(`Job #${jobNumber} completed!`, {
                description: 'All services have been marked as done.',
              });
            } else if (payload.new?.client_approved_at && !payload.old?.client_approved_at) {
              toast.success(`Job #${jobNumber} approved by client!`, {
                description: 'The estimate has been approved.',
              });
            }
          }

          // Invalidate jobs query to refresh data
          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        }
      )
      .subscribe();

    // Subscribe to payment changes
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
          // Check if this payment belongs to one of the user's jobs
          const { data: job } = await supabase
            .from('jobs')
            .select('job_number, user_id')
            .eq('id', payload.new?.job_id)
            .single();

          if (job?.user_id === user.id && payload.new?.status === 'completed') {
            const amount = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(payload.new?.amount || 0);

            toast.success(`Payment received: ${amount}`, {
              description: `Job #${job.job_number}`,
            });
          }

          queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        }
      )
      .subscribe();

    // Subscribe to notifications table
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast for new notifications
          const notification = payload.new;
          if (notification) {
            toast(notification.title, {
              description: notification.message,
            });
          }

          // Invalidate notifications query
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, queryClient]);
};