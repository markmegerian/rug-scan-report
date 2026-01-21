-- Step 1: Drop the problematic policy on client_accounts
DROP POLICY IF EXISTS "Staff can view client accounts for their jobs" ON public.client_accounts;

-- Step 2: Create a helper function to check client job access (avoids recursion)
CREATE OR REPLACE FUNCTION public.client_has_job_access(check_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM client_job_access cja
    JOIN client_accounts ca ON ca.id = cja.client_id
    WHERE cja.job_id = check_job_id
    AND ca.user_id = auth.uid()
  );
$$;

-- Step 3: Drop and recreate the inspections policy using the function
DROP POLICY IF EXISTS "Clients can view inspections for their jobs" ON public.inspections;

CREATE POLICY "Clients can view inspections for their jobs" 
ON public.inspections 
FOR SELECT 
USING (client_has_job_access(job_id));

-- Step 4: Drop and recreate approved_estimates policy using the function  
DROP POLICY IF EXISTS "Clients can view estimates for their jobs" ON public.approved_estimates;

CREATE POLICY "Clients can view estimates for their jobs" 
ON public.approved_estimates 
FOR SELECT 
USING (client_has_job_access(job_id));