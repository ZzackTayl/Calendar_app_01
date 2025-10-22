-- ======================================================================
-- MyOrbit Supabase Schema: Profile Pictures
-- Adds support for custom profile picture uploads and management
-- ======================================================================

-- Add columns to track profile picture source and custom uploads
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_picture_source TEXT DEFAULT 'provider'
  CHECK (profile_picture_source IN ('provider', 'custom')),
ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT;

-- Create storage bucket for profile pictures if it doesn't exist
-- Note: Run via Supabase dashboard or use RLS policies below

-- Create RLS policies for profile pictures bucket
-- (Assumes bucket 'profile-pictures' exists)

-- Allow users to upload their own profile picture
CREATE POLICY "Users can upload own profile pictures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to read all profile pictures (public read)
CREATE POLICY "Anyone can read profile pictures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own profile pictures"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update trigger to set profile_picture_source when avatar_url changes
CREATE OR REPLACE FUNCTION public.handle_avatar_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If avatar_url is being set and it's different from the old value
  IF NEW.avatar_url IS NOT NULL AND 
     (OLD.avatar_url IS NULL OR NEW.avatar_url != OLD.avatar_url) THEN
    -- Determine source: if it contains storage URL, it's custom, otherwise it's from provider
    IF NEW.avatar_url LIKE '%storage.supabase.co%' THEN
      NEW.profile_picture_source = 'custom';
    ELSE
      NEW.profile_picture_source = 'provider';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS profile_avatar_update_trigger ON public.profiles;
CREATE TRIGGER profile_avatar_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_avatar_update();

-- Add index for faster queries on profile picture source
CREATE INDEX IF NOT EXISTS profiles_picture_source_idx
  ON public.profiles (profile_picture_source);

-- Add index for faster avatar_url lookups (for connections to fetch pictures)
CREATE INDEX IF NOT EXISTS profiles_avatar_url_idx
  ON public.profiles (avatar_url)
  WHERE avatar_url IS NOT NULL;
