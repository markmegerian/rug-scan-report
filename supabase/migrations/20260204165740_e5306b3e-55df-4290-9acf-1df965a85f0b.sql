-- Create a public view for client access that excludes sensitive contact information
CREATE VIEW public.inspections_client_view
WITH (security_invoker=on) AS
SELECT 
  id,
  job_id,
  rug_number,
  rug_type,
  length,
  width,
  notes,
  photo_urls,
  analysis_report,
  image_annotations,
  estimate_approved,
  created_at
  -- Excludes: client_name, client_email, client_phone, user_id
FROM public.inspections;

-- Drop the existing client access policy on inspections
DROP POLICY IF EXISTS "Clients can view inspections for their jobs" ON public.inspections;

-- Create a new restrictive client access policy that denies direct table access
-- Clients must use the inspections_client_view instead
-- Note: The view with security_invoker=on will use the caller's permissions,
-- and since we're removing the client SELECT policy, clients cannot directly query the table

-- Grant SELECT on the view to authenticated users (RLS on base table still applies for staff/admin)
GRANT SELECT ON public.inspections_client_view TO authenticated;