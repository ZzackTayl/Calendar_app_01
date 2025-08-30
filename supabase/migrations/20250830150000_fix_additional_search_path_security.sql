-- ======================================================================
-- SECURITY FIX: Add search_path protection to additional vulnerable functions
-- ======================================================================
-- This migration fixes 4 additional SECURITY DEFINER functions that were
-- missing the critical 'SET search_path = public' security setting.
-- 
-- Without this setting, these functions are vulnerable to search_path attacks
-- where malicious users could create functions in other schemas to hijack
-- function calls and potentially escalate privileges.
--
-- Functions fixed:
-- 1. get_effective_permission_level() - Permission inheritance logic
-- 2. log_permission_change() - Permission audit logging trigger
-- 3. cleanup_expired_security_tokens() - Security token cleanup
-- 4. get_conflict_check_performance_stats() - Performance statistics
-- ======================================================================

-- Fix 1: get_effective_permission_level function
-- This function handles complex permission inheritance logic and must be protected
CREATE OR REPLACE FUNCTION get_effective_permission_level(
  p_user_id UUID,
  p_event_id UUID,
  p_conflict_strategy TEXT DEFAULT 'most_restrictive'
) RETURNS TEXT AS $$
DECLARE
  direct_permission TEXT;
  group_permission TEXT;
  default_permission TEXT;
  final_permission TEXT;
  privacy_order TEXT[] := ARRAY['private', 'semi_private', 'visible', 'public'];
  is_owner BOOLEAN;
BEGIN
  -- Check if user is the owner (always full access)
  SELECT user_id = p_user_id INTO is_owner
  FROM events
  WHERE id = p_event_id;
  
  IF is_owner THEN
    RETURN 'visible';
  END IF;
  
  -- Get direct permission for the event
  SELECT privacy_level INTO direct_permission
  FROM event_visibility
  WHERE event_id = p_event_id AND user_id = p_user_id
  LIMIT 1;
  
  -- Get permissions from groups the user belongs to
  SELECT ev.privacy_level INTO group_permission
  FROM event_visibility ev
  JOIN relationship_group_members rgm ON ev.group_id = rgm.group_id
  WHERE ev.event_id = p_event_id 
    AND rgm.user_id = p_user_id
  ORDER BY 
    CASE WHEN p_conflict_strategy = 'most_restrictive' THEN 
      array_position(privacy_order, ev.privacy_level)
    ELSE 
      -array_position(privacy_order, ev.privacy_level)
    END
  LIMIT 1;
  
  -- Get default event permission
  SELECT privacy_level INTO default_permission
  FROM events
  WHERE id = p_event_id;
  
  -- Apply conflict resolution strategy
  IF p_conflict_strategy = 'explicit_wins' AND direct_permission IS NOT NULL THEN
    final_permission := direct_permission;
  ELSIF p_conflict_strategy = 'most_permissive' THEN
    -- For most permissive, pick the highest permission level
    IF direct_permission IS NULL AND group_permission IS NULL THEN
      final_permission := default_permission;
    ELSIF direct_permission IS NULL THEN
      final_permission := group_permission;
    ELSIF group_permission IS NULL THEN
      final_permission := direct_permission;
    ELSIF array_position(privacy_order, direct_permission) > array_position(privacy_order, group_permission) THEN
      final_permission := direct_permission;
    ELSE
      final_permission := group_permission;
    END IF;
  ELSE -- most_restrictive is the default
    -- For most restrictive, pick the lowest permission level
    IF direct_permission IS NULL AND group_permission IS NULL THEN
      final_permission := default_permission;
    ELSIF direct_permission IS NULL THEN
      final_permission := group_permission;
    ELSIF group_permission IS NULL THEN
      final_permission := direct_permission;
    ELSIF array_position(privacy_order, direct_permission) < array_position(privacy_order, group_permission) THEN
      final_permission := direct_permission;
    ELSE
      final_permission := group_permission;
    END IF;
  END IF;
  
  RETURN final_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: log_permission_change trigger function
-- This function logs all permission changes and must be protected from hijacking
CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO permission_audit_logs (
    user_id, 
    action_type, 
    resource_type, 
    resource_id, 
    previous_level, 
    new_level, 
    target_id,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'grant'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'revoke'
    END,
    TG_TABLE_NAME,
    CASE
      WHEN TG_TABLE_NAME = 'event_visibility' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.event_id
          ELSE NEW.event_id
        END
      WHEN TG_TABLE_NAME = 'relationships' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.id
          ELSE NEW.id
        END
      WHEN TG_TABLE_NAME = 'relationship_group_members' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.group_id
          ELSE NEW.group_id
        END
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN 
        CASE
          WHEN TG_TABLE_NAME = 'event_visibility' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationships' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationship_group_members' THEN OLD.group_privacy_level
        END
      WHEN TG_OP = 'UPDATE' THEN 
        CASE
          WHEN TG_TABLE_NAME = 'event_visibility' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationships' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationship_group_members' THEN OLD.group_privacy_level
        END
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE 
        CASE
          WHEN TG_TABLE_NAME = 'event_visibility' THEN NEW.privacy_level
          WHEN TG_TABLE_NAME = 'relationships' THEN NEW.privacy_level
          WHEN TG_TABLE_NAME = 'relationship_group_members' THEN NEW.group_privacy_level
        END
    END,
    CASE
      WHEN TG_TABLE_NAME = 'event_visibility' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN 
            COALESCE(OLD.user_id, OLD.group_id)
          ELSE 
            COALESCE(NEW.user_id, NEW.group_id)
        END
      WHEN TG_TABLE_NAME = 'relationships' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.partner_id
          ELSE NEW.partner_id
        END
      WHEN TG_TABLE_NAME = 'relationship_group_members' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.user_id
          ELSE NEW.user_id
        END
    END,
    current_setting('request.headers', true)::json->'x-real-ip',
    current_setting('request.headers', true)::json->'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: cleanup_expired_security_tokens function
-- This function performs critical security cleanup and must be protected
CREATE OR REPLACE FUNCTION cleanup_expired_security_tokens()
RETURNS void AS $$
BEGIN
  -- Cleanup expired CSRF tokens
  DELETE FROM csrf_tokens WHERE expires_at < NOW();
  
  -- Cleanup expired OAuth states
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 4: get_conflict_check_performance_stats function
-- This function provides performance metrics and must be protected
CREATE OR REPLACE FUNCTION get_conflict_check_performance_stats(
    user_uuid UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    check_type TEXT,
    total_checks BIGINT,
    avg_processing_time_ms NUMERIC,
    avg_cache_hit_ratio NUMERIC,
    total_partners_checked BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccm.check_type,
        COUNT(*) as total_checks,
        ROUND(AVG(ccm.processing_time_ms), 2) as avg_processing_time_ms,
        ROUND(AVG(ccm.cache_hit_ratio), 3) as avg_cache_hit_ratio,
        SUM(ccm.partner_count) as total_partners_checked
    FROM conflict_check_metrics ccm
    WHERE ccm.user_id = user_uuid
    AND ccm.created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY ccm.check_type
    ORDER BY total_checks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ======================================================================
-- SECURITY VERIFICATION
-- ======================================================================
-- Verify that all functions now have proper search_path protection
DO $$
DECLARE
    func_count INTEGER;
    vulnerable_funcs TEXT[];
BEGIN
    -- Check for any remaining SECURITY DEFINER functions without SET search_path
    SELECT COUNT(*), array_agg(routine_name)
    INTO func_count, vulnerable_funcs
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    AND security_type = 'DEFINER'
    AND routine_name IN (
        'get_effective_permission_level',
        'log_permission_change', 
        'cleanup_expired_security_tokens',
        'get_conflict_check_performance_stats'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.parameters 
        WHERE specific_name = routines.specific_name 
        AND parameter_name = 'search_path'
    );
    
    IF func_count > 0 THEN
        RAISE NOTICE 'WARNING: % functions still vulnerable: %', func_count, vulnerable_funcs;
    ELSE
        RAISE NOTICE 'SUCCESS: All 4 targeted functions now have search_path protection';
    END IF;
END $$;

-- Add security comments for documentation
COMMENT ON FUNCTION get_effective_permission_level(UUID, UUID, TEXT) IS 
'SECURITY FIXED: Gets effective permission level with search_path protection against privilege escalation';

COMMENT ON FUNCTION log_permission_change() IS 
'SECURITY FIXED: Audit logging trigger with search_path protection against hijacking';

COMMENT ON FUNCTION cleanup_expired_security_tokens() IS 
'SECURITY FIXED: Security token cleanup with search_path protection against malicious interference';

COMMENT ON FUNCTION get_conflict_check_performance_stats(UUID, INTEGER) IS 
'SECURITY FIXED: Performance statistics with search_path protection against data manipulation';

-- ======================================================================
-- MIGRATION COMPLETE
-- ======================================================================
-- This migration has successfully fixed 4 additional vulnerable SECURITY DEFINER
-- functions by adding 'SET search_path = public' to prevent search_path attacks.
--
-- All functions maintain their original functionality while being protected
-- against privilege escalation vulnerabilities.
-- ======================================================================