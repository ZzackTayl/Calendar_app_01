-- ======================================================================
-- MyOrbit Supabase Schema: Availability Signals
-- Migration 003
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. availability_signals table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/availability_signal.dart
-- Users can share their availability (free/busy) with partners

CREATE TABLE IF NOT EXISTS public.availability_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  preferred_times JSONB,  -- Stores {day: [(start, end), ...]}
  excluded_dates DATE[] NOT NULL DEFAULT '{}',
  event_category_filter TEXT,  -- 'work', 'personal', etc.
  signal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT no_self_signal CHECK (owner_id != partner_user_id),
  
  -- Only one active signal per owner-partner pair
  UNIQUE(owner_id, partner_user_id)
);

ALTER TABLE public.availability_signals ENABLE ROW LEVEL SECURITY;

-- Users can manage their own signals
CREATE POLICY "Users can select own signals"
  ON public.availability_signals
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own signals"
  ON public.availability_signals
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own signals"
  ON public.availability_signals
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own signals"
  ON public.availability_signals
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Users can view signals shared WITH them
CREATE POLICY "Users can view signals shared with them"
  ON public.availability_signals
  FOR SELECT
  USING (auth.uid() = partner_user_id);

CREATE INDEX IF NOT EXISTS availability_signals_owner_idx
  ON public.availability_signals(owner_id);

CREATE INDEX IF NOT EXISTS availability_signals_partner_idx
  ON public.availability_signals(partner_user_id);

CREATE INDEX IF NOT EXISTS availability_signals_dates_idx
  ON public.availability_signals(start_date, end_date);

CREATE TRIGGER availability_signals_set_updated_at
  BEFORE UPDATE ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 2. signal_shares table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/signal_share.dart
-- Tracks what was shared and when

CREATE TABLE IF NOT EXISTS public.signal_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES public.availability_signals(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL DEFAULT 'availability'
    CHECK (share_type IN ('availability', 'busy-only', 'free-only')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT no_self_share CHECK (shared_by_user_id != shared_with_user_id)
);

ALTER TABLE public.signal_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own shares"
  ON public.signal_shares
  FOR SELECT
  USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Users can insert own shares"
  ON public.signal_shares
  FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can update own shares"
  ON public.signal_shares
  FOR UPDATE
  USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can delete own shares"
  ON public.signal_shares
  FOR DELETE
  USING (auth.uid() = shared_by_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_signal_idx
  ON public.signal_shares(signal_id);

CREATE INDEX IF NOT EXISTS signal_shares_shared_by_idx
  ON public.signal_shares(shared_by_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_shared_with_idx
  ON public.signal_shares(shared_with_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_status_idx
  ON public.signal_shares(status);

-- ----------------------------------------------------------------------
-- 3. signal_timeline_entries table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/signal_timeline_entry.dart
-- Denormalized view of computed availability for fast queries

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
  source_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (time_end > time_start)
);

ALTER TABLE public.signal_timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own timeline entries"
  ON public.signal_timeline_entries
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own timeline entries"
  ON public.signal_timeline_entries
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own timeline entries"
  ON public.signal_timeline_entries
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Users can view timeline entries for signals shared with them
CREATE POLICY "Users can view shared timeline entries"
  ON public.signal_timeline_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_signals
      WHERE availability_signals.id = signal_timeline_entries.signal_id
      AND availability_signals.partner_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS signal_timeline_entries_signal_idx
  ON public.signal_timeline_entries(signal_id);

CREATE INDEX IF NOT EXISTS signal_timeline_entries_owner_idx
  ON public.signal_timeline_entries(owner_id);

CREATE INDEX IF NOT EXISTS signal_timeline_entries_date_idx
  ON public.signal_timeline_entries(date);

CREATE INDEX IF NOT EXISTS signal_timeline_entries_date_time_idx
  ON public.signal_timeline_entries(date, time_start, time_end);

-- ----------------------------------------------------------------------
-- 4. notifications table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/notification.dart
-- In-app notifications for signals, invites, etc.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('signal-shared', 'signal-expired', 'event-invite', 'contact-request', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,  -- Additional metadata (event_id, contact_id, etc.)
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_center BOOLEAN NOT NULL DEFAULT TRUE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,  -- Deep link or route
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS show_in_center BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications(user_id, is_read, created_at)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS notifications_type_idx
  ON public.notifications(type);

CREATE INDEX IF NOT EXISTS notifications_center_idx
  ON public.notifications(user_id, created_at)
  WHERE show_in_center = TRUE AND is_dismissed = FALSE;
