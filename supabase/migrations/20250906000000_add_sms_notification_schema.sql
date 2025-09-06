-- Add phone number and verification status to the users table
ALTER TABLE auth.users ADD COLUMN phone_number TEXT;
ALTER TABLE auth.users ADD COLUMN phone_number_verified BOOLEAN DEFAULT FALSE;

-- Create a table for user preferences
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_reminders_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the new table
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow users to manage their own preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
