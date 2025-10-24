-- ======================================================================
-- Migration 010: Availability signals model alignment
--  - Make partner_user_id nullable
--  - Add start_time/end_time, message, duration, signal_type
--  - Update RLS to pivot shared visibility via signal_shares
--  - Add helper trigger to backfill start_date/end_date from times
--  - Add missing columns on signal_shares used by app (notify, auto_accept)
-- ======================================================================

-- 1) Relax partner_user_id requirement
ALTER TABLE public.availability_signals
  ALTER COLUMN partner_user_id DROP NOT NULL;

-- 2) Add new time-based columns and basic metadata
ALTER TABLE public.availability_signals
  ADD COLUMN IF NOT EXISTS signal_type TEXT NOT NULL DEFAULT 'available'
    CHECK (signal_type IN ('available','busy','flexible','unavailable')),
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_time   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  ADD COLUMN IF NOT EXISTS duration   TEXT,
  ADD COLUMN IF NOT EXISTS message    TEXT;

-- Ensure valid time range when times are present
ALTER TABLE public.availability_signals
  DROP CONSTRAINT IF EXISTS availability_signals_valid_time_range;
ALTER TABLE public.availability_signals
  ADD CONSTRAINT availability_signals_valid_time_range CHECK (end_time > start_time);

-- 3) Drop uniqueness coupled to partner_user_id (sharing is tracked in signal_shares)
ALTER TABLE public.availability_signals
  DROP CONSTRAINT IF EXISTS availability_signals_owner_id_partner_user_id_key;

-- 4) Indexes for time queries
CREATE INDEX IF NOT EXISTS availability_signals_owner_idx ON public.availability_signals(owner_id);
CREATE INDEX IF NOT EXISTS availability_signals_time_range_idx ON public.availability_signals(start_time, end_time);

-- 5) Backfill helper: keep legacy start_date/end_date in sync for functions that rely on DATEs
CREATE OR REPLACE FUNCTION public.availability_signals_sync_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL THEN
    NEW.start_date := COALESCE(NEW.start_date, NEW.start_time::DATE);
  END IF;
  IF NEW.end_time IS NOT NULL THEN
    NEW.end_date := COALESCE(NEW.end_date, NEW.end_time::DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS availability_signals_sync_dates_trg ON public.availability_signals;
CREATE TRIGGER availability_signals_sync_dates_trg
  BEFORE INSERT OR UPDATE ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.availability_signals_sync_dates();

-- 6) Update RLS: selection for shared visibility should reference signal_shares
DROP POLICY IF EXISTS "Users can view signals shared with them" ON public.availability_signals;
CREATE POLICY "Users can view signals shared with them"
  ON public.availability_signals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.signal_shares sh
      WHERE sh.signal_id = availability_signals.id
        AND sh.shared_with_user_id = auth.uid()
        AND sh.status = 'active'
    )
  );

-- 7) Update timeline entries policy similarly
DROP POLICY IF EXISTS "Users can view shared timeline entries" ON public.signal_timeline_entries;
CREATE POLICY "Users can view shared timeline entries"
  ON public.signal_timeline_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.signal_shares sh
      WHERE sh.signal_id = signal_timeline_entries.signal_id
        AND sh.shared_with_user_id = auth.uid()
        AND sh.status = 'active'
    )
  );

-- 8) Add missing columns used by app to signal_shares
ALTER TABLE public.signal_shares
  ADD COLUMN IF NOT EXISTS notify BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS auto_accept BOOLEAN NOT NULL DEFAULT FALSE;
