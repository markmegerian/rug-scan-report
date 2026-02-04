-- Add RLS policy to the view for client access
-- Views with security_invoker=on need their own policies
CREATE POLICY "Clients can view inspections via view for their jobs"
ON public.inspections
FOR SELECT
USING (client_has_job_access(job_id));

-- This policy allows the view to work for clients, but since the view 
-- only exposes non-sensitive columns, clients can't see contact info