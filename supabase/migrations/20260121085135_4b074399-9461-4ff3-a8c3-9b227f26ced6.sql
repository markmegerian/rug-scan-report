-- Create a SECURITY DEFINER function to validate access tokens securely
-- This prevents enumeration of tokens and exposure of email addresses
CREATE OR REPLACE FUNCTION public.validate_access_token(_token TEXT)
RETURNS TABLE(
  access_id UUID,
  job_id UUID,
  invited_email TEXT,
  client_id UUID,
  staff_user_id UUID,
  job_number TEXT,
  client_name TEXT,
  job_status TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cja.id as access_id,
    cja.job_id,
    cja.invited_email,
    cja.client_id,
    j.user_id as staff_user_id,
    j.job_number,
    j.client_name,
    j.status as job_status
  FROM client_job_access cja
  JOIN jobs j ON j.id = cja.job_id
  WHERE cja.access_token = _token
    AND (cja.expires_at IS NULL OR cja.expires_at > NOW());
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.validate_access_token(TEXT) TO anon, authenticated;

-- Drop the insecure public policy that exposes tokens and emails
DROP POLICY IF EXISTS "Anyone can view job access by token for claiming" ON public.client_job_access;