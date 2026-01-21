-- Fix security issues for payments, notifications, user_roles, and client_service_selections

-- 1. PAYMENTS TABLE: Add restrictive policies for INSERT/UPDATE/DELETE
-- Staff can only manage payments for their own jobs (matching the SELECT pattern)

-- Staff can delete pending payments for their jobs (needed for regenerating portal links)
CREATE POLICY "Staff can delete pending payments for their jobs" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (
  status = 'pending' 
  AND EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = payments.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- Note: INSERT and UPDATE for payments should only happen via service role (edge functions)
-- No client-side INSERT/UPDATE policies needed - this is intentional for security

-- 2. NOTIFICATIONS TABLE: No INSERT policy for regular users
-- Notifications are created by edge functions via service role
-- This is intentional - users should not be able to create notifications for others

-- 3. USER_ROLES TABLE: Restrict all mutations
-- Role management should only happen via trigger or service role
-- Adding explicit deny-all policies isn't needed since RLS is enabled and no policies exist
-- The trigger handle_new_user_role handles role creation automatically
-- No client-side INSERT/UPDATE/DELETE policies = no user can modify roles

-- 4. CLIENT_SERVICE_SELECTIONS: Restrict modifications after payment
-- First, drop the existing ALL policy and replace with more granular ones
DROP POLICY IF EXISTS "Clients can manage their own selections" ON public.client_service_selections;

-- Clients can SELECT their own selections
CREATE POLICY "Clients can view their own selections" 
ON public.client_service_selections 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_job_access cja
    JOIN client_accounts ca ON ca.id = cja.client_id
    WHERE cja.id = client_service_selections.client_job_access_id 
    AND ca.user_id = auth.uid()
  )
);

-- Clients can INSERT selections only if the job is not yet paid
CREATE POLICY "Clients can insert selections for unpaid jobs" 
ON public.client_service_selections 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_job_access cja
    JOIN client_accounts ca ON ca.id = cja.client_id
    JOIN jobs j ON j.id = cja.job_id
    WHERE cja.id = client_service_selections.client_job_access_id 
    AND ca.user_id = auth.uid()
    AND j.payment_status IS DISTINCT FROM 'paid'
  )
);

-- Clients can UPDATE selections only if the job is not yet paid
CREATE POLICY "Clients can update selections for unpaid jobs" 
ON public.client_service_selections 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_job_access cja
    JOIN client_accounts ca ON ca.id = cja.client_id
    JOIN jobs j ON j.id = cja.job_id
    WHERE cja.id = client_service_selections.client_job_access_id 
    AND ca.user_id = auth.uid()
    AND j.payment_status IS DISTINCT FROM 'paid'
  )
);

-- Clients can DELETE selections only if the job is not yet paid
CREATE POLICY "Clients can delete selections for unpaid jobs" 
ON public.client_service_selections 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_job_access cja
    JOIN client_accounts ca ON ca.id = cja.client_id
    JOIN jobs j ON j.id = cja.job_id
    WHERE cja.id = client_service_selections.client_job_access_id 
    AND ca.user_id = auth.uid()
    AND j.payment_status IS DISTINCT FROM 'paid'
  )
);