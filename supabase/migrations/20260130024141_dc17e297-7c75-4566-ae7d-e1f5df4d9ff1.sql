-- Add notification_preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB 
DEFAULT '{"emailReports": true, "jobUpdates": true, "marketingEmails": false}'::jsonb;

-- Add logo_path column to store file paths instead of expiring signed URLs
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS logo_path TEXT;