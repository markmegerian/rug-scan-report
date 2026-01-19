-- Fix storage policies to be user-scoped (prevent cross-user access)
-- Files should be organized by user: {user_id}/filename

-- Drop existing policies that allow any authenticated user
DROP POLICY IF EXISTS "Authenticated users can upload to rug-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view rug-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update rug-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete rug-photos" ON storage.objects;

-- Create user-scoped policies where files are in {user_id}/ folder
CREATE POLICY "Users can upload their own rug photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own rug photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own rug photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own rug photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);