-- Add unique constraint for client service selections upsert
ALTER TABLE public.client_service_selections
ADD CONSTRAINT client_service_selections_unique_access_estimate 
UNIQUE (client_job_access_id, approved_estimate_id);