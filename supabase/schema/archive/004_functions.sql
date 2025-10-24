-- ======================================================================
-- MyOrbit Supabase Schema: Database Functions
-- Migration 004
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. set_updated_at() - Trigger function
-- ----------------------------------------------------------------------
-- Automatically updates 'updated_at' on row updates

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------
-- 2. get_user_events() - Fetch events in a date range
-- ----------------------------------------------------------------------
-- Optimized query for fetching user events with optional filtering

CREATE OR REPLACE FUNCTION public.get_user_events(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_calendar_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  owner_id UUID,
  calendar_id TEXT,
  title TEXT,
  description TEXT,
  start TIMESTAMPTZ,
  "end" TIMESTAMPTZ,
  privacy_level TEXT,
  invited_partner_ids UUID[],
  external_provider TEXT,
  external_event_id TEXT,
  event_category_id TEXT,
  recurrence_rule_id UUID,
  parent_event_id UUID,
  is_exception BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.owner_id,
    e.calendar_id,
    e.title,
    e.description,
    e.start,
    e."end",
    e.privacy_level,
    e.invited_partner_ids,
    e.external_provider,
    e.external_event_id,
    e.event_category_id,
    e.recurrence_rule_id,
    e.parent_event_id,
    e.is_exception,
    e.created_at,
    e.updated_at
  FROM public.events e
  WHERE e.owner_id = p_user_id
    AND e.start >= p_start_date
    AND e.start <= p_end_date
    AND (p_calendar_ids IS NULL OR e.calendar_id = ANY(p_calendar_ids))
  ORDER BY e.start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 3. compute_availability() - Calculate free/busy from events
-- ----------------------------------------------------------------------
-- Core business logic for availability signals

CREATE OR REPLACE FUNCTION public.compute_availability(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_excluded_dates DATE[] DEFAULT '{}'
)
RETURNS TABLE(
  date DATE,
  time_start TIME,
  time_end TIME,
  status TEXT,
  confidence REAL
) AS $$
BEGIN
  -- This is a placeholder implementation
  -- Real implementation would:
  -- 1. Fetch events for user in date range
  -- 2. Compute inverse (free times) from busy times
  -- 3. Apply business hours, preferred times, etc.
  -- 4. Return computed slots
  
  RETURN QUERY
  SELECT
    generate_series::DATE AS date,
    '09:00'::TIME AS time_start,
    '17:00'::TIME AS time_end,
    'free'::TEXT AS status,
    1.0::REAL AS confidence
  FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL)
  WHERE generate_series::DATE != ALL(p_excluded_dates);
  
  -- TODO: Implement actual availability computation logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 4. sync_signal_timeline() - Regenerate timeline entries for signal
-- ----------------------------------------------------------------------
-- Called when events change or signal is updated

CREATE OR REPLACE FUNCTION public.sync_signal_timeline(
  p_signal_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_signal RECORD;
BEGIN
  -- Get signal details
  SELECT * INTO v_signal
  FROM public.availability_signals
  WHERE id = p_signal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signal % not found', p_signal_id;
  END IF;
  
  -- Delete existing timeline entries for this signal
  DELETE FROM public.signal_timeline_entries
  WHERE signal_id = p_signal_id;
  
  -- Regenerate timeline entries using compute_availability()
  INSERT INTO public.signal_timeline_entries (
    signal_id,
    owner_id,
    date,
    time_start,
    time_end,
    status,
    confidence
  )
  SELECT
    p_signal_id,
    v_signal.owner_id,
    ca.date,
    ca.time_start,
    ca.time_end,
    ca.status,
    ca.confidence
  FROM public.compute_availability(
    v_signal.owner_id,
    v_signal.start_date,
    v_signal.end_date,
    v_signal.excluded_dates
  ) AS ca;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 5. get_partner_availability() - Fetch partner's shared availability
-- ----------------------------------------------------------------------
-- Used by UI to display partner availability in overlays

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
  -- Check if partner has shared availability with current user
  IF NOT EXISTS (
    SELECT 1 FROM public.availability_signals
    WHERE owner_id = p_partner_user_id
      AND partner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No availability signal shared with you from user %', p_partner_user_id;
  END IF;
  
  -- Return timeline entries
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
    AND s.partner_user_id = auth.uid()
    AND ste.date >= p_start_date
    AND ste.date <= p_end_date
  ORDER BY ste.date ASC, ste.time_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 6. expire_old_signals() - Maintenance function
-- ----------------------------------------------------------------------
-- Should be called periodically (e.g., via cron) to clean up

CREATE OR REPLACE FUNCTION public.expire_old_signals()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Delete signals older than 90 days
  DELETE FROM public.availability_signals
  WHERE end_date < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Update signal_shares status to 'expired'
  UPDATE public.signal_shares
  SET status = 'expired'
  WHERE expires_at < NOW()
    AND status = 'active';
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 7. create_notification() - Helper for creating notifications
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_is_dismissed BOOLEAN DEFAULT FALSE,
  p_show_in_center BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    action_url,
    is_dismissed,
    show_in_center
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_data,
    p_action_url,
    p_is_dismissed,
    p_show_in_center
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 8. handle_new_signal() - Trigger for new availability signals
-- ----------------------------------------------------------------------
-- Auto-creates notification for partner when signal is shared

CREATE OR REPLACE FUNCTION public.handle_new_signal()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_name TEXT;
BEGIN
  -- Get owner's display name
  SELECT display_name INTO v_owner_name
  FROM public.profiles
  WHERE id = NEW.owner_id;
  
  -- Create notification for partner
  PERFORM public.create_notification(
    NEW.partner_user_id,
    'signal-shared',
    'New availability shared',
    v_owner_name || ' has shared their availability with you',
    jsonb_build_object('signal_id', NEW.id),
    '/signals/' || NEW.id::TEXT
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to availability_signals
CREATE TRIGGER on_availability_signal_created
  AFTER INSERT ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_signal();
