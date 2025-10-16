-- ======================================================================
-- MyOrbit Supabase Schema: Profiles & Contacts
-- This migration aligns the database with the Flutter domain models.
-- ======================================================================

-- Ensure UUID utilities are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/user_profile.dart and extends auth.users

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (lower(email));

-- ----------------------------------------------------------------------
-- 2. contacts
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/contact.dart

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'contactOnly')),
  permission TEXT NOT NULL DEFAULT 'private'
    CHECK (permission IN ('private', 'semiVisible', 'visible')),
  external_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  color_hex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own contacts"
  ON public.contacts
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS contacts_owner_idx
  ON public.contacts (owner_id);

CREATE INDEX IF NOT EXISTS contacts_status_idx
  ON public.contacts (status);

CREATE INDEX IF NOT EXISTS contacts_permission_idx
  ON public.contacts (permission);

-- ----------------------------------------------------------------------
-- 3. updated_at trigger helper
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
