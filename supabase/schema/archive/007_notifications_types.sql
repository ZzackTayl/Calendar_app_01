-- ======================================================================
-- Migration 007: Widen notifications.type CHECK to match app usage
-- ======================================================================

-- Drop old CHECK if present
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_allowed;

-- Add superset of allowed notification types used across the app
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_allowed CHECK (
    type IN (
      -- Signals
      'signal-shared', 'signal_shared',
      'signal-expired', 'signal_expired',
      'signal-received', 'signal_received',

      -- Invites / contacts
      'event-invite', 'event_invite',
      'contact-request', 'contact_request',
      'partner-request', 'partner_request',
      'partner-accepted', 'partner_accepted', 'contact-accepted', 'contact_accepted',

      -- Event updates
      'event-update', 'event_update', 'event-updated', 'event_updated', 'event-change', 'event_change',
      'event-reminder', 'event_reminder',
      'event-cancelled', 'event_cancelled', 'event-canceled', 'event_canceled',

      -- Calendar share & migrations
      'calendar-shared', 'calendar_shared',
      'migration-started', 'migration_started',

      -- System/broadcast
      'system', 'general', 'info'
    )
  );

-- Index already exists in 003; keep for completeness if running standalone
CREATE INDEX IF NOT EXISTS notifications_type_idx
  ON public.notifications(type);
