-- Privacy Model Migration Rollback Script
-- Use this script to rollback the privacy model changes if needed

-- ===================================================================
-- STEP 1: Drop New Functions
-- ===================================================================

DROP FUNCTION IF EXISTS get_connection_tier(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_event_details(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_event(UUID, UUID);

-- ===================================================================
-- STEP 2: Drop New Views
-- ===================================================================

DROP VIEW IF EXISTS events_with_privacy;

-- ===================================================================
-- STEP 3: Drop New Indexes
-- ===================================================================

DROP INDEX IF EXISTS idx_relationships_connection_tier;
DROP INDEX IF EXISTS idx_group_members_connection_tier;
DROP INDEX IF EXISTS idx_events_privacy_override;

-- ===================================================================
-- STEP 4: Remove New Columns
-- ===================================================================

ALTER TABLE events DROP COLUMN IF EXISTS privacy_override;
ALTER TABLE relationships DROP COLUMN IF EXISTS connection_tier;
ALTER TABLE relationship_group_members DROP COLUMN IF EXISTS connection_tier;

-- ===================================================================
-- STEP 5: Drop New Enum Types
-- ===================================================================

DROP TYPE IF EXISTS event_privacy_override;
DROP TYPE IF EXISTS connection_tier;

-- ===================================================================
-- STEP 6: Log Rollback
-- ===================================================================

INSERT INTO security_audit_log (action_type, success, created_at)
VALUES ('privacy_model_rollback', TRUE, NOW());

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TABLE events IS 'Rollback completed - privacy model migration reverted';
COMMENT ON TABLE relationships IS 'Rollback completed - connection_tier column removed';
