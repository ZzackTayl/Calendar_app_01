-- ======================================================================
-- MyOrbit Supabase Schema: Contact Invitations
-- Migration 006
-- ======================================================================
-- Tracks invitations sent via SMS or Email to invite new contacts
-- Mirrors lib/domain/contact_invitation.dart

-- ----------------------------------------------------------------------
-- 1. contact_invitations table
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_phone_number TEXT,
  recipient_name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'email'
    CHECK (method IN ('email', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'accepted', 'declined', 'expired')),
  personal_message TEXT,
  expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_contact_method CHECK (
    (method = 'email' AND recipient_email IS NOT NULL) OR
    (method = 'sms' AND recipient_phone_number IS NOT NULL)
  ),
  -- Prevent duplicate pending invitations to the same email/phone
  UNIQUE(sender_id, recipient_email, method, status)
    WHERE status IN ('pending', 'sent')
);

ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view their own sent invitations
CREATE POLICY "Users can view own sent invitations"
  ON public.contact_invitations
  FOR SELECT
  USING (auth.uid() = sender_id);

-- Users can create invitations
CREATE POLICY "Users can create invitations"
  ON public.contact_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their own invitations
CREATE POLICY "Users can update own invitations"
  ON public.contact_invitations
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- Users can delete their own invitations
CREATE POLICY "Users can delete own invitations"
  ON public.contact_invitations
  FOR DELETE
  USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS contact_invitations_sender_idx
  ON public.contact_invitations(sender_id);

CREATE INDEX IF NOT EXISTS contact_invitations_email_idx
  ON public.contact_invitations(recipient_email);

CREATE INDEX IF NOT EXISTS contact_invitations_phone_idx
  ON public.contact_invitations(recipient_phone_number);

CREATE INDEX IF NOT EXISTS contact_invitations_status_idx
  ON public.contact_invitations(status);

CREATE INDEX IF NOT EXISTS contact_invitations_method_idx
  ON public.contact_invitations(method);

CREATE INDEX IF NOT EXISTS contact_invitations_created_at_idx
  ON public.contact_invitations(created_at);

CREATE TRIGGER contact_invitations_set_updated_at
  BEFORE UPDATE ON public.contact_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-expire invitations that are older than 30 days
CREATE OR REPLACE FUNCTION public.auto_expire_contact_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.contact_invitations
  SET status = 'expired'
  WHERE status IN ('pending', 'sent')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$;
