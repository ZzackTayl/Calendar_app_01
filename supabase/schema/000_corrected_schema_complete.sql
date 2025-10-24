-- ======================================================================
-- MyOrbit Calendar - Canonical Supabase Schema (2025-10-24)
-- ======================================================================
-- This script provisions the complete database schema expected by the
-- Flutter application in its current state. It supersedes any legacy SQL
-- in this directory. Apply this file in a fresh project or when resyncing
-- a Supabase instance with the latest codebase.
-- ======================================================================

-- Ensure required extensions are available (id generators, trigram search).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------
-- Shared helper: set_updated_at()
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- 1. profiles
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  profile_picture_source TEXT NOT NULL DEFAULT 'provider'
    CHECK (profile_picture_source IN ('provider', 'custom')),
  custom_avatar_url TEXT,
  avatar_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_self
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_self
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (LOWER(email));

CREATE TRIGGER profiles_updated_at_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 2. user_preferences (synced settings)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  dark_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_privacy TEXT NOT NULL DEFAULT 'normal'
    CHECK (default_privacy IN ('normal', 'exclusive', 'superExclusive')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  event_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminder_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (event_reminder_minutes >= 0),
  event_notification_channels TEXT[] NOT NULL DEFAULT ARRAY['push']
    CHECK (event_notification_channels <@ ARRAY['inAppOnly', 'push', 'sms']),
  partner_invites_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  calendar_changes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_reschedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_sms_cancellation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  signal_notification_channel TEXT NOT NULL DEFAULT 'push'
    CHECK (signal_notification_channel IN ('push', 'inAppOnly', 'sms')),
  signal_buffer_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (signal_buffer_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select_self
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_preferences_insert_self
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_preferences_update_self
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_preferences_user_idx
  ON public.user_preferences (user_id);

CREATE TRIGGER user_preferences_updated_at_trg
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 3. calendars & visibility
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_value INTEGER NOT NULL DEFAULT 4282795530,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  provider TEXT NOT NULL DEFAULT 'myorbit'
    CHECK (provider IN ('myorbit', 'google', 'apple', 'outlook', 'caldav')),
  external_calendar_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendars_select_self
  ON public.calendars
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY calendars_insert_self
  ON public.calendars
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY calendars_update_self
  ON public.calendars
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY calendars_delete_self
  ON public.calendars
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS calendars_unique_primary_idx
  ON public.calendars(owner_id)
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS calendars_owner_idx
  ON public.calendars(owner_id);

CREATE TRIGGER calendars_updated_at_trg
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.calendar_visibility (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visible_calendar_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_visibility_select_self
  ON public.calendar_visibility
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY calendar_visibility_insert_self
  ON public.calendar_visibility
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY calendar_visibility_update_self
  ON public.calendar_visibility
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE TRIGGER calendar_visibility_updated_at_trg
  BEFORE UPDATE ON public.calendar_visibility
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 4. recurrence rules
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL
    CHECK (pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL DEFAULT 1
    CHECK (interval > 0),
  days_of_week INTEGER[],
  monthly_pattern TEXT
    CHECK (monthly_pattern IS NULL OR monthly_pattern IN ('sameDate', 'sameWeekday', 'lastDay')),
  end_type TEXT NOT NULL DEFAULT 'never'
    CHECK (end_type IN ('never', 'afterOccurrences', 'onDate')),
  occurrence_count INTEGER
    CHECK (occurrence_count IS NULL OR occurrence_count > 0),
  end_date DATE,
  exceptions DATE[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurrence_rules_select_self
  ON public.recurrence_rules
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY recurrence_rules_manage_self
  ON public.recurrence_rules
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY recurrence_rules_update_self
  ON public.recurrence_rules
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY recurrence_rules_delete_self
  ON public.recurrence_rules
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS recurrence_rules_owner_idx
  ON public.recurrence_rules(owner_id);

CREATE TRIGGER recurrence_rules_updated_at_trg
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 5. contacts
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'contactOnly')),
  permission TEXT NOT NULL DEFAULT 'private'
    CHECK (permission IN ('private', 'semiVisible', 'visible')),
  external_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  color_hex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select_self
  ON public.contacts
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY contacts_insert_self
  ON public.contacts
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY contacts_update_self
  ON public.contacts
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY contacts_delete_self
  ON public.contacts
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS contacts_owner_idx
  ON public.contacts(owner_id);

CREATE INDEX IF NOT EXISTS contacts_external_idx
  ON public.contacts(external_user_id);

CREATE TRIGGER contacts_updated_at_trg
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 6. events
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  privacy_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (privacy_level IN ('normal', 'exclusive', 'superExclusive')),
  reschedule_status TEXT NOT NULL DEFAULT 'none'
    CHECK (reschedule_status IN ('none', 'pendingContact', 'contactConfirmed', 'awaitingUserApproval', 'scheduled')),
  invited_partner_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  external_provider TEXT,
  external_event_id TEXT,
  event_category_id TEXT,
  recurrence_rule_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
  parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  is_exception BOOLEAN NOT NULL DEFAULT FALSE,
  is_floating BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_valid_time_range CHECK ("end" > start)
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select_self
  ON public.events
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY events_insert_self
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY events_update_self
  ON public.events
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY events_delete_self
  ON public.events
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS events_external_unique_idx
  ON public.events(owner_id, external_provider, external_event_id)
  WHERE external_provider IS NOT NULL
    AND external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_owner_idx
  ON public.events(owner_id);

CREATE INDEX IF NOT EXISTS events_start_idx
  ON public.events(start, "end");

CREATE INDEX IF NOT EXISTS events_calendar_idx
  ON public.events(calendar_id);

CREATE TRIGGER events_updated_at_trg
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 7. event_invites
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  note TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, contact_id)
);

ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Event owners can manage invites for their events.
CREATE POLICY event_invites_owner_manage
  ON public.event_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id AND e.owner_id = auth.uid()
    )
  );

CREATE POLICY event_invites_owner_read
  ON public.event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id AND e.owner_id = auth.uid()
    )
  );

-- Invitees (by contact) can read/update their own invitation status.
CREATE POLICY event_invites_contact_read
  ON public.event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      WHERE c.id = contact_id AND c.external_user_id = auth.uid()
    )
  );

CREATE POLICY event_invites_contact_update
  ON public.event_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.contacts c
      WHERE c.id = contact_id AND c.external_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS event_invites_event_idx
  ON public.event_invites(event_id);

CREATE INDEX IF NOT EXISTS event_invites_contact_idx
  ON public.event_invites(contact_id);

CREATE TRIGGER event_invites_updated_at_trg
  BEFORE UPDATE ON public.event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 8. availability signals & sharing
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.availability_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID GENERATED ALWAYS AS (owner_id) STORED,
  signal_type TEXT NOT NULL DEFAULT 'available'
    CHECK (signal_type IN ('available', 'busy', 'flexible', 'unavailable')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration TEXT
    CHECK (duration IS NULL OR duration IN ('hour', 'hours2', 'hours4', 'day', 'custom')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_signals_valid_time_range CHECK (end_time > start_time)
);

ALTER TABLE public.availability_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_signals_select_owner
  ON public.availability_signals
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY availability_signals_insert_owner
  ON public.availability_signals
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY availability_signals_update_owner
  ON public.availability_signals
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY availability_signals_delete_owner
  ON public.availability_signals
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY availability_signals_select_shared
  ON public.availability_signals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.signal_shares sh
      WHERE sh.signal_id = availability_signals.id
        AND sh.shared_with_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS availability_signals_owner_idx
  ON public.availability_signals(owner_id);

CREATE INDEX IF NOT EXISTS availability_signals_time_idx
  ON public.availability_signals(start_time, end_time);

CREATE TRIGGER availability_signals_updated_at_trg
  BEFORE UPDATE ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.signal_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES public.availability_signals(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signal_shares_no_self CHECK (shared_by_user_id <> shared_with_user_id)
);

ALTER TABLE public.signal_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY signal_shares_select_related
  ON public.signal_shares
  FOR SELECT
  USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_with_user_id);

CREATE POLICY signal_shares_insert_owner
  ON public.signal_shares
  FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY signal_shares_update_owner
  ON public.signal_shares
  FOR UPDATE
  USING (auth.uid() = shared_by_user_id);

CREATE POLICY signal_shares_delete_owner
  ON public.signal_shares
  FOR DELETE
  USING (auth.uid() = shared_by_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_signal_idx
  ON public.signal_shares(signal_id);

CREATE INDEX IF NOT EXISTS signal_shares_owner_idx
  ON public.signal_shares(shared_by_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_recipient_idx
  ON public.signal_shares(shared_with_user_id);

CREATE TRIGGER signal_shares_updated_at_trg
  BEFORE UPDATE ON public.signal_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.signal_timeline_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES public.availability_signals(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('free', 'busy', 'tentative', 'out-of-office')),
  confidence REAL NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0.0 AND confidence <= 1.0),
  source_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signal_timeline_valid_time CHECK (time_end > time_start)
);

ALTER TABLE public.signal_timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY signal_timeline_owner
  ON public.signal_timeline_entries
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY signal_timeline_owner_insert
  ON public.signal_timeline_entries
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY signal_timeline_owner_delete
  ON public.signal_timeline_entries
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY signal_timeline_shared
  ON public.signal_timeline_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.signal_shares sh
      WHERE sh.signal_id = signal_timeline_entries.signal_id
        AND sh.shared_with_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS signal_timeline_signal_idx
  ON public.signal_timeline_entries(signal_id);

CREATE INDEX IF NOT EXISTS signal_timeline_owner_idx
  ON public.signal_timeline_entries(owner_id);

CREATE INDEX IF NOT EXISTS signal_timeline_date_idx
  ON public.signal_timeline_entries(date, time_start, time_end);

-- ======================================================================
-- 9. notifications
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  message TEXT,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  action_id TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_center BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_self
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY notifications_insert_self
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_update_self
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY notifications_delete_self
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_read_idx
  ON public.notifications(is_read);

CREATE TRIGGER notifications_updated_at_trg
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 10. data_export_requests
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  include_events BOOLEAN NOT NULL DEFAULT TRUE,
  include_contacts BOOLEAN NOT NULL DEFAULT TRUE,
  include_signals BOOLEAN NOT NULL DEFAULT TRUE,
  format TEXT NOT NULL DEFAULT 'json'
    CHECK (format IN ('json', 'csv', 'ics')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  download_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_export_requests_select_self
  ON public.data_export_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY data_export_requests_insert_self
  ON public.data_export_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY data_export_requests_update_self
  ON public.data_export_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS data_export_requests_user_idx
  ON public.data_export_requests(user_id, created_at DESC);

-- ======================================================================
-- 11. calendar_migrations
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.calendar_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  include_past_events BOOLEAN NOT NULL DEFAULT FALSE,
  include_shared_calendars BOOLEAN NOT NULL DEFAULT FALSE,
  merge_duplicates BOOLEAN NOT NULL DEFAULT FALSE,
  notify_partners BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

ALTER TABLE public.calendar_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_migrations_select_self
  ON public.calendar_migrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY calendar_migrations_insert_self
  ON public.calendar_migrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY calendar_migrations_update_self
  ON public.calendar_migrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS calendar_migrations_user_idx
  ON public.calendar_migrations(user_id, created_at DESC);

-- ======================================================================
-- 12. contact_invitations
-- ======================================================================
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
  CONSTRAINT contact_invitation_recipient_required CHECK (
    (method = 'email' AND recipient_email IS NOT NULL)
    OR (method = 'sms' AND recipient_phone_number IS NOT NULL)
  )
);

-- Prevent duplicate pending/sent invitations per recipient.
CREATE UNIQUE INDEX IF NOT EXISTS contact_invitations_unique_email_pending
  ON public.contact_invitations(sender_id, recipient_email)
  WHERE status IN ('pending', 'sent') AND method = 'email';

CREATE UNIQUE INDEX IF NOT EXISTS contact_invitations_unique_sms_pending
  ON public.contact_invitations(sender_id, recipient_phone_number)
  WHERE status IN ('pending', 'sent') AND method = 'sms';

ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_invitations_select_self
  ON public.contact_invitations
  FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY contact_invitations_insert_self
  ON public.contact_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY contact_invitations_update_self
  ON public.contact_invitations
  FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY contact_invitations_delete_self
  ON public.contact_invitations
  FOR DELETE
  USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS contact_invitations_sender_idx
  ON public.contact_invitations(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS contact_invitations_status_idx
  ON public.contact_invitations(status);

CREATE TRIGGER contact_invitations_updated_at_trg
  BEFORE UPDATE ON public.contact_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 13. sms_conversations (AI agent messaging)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  agent_type TEXT NOT NULL DEFAULT 'general'
    CHECK (agent_type IN ('outreach', 'availability', 'confirmation', 'general')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'received', 'processing', 'processed', 'failed', 'error')),
  twilio_sid TEXT,
  error_message TEXT,
  context_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_conversations_select_self
  ON public.sms_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY sms_conversations_insert_self
  ON public.sms_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sms_conversations_update_self
  ON public.sms_conversations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sms_conversations_user_idx
  ON public.sms_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sms_conversations_phone_idx
  ON public.sms_conversations(user_id, recipient_phone_number);

CREATE TRIGGER sms_conversations_updated_at_trg
  BEFORE UPDATE ON public.sms_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 14. rate_limit_log (edge function throttling)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limit_log_select_self
  ON public.rate_limit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role policies handled outside of RLS (via Supabase roles).

CREATE INDEX IF NOT EXISTS rate_limit_log_action_idx
  ON public.rate_limit_log(user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS rate_limit_log_cleanup_idx
  ON public.rate_limit_log(created_at);

-- ======================================================================
-- END OF SCHEMA
-- ======================================================================
