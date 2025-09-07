-- SUPABASE STORAGE POLICIES
-- Copy these policies into your Supabase Dashboard → Storage → Policies

-- ====================================================
-- ATTACHMENTS BUCKET POLICIES
-- ====================================================

-- Allow authenticated users to view attachments they have access to
CREATE POLICY "Users can view their own event attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload attachments to their own folders
CREATE POLICY "Users can upload their own event attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own event attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ====================================================
-- AVATARS BUCKET POLICIES (if you create it)
-- ====================================================

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
