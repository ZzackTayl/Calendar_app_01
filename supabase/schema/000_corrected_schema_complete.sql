-- ======================================================================
-- COMPREHENSIVE CORRECTED MYORBIT SCHEMA
-- This replaces fragmented schema files with a unified, correct approach
-- ======================================================================

-- Ensure UUID utilities are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgtrgm";

-- ======================================================================
-- 1. PROFILES & AUTHENTICATION
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));

-- ======================================================================
-- 2. USER PREFERENCES (SYNCED ACROSS DEVICES)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  dark_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  default_privacy TEXT NOT NULL DEFAULT 'normal'
    CHECK (default_privacy IN ('normal', 'exclusive', 'superExclusive')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  event_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminder_minutes INTEGER NOT NULL DEFAULT 30 CHECK (event_reminder_minutes >= 0),
  event_notification_channels TEXT[] NOT NULL DEFAULT '{push}',
  partner_invites_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  calendar_changes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_reschedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_sms_cancellation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  signal_notification_channel TEXT NOT NULL DEFAULT 'push'
    CHECK (signal_notification_channel IN ('push', 'inAppOnly', 'sms')),
  signal_buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (signal_buffer_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own preferences"
  ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_preferences_user_idx ON public.user_preferences(user_id);

CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 3. CALENDARS (WITH PROVIDER TRACKING)
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

CREATE POLICY "Users can select own calendars"
  ON public.calendars FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own calendars"
  ON public.calendars FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own calendars"
  ON public.calendars FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own calendars"
  ON public.calendars FOR DELETE USING (auth.uid() = owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_calendar_per_user
  ON public.calendars(owner_id) WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS calendars_owner_idx ON public.calendars(owner_id);

CREATE TRIGGER calendars_set_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 4. CALENDAR VISIBILITY (USER'S PREFERENCE FOR WHICH CALENDARS TO SHOW)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.calendar_visibility (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visible_calendar_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own visibility"
  ON public.calendar_visibility FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own visibility"
  ON public.calendar_visibility FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own visibility"
  ON public.calendar_visibility FOR UPDATE USING (auth.uid() = owner_id);

CREATE TRIGGER calendar_visibility_set_updated_at
  BEFORE UPDATE ON public.calendar_visibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 5. RECURRENCE RULES (FOR RECURRING EVENTS & SIGNALS)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL CHECK (pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  days_of_week INTEGER[],
  monthly_pattern TEXT CHECK (monthly_pattern IN ('same-date', 'same-weekday', 'last-day')),
  end_type TEXT NOT NULL DEFAULT 'never'
    CHECK (end_type IN ('never', 'after-occurrences', 'on-date')),
  occurrence_count INTEGER CHECK (occurrence_count IS NULL OR occurrence_count > 0),
  end_date DATE,
  exceptions DATE[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_end_type_data CHECK (
    (end_type = 'never') OR
    (end_type = 'after-occurrences' AND occurrence_count IS NOT NULL) OR
    (end_type = 'on-date' AND end_date IS NOT NULL)
  )
);

ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own recurrence rules"
  ON public.recurrence_rules FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own recurrence rules"
  ON public.recurrence_rules FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own recurrence rules"
  ON public.recurrence_rules FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own recurrence rules"
  ON public.recurrence_rules FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER recurrence_rules_set_updated_at
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 6. CALENDAR EVENTS
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  privacy_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (privacy_level IN ('normal', 'exclusive', 'superExclusive')),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  external_provider TEXT,
  external_event_id TEXT,
  
  -- Recurrence support
  recurrence_rule_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
  parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  is_exception BOOLEAN NOT NULL DEFAULT FALSE,
  is_floating BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Rescheduling workflow
  reschedule_status TEXT NOT NULL DEFAULT 'none'
    CHECK (reschedule_status IN ('none', 'pendingContact', 'contactConfirmed', 'awaitingUserApproval', 'scheduled')),
  
  -- Deduplication for external calendar imports
  UNIQUE(owner_id, external_provider, external_event_id),
  CONSTRAINT valid_time_range CHECK (end_ts > start_ts),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own events"
  ON public.events FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS events_owner_idx ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS events_calendar_idx ON public.events(calendar_id);
CREATE INDEX IF NOT EXISTS events_time_idx ON public.events(start_ts, end_ts);
CREATE INDEX IF NOT EXISTS events_external_idx ON public.events(external_provider, external_event_id);

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 7. EVENT INVITES (TRACK WHO IS INVITED TO EVENTS)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, invited_user_id)
);

ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select invites for themselves"
  ON public.event_invites FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by_user_id);

CREATE POLICY "Event owners can insert invites"
  ON public.event_invites FOR INSERT
  WITH CHECK (auth.uid() = invited_by_user_id);

CREATE POLICY "Invitees can update their own response"
  ON public.event_invites FOR UPDATE
  USING (auth.uid() = invited_user_id);

CREATE INDEX IF NOT EXISTS event_invites_event_idx ON public.event_invites(event_id);
CREATE INDEX IF NOT EXISTS event_invites_user_idx ON public.event_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS event_invites_status_idx ON public.event_invites(status);

CREATE TRIGGER event_invites_set_updated_at
  BEFORE UPDATE ON public.event_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 8. CONTACTS (USER'S ADDRESS BOOK)
-- ======================================================================

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
  ON public.contacts FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS contacts_owner_idx ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON public.contacts(status);

CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 9. AVAILABILITY SIGNALS (RECURRING OR ONE-TIME)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.availability_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('available', 'busy', 'flexible', 'unavailable')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration TEXT,
  message TEXT,
  
  -- Recurrence support
  recurrence_rule_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_signal_time CHECK (end_time > start_time)
);

ALTER TABLE public.availability_signals ENABLE ROW LEVEL SECURITY;

-- Owner can manage their signals
CREATE POLICY "Users can select own signals"
  ON public.availability_signals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signals"
  ON public.availability_signals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signals"
  ON public.availability_signals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals"
  ON public.availability_signals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS signals_user_idx ON public.availability_signals(user_id);
CREATE INDEX IF NOT EXISTS signals_time_idx ON public.availability_signals(start_time, end_time);

CREATE TRIGGER availability_signals_set_updated_at
  BEFORE UPDATE ON public.availability_signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 10. SIGNAL SHARES (WHICH SIGNALS ARE SHARED WITH WHOM)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.signal_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES public.availability_signals(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_share CHECK (shared_by_user_id != shared_with_user_id)
);

ALTER TABLE public.signal_shares ENABLE ROW LEVEL SECURITY;

-- Owners can manage shares of their signals
CREATE POLICY "Signal owners can select shares"
  ON public.signal_shares FOR SELECT
  USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Signal owners can create shares"
  ON public.signal_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Signal owners can update shares"
  ON public.signal_shares FOR UPDATE
  USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Signal owners can delete shares"
  ON public.signal_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_signal_idx ON public.signal_shares(signal_id);
CREATE INDEX IF NOT EXISTS signal_shares_owner_idx ON public.signal_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS signal_shares_recipient_idx ON public.signal_shares(shared_with_user_id);

CREATE TRIGGER signal_shares_set_updated_at
  BEFORE UPDATE ON public.signal_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 11. NOTIFICATIONS (PERSISTENT IN DATABASE)
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_center BOOLEAN NOT NULL DEFAULT TRUE,
  action_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications(created_at DESC);

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 12. HELPER FUNCTION: set_updated_at()
-- ======================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- END OF SCHEMA
-- ======================================================================
