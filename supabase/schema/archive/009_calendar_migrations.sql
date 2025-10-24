-- ======================================================================
-- Migration 009: calendar_migrations table with RLS
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.calendar_migrations (
  id UUID PRIMARY KEY,
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

CREATE POLICY "Users can select own migrations"
  ON public.calendar_migrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own migrations"
  ON public.calendar_migrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own migrations"
  ON public.calendar_migrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS calendar_migrations_user_idx
  ON public.calendar_migrations(user_id);

CREATE INDEX IF NOT EXISTS calendar_migrations_created_idx
  ON public.calendar_migrations(created_at);
