-- ======================================================================
-- MyOrbit Supabase Schema: Realtime Configuration
-- Migration 005
-- ======================================================================

-- Enable Realtime for key tables so clients get live updates
-- This is configured via Supabase Dashboard > Database > Publications

-- NOTE: In Supabase, Realtime is enabled per-table via the Dashboard.
-- This file documents which tables should have Realtime enabled and
-- provides SQL commands for manual setup if needed.

-- ----------------------------------------------------------------------
-- Tables to Enable Realtime (via Dashboard):
-- ----------------------------------------------------------------------
-- ✅ public.events
-- ✅ public.contacts
-- ✅ public.availability_signals
-- ✅ public.signal_timeline_entries
-- ✅ public.notifications
-- ✅ public.event_invites
-- ✅ public.calendars

-- ----------------------------------------------------------------------
-- Alternative: Enable via SQL (if not using Dashboard)
-- ----------------------------------------------------------------------

-- Create publication for realtime tables
DO $$ 
BEGIN
  -- Check if publication exists, create if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_timeline_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendars;

-- ----------------------------------------------------------------------
-- Realtime Usage in Flutter:
-- ----------------------------------------------------------------------
-- Example for listening to new notifications:
--
-- supabase
--   .from('notifications')
--   .stream(primaryKey: ['id'])
--   .eq('user_id', currentUserId)
--   .listen((data) {
--     // Handle realtime update
--     print('New notification: $data');
--   });
--
-- ----------------------------------------------------------------------

-- Grant necessary permissions for Realtime
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.contacts TO authenticated;
GRANT SELECT ON public.availability_signals TO authenticated;
GRANT SELECT ON public.signal_timeline_entries TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.event_invites TO authenticated;
GRANT SELECT ON public.calendars TO authenticated;

-- Enable replica identity for all realtime tables
-- This is required for DELETE operations in realtime
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;
ALTER TABLE public.availability_signals REPLICA IDENTITY FULL;
ALTER TABLE public.signal_timeline_entries REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.event_invites REPLICA IDENTITY FULL;
ALTER TABLE public.calendars REPLICA IDENTITY FULL;

