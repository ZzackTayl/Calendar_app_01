-- Calendar Sharing System Schema
-- This replaces the demo data implementation with real database functionality

-- Calendar shares table
CREATE TABLE IF NOT EXISTS calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_name VARCHAR(200) NOT NULL,
  description TEXT,
  share_type VARCHAR(50) NOT NULL DEFAULT 'public', -- public, private, password_protected
  access_token VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- For password-protected shares
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT calendar_shares_name_length CHECK (char_length(share_name) >= 1 AND char_length(share_name) <= 200),
  CONSTRAINT calendar_shares_type_check CHECK (share_type IN ('public', 'private', 'password_protected')),
  
  -- Indexes
  INDEX idx_calendar_shares_user_id (user_id),
  INDEX idx_calendar_shares_access_token (access_token),
  INDEX idx_calendar_shares_type (share_type),
  INDEX idx_calendar_shares_active (is_active),
  INDEX idx_calendar_shares_expires_at (expires_at)
);

-- Share permissions table
CREATE TABLE IF NOT EXISTS share_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES calendar_shares(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL, -- view, edit, manage
  scope VARCHAR(50) NOT NULL DEFAULT 'all', -- all, events, contacts, groups
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT share_permissions_type_check CHECK (permission_type IN ('view', 'edit', 'manage')),
  CONSTRAINT share_permissions_scope_check CHECK (scope IN ('all', 'events', 'contacts', 'groups')),
  
  -- Indexes
  INDEX idx_share_permissions_share_id (share_id),
  INDEX idx_share_permissions_type (permission_type)
);

-- Share filters table (for filtering what's visible in shared calendar)
CREATE TABLE IF NOT EXISTS share_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES calendar_shares(id) ON DELETE CASCADE,
  filter_type VARCHAR(50) NOT NULL, -- event_type, category, date_range, privacy_level
  filter_value TEXT NOT NULL,
  filter_operator VARCHAR(20) DEFAULT 'equals', -- equals, contains, greater_than, less_than, in
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT share_filters_type_check CHECK (filter_type IN ('event_type', 'category', 'date_range', 'privacy_level')),
  CONSTRAINT share_filters_operator_check CHECK (filter_operator IN ('equals', 'contains', 'greater_than', 'less_than', 'in')),
  
  -- Indexes
  INDEX idx_share_filters_share_id (share_id),
  INDEX idx_share_filters_type (filter_type)
);

-- Share access logs
CREATE TABLE IF NOT EXISTS share_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES calendar_shares(id) ON DELETE CASCADE,
  visitor_ip INET,
  user_agent TEXT,
  access_type VARCHAR(50) NOT NULL, -- view, download, api_access
  success BOOLEAN NOT NULL,
  error_message TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_share_access_logs_share_id (share_id),
  INDEX idx_share_access_logs_access_type (access_type),
  INDEX idx_share_access_logs_success (success),
  INDEX idx_share_access_logs_accessed_at (accessed_at)
);

-- Share subscriptions (for real-time updates)
CREATE TABLE IF NOT EXISTS share_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES calendar_shares(id) ON DELETE CASCADE,
  subscriber_email VARCHAR(255) NOT NULL,
  subscription_type VARCHAR(50) NOT NULL DEFAULT 'calendar_updates', -- calendar_updates, event_reminders
  is_active BOOLEAN DEFAULT TRUE,
  last_notification_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT share_subscriptions_email_check CHECK (subscriber_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT share_subscriptions_type_check CHECK (subscription_type IN ('calendar_updates', 'event_reminders')),
  
  -- Indexes
  UNIQUE(share_id, subscriber_email, subscription_type),
  INDEX idx_share_subscriptions_share_id (share_id),
  INDEX idx_share_subscriptions_email (subscriber_email),
  INDEX idx_share_subscriptions_active (is_active)
);

-- Share analytics
CREATE TABLE IF NOT EXISTS share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES calendar_shares(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  api_requests INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(share_id, date),
  INDEX idx_share_analytics_share_id (share_id),
  INDEX idx_share_analytics_date (date)
);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_calendar_shares_updated_at 
  BEFORE UPDATE ON calendar_shares 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate secure access tokens
CREATE OR REPLACE FUNCTION generate_share_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'cal_' || encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to create default permissions for new shares
CREATE OR REPLACE FUNCTION create_default_share_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default view permission for all events
  INSERT INTO share_permissions (share_id, permission_type, scope)
  VALUES (NEW.id, 'view', 'all');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_permissions_on_share_creation
  AFTER INSERT ON calendar_shares
  FOR EACH ROW EXECUTE FUNCTION create_default_share_permissions();

-- Function to log share access
CREATE OR REPLACE FUNCTION log_share_access(
  p_share_id UUID,
  p_visitor_ip INET,
  p_user_agent TEXT,
  p_access_type VARCHAR(50),
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Log the access
  INSERT INTO share_access_logs (
    share_id, visitor_ip, user_agent, access_type, success, error_message
  ) VALUES (
    p_share_id, p_visitor_ip, p_user_agent, p_access_type, p_success, p_error_message
  );
  
  -- Update share statistics
  UPDATE calendar_shares 
  SET 
    view_count = view_count + CASE WHEN p_access_type = 'view' THEN 1 ELSE 0 END,
    last_accessed_at = NOW()
  WHERE id = p_share_id;
  
  -- Update daily analytics
  INSERT INTO share_analytics (share_id, date, views, downloads, api_requests, unique_visitors)
  VALUES (
    p_share_id, 
    CURRENT_DATE,
    CASE WHEN p_access_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_access_type = 'download' THEN 1 ELSE 0 END,
    CASE WHEN p_access_type = 'api_access' THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (share_id, date) DO UPDATE SET
    views = share_analytics.views + CASE WHEN p_access_type = 'view' THEN 1 ELSE 0 END,
    downloads = share_analytics.downloads + CASE WHEN p_access_type = 'download' THEN 1 ELSE 0 END,
    api_requests = share_analytics.api_requests + CASE WHEN p_access_type = 'api_access' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Function to check share access permissions
CREATE OR REPLACE FUNCTION check_share_access(
  p_share_id UUID,
  p_access_token VARCHAR(255),
  p_password VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
  has_access BOOLEAN,
  share_data JSONB,
  error_message TEXT
) AS $$
DECLARE
  v_share RECORD;
  v_has_access BOOLEAN := FALSE;
  v_error_message TEXT;
BEGIN
  -- Get share details
  SELECT * INTO v_share
  FROM calendar_shares
  WHERE id = p_share_id AND access_token = p_access_token AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'Share not found or inactive'::TEXT;
    RETURN;
  END IF;
  
  -- Check if share has expired
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB, 'Share has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check password if required
  IF v_share.share_type = 'password_protected' THEN
    IF p_password IS NULL THEN
      RETURN QUERY SELECT FALSE, NULL::JSONB, 'Password required'::TEXT;
      RETURN;
    END IF;
    
    -- In a real implementation, you'd hash the password and compare
    -- For now, we'll use a simple comparison (NOT SECURE - replace with proper hashing)
    IF p_password != v_share.password_hash THEN
      RETURN QUERY SELECT FALSE, NULL::JSONB, 'Invalid password'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Build share data
  RETURN QUERY SELECT 
    TRUE,
    jsonb_build_object(
      'id', v_share.id,
      'name', v_share.share_name,
      'description', v_share.description,
      'type', v_share.share_type,
      'created_at', v_share.created_at,
      'expires_at', v_share.expires_at
    ),
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_analytics ENABLE ROW LEVEL SECURITY;

-- Calendar shares policies
CREATE POLICY "Users can view their own shares" ON calendar_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shares" ON calendar_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shares" ON calendar_shares
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares" ON calendar_shares
  FOR DELETE USING (auth.uid() = user_id);

-- Share permissions policies
CREATE POLICY "Users can view permissions for their shares" ON share_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_permissions.share_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage permissions for their shares" ON share_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_permissions.share_id AND user_id = auth.uid()
    )
  );

-- Share filters policies
CREATE POLICY "Users can view filters for their shares" ON share_filters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_filters.share_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage filters for their shares" ON share_filters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_filters.share_id AND user_id = auth.uid()
    )
  );

-- Share access logs policies
CREATE POLICY "Users can view access logs for their shares" ON share_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_access_logs.share_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert access logs" ON share_access_logs
  FOR INSERT WITH CHECK (true);

-- Share subscriptions policies
CREATE POLICY "Users can view subscriptions for their shares" ON share_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_subscriptions.share_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage subscriptions for their shares" ON share_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_subscriptions.share_id AND user_id = auth.uid()
    )
  );

-- Share analytics policies
CREATE POLICY "Users can view analytics for their shares" ON share_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_shares 
      WHERE id = share_analytics.share_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics" ON share_analytics
  FOR INSERT WITH CHECK (true);

-- Views for easier querying
CREATE OR REPLACE VIEW share_summary AS
SELECT 
  cs.*,
  COUNT(DISTINCT sal.id) as total_accesses,
  COUNT(DISTINCT ss.id) as total_subscribers,
  COALESCE(SUM(sa.views), 0) as total_views,
  COALESCE(SUM(sa.downloads), 0) as total_downloads
FROM calendar_shares cs
LEFT JOIN share_access_logs sal ON cs.id = sal.share_id
LEFT JOIN share_subscriptions ss ON cs.id = ss.share_id AND ss.is_active = TRUE
LEFT JOIN share_analytics sa ON cs.id = sa.share_id
GROUP BY cs.id;
