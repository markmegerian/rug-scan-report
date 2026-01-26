-- Add policy for clients to view jobs they have access to
-- This allows clients to query jobs directly through the client portal
CREATE POLICY "Clients can view jobs they have access to"
ON public.jobs
FOR SELECT
USING (client_has_job_access(id));