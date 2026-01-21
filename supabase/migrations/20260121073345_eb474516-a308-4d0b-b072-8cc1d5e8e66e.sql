-- Add RLS policy for clients to view inspections for jobs they have access to
CREATE POLICY "Clients can view inspections for their jobs" 
ON public.inspections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM client_job_access cja
    JOIN client_accounts ca ON ca.id = cja.client_id
    WHERE cja.job_id = inspections.job_id 
    AND ca.user_id = auth.uid()
  )
);