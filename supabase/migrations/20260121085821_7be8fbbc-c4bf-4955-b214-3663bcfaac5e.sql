-- Add tracking columns to client_job_access table
ALTER TABLE public.client_job_access
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_error TEXT,
  ADD COLUMN IF NOT EXISTS first_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

-- Create a function to update access tracking (for use by clients)
CREATE OR REPLACE FUNCTION public.update_client_access_tracking(
  _access_token TEXT,
  _first_accessed BOOLEAN DEFAULT FALSE,
  _password_set BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _first_accessed THEN
    UPDATE client_job_access
    SET first_accessed_at = COALESCE(first_accessed_at, NOW())
    WHERE access_token = _access_token;
  END IF;
  
  IF _password_set THEN
    UPDATE client_job_access
    SET password_set_at = NOW()
    WHERE access_token = _access_token;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_client_access_tracking(TEXT, BOOLEAN, BOOLEAN) TO authenticated;