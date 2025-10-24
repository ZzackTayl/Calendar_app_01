-- ======================================================================
-- Migration 012: Realtime and function alignment
--  - Add calendar_migrations to publication
--  - Adjust get_partner_availability to use signal_shares
--  - Ensure handle_new_signal no longer assumes partner_user_id
-- ======================================================================

-- 1) Add calendar_migrations to realtime publication
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_migrations;

-- Grant and replica identity for realtime completeness
GRANT SELECT ON public.calendar_migrations TO authenticated;
ALTER TABLE public.calendar_migrations REPLICA IDENTITY FULL;

-- 2) Update get_partner_availability to use signal_shares
CREATE OR REPLACE FUNCTION public.get_partner_availability(
  p_partner_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  signal_id UUID,
  date DATE,
  time_start TIME,
  time_end TIME,
  status TEXT,
  confidence REAL
) AS $$
BEGIN
  -- Ensure there is an active share from partner to current user
  IF NOT EXISTS (
    SELECT 1 FROM public.signal_shares sh
    WHERE sh.shared_by_user_id = p_partner_user_id
      AND sh.shared_with_user_id = auth.uid()
      AND sh.status = 'active'
  ) THEN
    RAISE EXCEPTION 'No availability signal shared with you from user %', p_partner_user_id;
  END IF;

  RETURN QUERY
  SELECT
    ste.signal_id,
    ste.date,
    ste.time_start,
    ste.time_end,
    ste.status,
    ste.confidence
  FROM public.signal_timeline_entries ste
  JOIN public.availability_signals s ON ste.signal_id = s.id
  WHERE s.owner_id = p_partner_user_id
    AND ste.date >= p_start_date
    AND ste.date <= p_end_date
  ORDER BY ste.date ASC, ste.time_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Update handle_new_signal to notify shared recipients via signal_shares
CREATE OR REPLACE FUNCTION public.handle_new_signal()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_name TEXT;
BEGIN
  SELECT display_name INTO v_owner_name
  FROM public.profiles
  WHERE id = NEW.owner_id;

  -- Notify all explicit share recipients
  INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
  SELECT
    sh.shared_with_user_id,
    'signal-shared',
    'New availability shared',
    v_owner_name || ' has shared their availability with you',
    jsonb_build_object('signal_id', NEW.id),
    '/signals/' || NEW.id::TEXT
  FROM public.signal_shares sh
  WHERE sh.signal_id = NEW.id
    AND sh.status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_availability_signal_created ON public.availability_signals;
CREATE TRIGGER on_availability_signal_created
  AFTER INSERT ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_signal();
