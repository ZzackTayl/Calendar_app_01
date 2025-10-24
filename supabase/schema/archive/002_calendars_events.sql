-- ======================================================================
-- MyOrbit Supabase Schema: Calendars & Events
-- Migration 002
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. calendars table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/user_calendar.dart
-- Supports multiple calendars per user (Google, Apple, MyOrbit, etc.)

CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_value INTEGER NOT NULL DEFAULT 4282795530,  -- Flutter Color int
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only manage their own calendars
CREATE POLICY "Users can select own calendars"
  ON public.calendars
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own calendars"
  ON public.calendars
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own calendars"
  ON public.calendars
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own calendars"
  ON public.calendars
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Ensure only one primary calendar per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_calendar_per_user
  ON public.calendars(owner_id)
  WHERE is_primary = TRUE;

-- Indexes
CREATE INDEX IF NOT EXISTS calendars_owner_idx
  ON public.calendars(owner_id);

-- Trigger for updated_at
CREATE TRIGGER calendars_set_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 2. calendar_visibility table
-- ----------------------------------------------------------------------
-- Tracks which calendars are visible in the UI
-- Separate table for easier querying and caching

CREATE TABLE IF NOT EXISTS public.calendar_visibility (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visible_calendar_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own visibility"
  ON public.calendar_visibility
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own visibility"
  ON public.calendar_visibility
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own visibility"
  ON public.calendar_visibility
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE TRIGGER calendar_visibility_set_updated_at
  BEFORE UPDATE ON public.calendar_visibility
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 3. recurrence_rules table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/recurrence_rule.dart
-- Stores sophisticated recurrence patterns

CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL 
    CHECK (pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL DEFAULT 1 
    CHECK (interval > 0),
  days_of_week INTEGER[],  -- 0=Sun, 1=Mon, ..., 6=Sat
  monthly_pattern TEXT 
    CHECK (monthly_pattern IN ('same-date', 'same-weekday', 'last-day')),
  end_type TEXT NOT NULL DEFAULT 'never' 
    CHECK (end_type IN ('never', 'after-occurrences', 'on-date')),
  occurrence_count INTEGER 
    CHECK (occurrence_count IS NULL OR occurrence_count > 0),
  end_date DATE,
  exceptions DATE[],  -- Dates to skip
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_end_type_data CHECK (
    (end_type = 'never') OR
    (end_type = 'after-occurrences' AND occurrence_count IS NOT NULL) OR
    (end_type = 'on-date' AND end_date IS NOT NULL)
  )
);

ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own recurrence rules"
  ON public.recurrence_rules
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own recurrence rules"
  ON public.recurrence_rules
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own recurrence rules"
  ON public.recurrence_rules
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own recurrence rules"
  ON public.recurrence_rules
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS recurrence_rules_owner_idx
  ON public.recurrence_rules(owner_id);

CREATE TRIGGER recurrence_rules_set_updated_at
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 4. events table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/event.dart
-- NOTE: Uses 'start'/'end' NOT 'start_ts'/'end_ts' to match Dart models

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  title TEXT NOT NULL,
  description TEXT,
  start TIMESTAMPTZ NOT NULL,  -- Matches Dart: json['start']
  "end" TIMESTAMPTZ NOT NULL,  -- Matches Dart: json['end'], quoted because 'end' is keyword
  privacy_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (privacy_level IN ('normal', 'exclusive', 'superExclusive')),
  reschedule_status TEXT NOT NULL DEFAULT 'none'
    CHECK (
      reschedule_status IN (
        'none',
        'pendingContact',
        'contactConfirmed',
        'awaitingUserApproval',
        'scheduled'
      )
    ),
  invited_partner_ids UUID[] NOT NULL DEFAULT '{}',
  external_provider TEXT,  -- 'google', 'apple', etc.
  external_event_id TEXT,  -- ID from external provider
  event_category_id TEXT,  -- Future: event categories
  recurrence_rule_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
  parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  is_exception BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK ("end" > start),
  CONSTRAINT recurring_event_constraints CHECK (
    (recurrence_rule_id IS NULL AND parent_event_id IS NULL) OR
    (recurrence_rule_id IS NOT NULL AND parent_event_id IS NULL) OR
    (recurrence_rule_id IS NULL AND parent_event_id IS NOT NULL)
  )
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can select own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS events_owner_idx
  ON public.events(owner_id);

CREATE INDEX IF NOT EXISTS events_calendar_idx
  ON public.events(calendar_id);

CREATE INDEX IF NOT EXISTS events_start_idx
  ON public.events(start);

CREATE INDEX IF NOT EXISTS events_time_range_idx
  ON public.events(start, "end");

CREATE INDEX IF NOT EXISTS events_recurrence_idx
  ON public.events(recurrence_rule_id)
  WHERE recurrence_rule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_parent_idx
  ON public.events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_reschedule_status_idx
  ON public.events(reschedule_status)
  WHERE reschedule_status <> 'none';

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 5. event_invites table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/event.dart EventInvite class

CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  -- Prevent duplicate invites
  UNIQUE(event_id, contact_id)
);

ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Complex RLS: Users can see invites for their events OR events they're invited to
CREATE POLICY "Users can select invites for own events"
  ON public.event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invites for own events"
  ON public.event_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invites for own events"
  ON public.event_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invites for own events"
  ON public.event_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS event_invites_event_idx
  ON public.event_invites(event_id);

CREATE INDEX IF NOT EXISTS event_invites_contact_idx
  ON public.event_invites(contact_id);

CREATE INDEX IF NOT EXISTS event_invites_status_idx
  ON public.event_invites(status);
