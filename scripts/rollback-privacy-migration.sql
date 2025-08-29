-- =====================================================================
-- PRIVACY LEVEL MIGRATION ROLLBACK PROCEDURES
-- =====================================================================
-- Description: Emergency rollback procedures for privacy level migration
-- Date: 2025-08-28
-- Usage: Run ONLY if privacy level migration needs to be reverted
-- 
-- WARNING: This will revert all privacy level changes and restore 
--          the original values from the backup table
-- =====================================================================

-- =====================================================================
-- ROLLBACK VALIDATION - CHECK IF ROLLBACK IS SAFE
-- =====================================================================

DO $$
DECLARE
    backup_exists BOOLEAN := FALSE;
    migration_completed BOOLEAN := FALSE;
    backup_count INTEGER := 0;
BEGIN
    -- Check if backup table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'privacy_migration_backup'
    ) INTO backup_exists;
    
    -- Check if migration was completed
    SELECT EXISTS (
        SELECT 1 FROM migration_log 
        WHERE migration_name = 'privacy_level_standardization' 
        AND phase = 'completion' 
        AND status = 'success'
    ) INTO migration_completed;
    
    -- Count backup records
    IF backup_exists THEN
        SELECT COUNT(*) INTO backup_count FROM privacy_migration_backup;
    END IF;
    
    -- Log rollback initiation
    INSERT INTO migration_log (migration_name, phase, status, details) 
    VALUES ('privacy_level_standardization', 'rollback_validation', 'info', jsonb_build_object(
        'backup_exists', backup_exists,
        'migration_completed', migration_completed,
        'backup_count', backup_count,
        'initiated_at', NOW()
    ));
    
    -- Validate rollback preconditions
    IF NOT backup_exists THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: Backup table privacy_migration_backup does not exist';
    END IF;
    
    IF NOT migration_completed THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: Migration was not completed successfully';
    END IF;
    
    IF backup_count = 0 THEN
        RAISE WARNING 'ROLLBACK WARNING: Backup table is empty - no data to restore';
    END IF;
    
    RAISE NOTICE 'ROLLBACK VALIDATION: Ready to proceed with rollback';
    RAISE NOTICE '  - Backup table exists: %', backup_exists;
    RAISE NOTICE '  - Migration completed: %', migration_completed;  
    RAISE NOTICE '  - Backup records: %', backup_count;
END $$;

-- =====================================================================
-- PHASE 1: RESTORE DATA FROM BACKUP
-- =====================================================================

-- Restore relationships table data
DO $$
DECLARE
    restored_relationships INTEGER := 0;
BEGIN
    -- Restore original privacy levels for relationships
    WITH backup_data AS (
        SELECT id::uuid, old_value 
        FROM privacy_migration_backup 
        WHERE table_name = 'relationships' 
        AND old_value IS NOT NULL
    )
    UPDATE relationships 
    SET default_privacy_level = backup_data.old_value::text::privacy_level_enum
    FROM backup_data 
    WHERE relationships.id = backup_data.id;
    
    GET DIAGNOSTICS restored_relationships = ROW_COUNT;
    
    INSERT INTO migration_log (migration_name, phase, status, details) 
    VALUES ('privacy_level_standardization', 'rollback_relationships', 'success', 
            jsonb_build_object('restored_records', restored_relationships));
    
    RAISE NOTICE 'ROLLBACK SUCCESS: Restored % relationship records', restored_relationships;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO migration_log (migration_name, phase, status, details) 
        VALUES ('privacy_level_standardization', 'rollback_relationships', 'failed', 
                jsonb_build_object('error', SQLERRM));
        RAISE;
END $$;

-- Restore event_permissions table data
DO $$
DECLARE
    restored_permissions INTEGER := 0;
BEGIN
    -- Restore original permission levels for event_permissions
    WITH backup_data AS (
        SELECT id::uuid, old_value 
        FROM privacy_migration_backup 
        WHERE table_name = 'event_permissions' 
        AND old_value IS NOT NULL
    )
    UPDATE event_permissions 
    SET permission_level = backup_data.old_value::text::privacy_level_enum
    FROM backup_data 
    WHERE event_permissions.id = backup_data.id;
    
    GET DIAGNOSTICS restored_permissions = ROW_COUNT;
    
    INSERT INTO migration_log (migration_name, phase, status, details) 
    VALUES ('privacy_level_standardization', 'rollback_permissions', 'success', 
            jsonb_build_object('restored_records', restored_permissions));
    
    RAISE NOTICE 'ROLLBACK SUCCESS: Restored % event permission records', restored_permissions;
    
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO migration_log (migration_name, phase, status, details) 
        VALUES ('privacy_level_standardization', 'rollback_permissions', 'failed', 
                jsonb_build_object('error', SQLERRM));
        RAISE;
END $$;

-- =====================================================================
-- PHASE 2: REVERT SCHEMA CHANGES (OPTIONAL - HIGH RISK)
-- =====================================================================

-- WARNING: Removing 'public' from enum is dangerous if any records use it
-- Only uncomment if you're absolutely sure no production data uses 'public'

/*
DO $$
BEGIN
    -- Check if any records are using 'public' privacy level
    IF EXISTS (
        SELECT 1 FROM events WHERE privacy_level = 'public'
        UNION ALL
        SELECT 1 FROM relationships WHERE default_privacy_level = 'public'
        UNION ALL  
        SELECT 1 FROM event_permissions WHERE permission_level = 'public'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK BLOCKED: Cannot remove public privacy level - records are using it';
    END IF;
    
    -- If safe, remove 'public' from enum (PostgreSQL doesn't support removing enum values easily)
    -- This would require recreating the enum and all dependent columns
    RAISE NOTICE 'SCHEMA ROLLBACK: Skipping enum revert (requires manual intervention)';
    
    INSERT INTO migration_log (migration_name, phase, status, details) 
    VALUES ('privacy_level_standardization', 'rollback_schema', 'skipped', 
            jsonb_build_object('reason', 'Enum value removal requires manual intervention'));
END $$;
*/

-- =====================================================================
-- PHASE 3: POST-ROLLBACK VALIDATION
-- =====================================================================

DO $$
DECLARE
    validation_results JSONB := '{}';
    legacy_count INTEGER := 0;
    standard_count INTEGER := 0;
BEGIN
    -- Count legacy vs standard privacy levels after rollback
    SELECT COUNT(*) INTO legacy_count
    FROM (
        SELECT default_privacy_level as privacy_level FROM relationships 
        WHERE default_privacy_level IN ('full_access', 'limited_access', 'busy_only', 'hidden')
        UNION ALL
        SELECT permission_level as privacy_level FROM event_permissions 
        WHERE permission_level IN ('full_access', 'limited_access', 'busy_only', 'hidden')
    ) t;
    
    SELECT COUNT(*) INTO standard_count  
    FROM (
        SELECT default_privacy_level as privacy_level FROM relationships 
        WHERE default_privacy_level IN ('private', 'visible', 'semi_private', 'public')
        UNION ALL
        SELECT permission_level as privacy_level FROM event_permissions 
        WHERE permission_level IN ('private', 'visible', 'semi_private', 'public')
    ) t;
    
    validation_results = jsonb_build_object(
        'legacy_privacy_count', legacy_count,
        'standard_privacy_count', standard_count,
        'rollback_successful', (legacy_count > 0),
        'validation_timestamp', NOW()
    );
    
    INSERT INTO migration_log (migration_name, phase, status, details) 
    VALUES ('privacy_level_standardization', 'rollback_validation', 
            CASE WHEN legacy_count > 0 THEN 'success' ELSE 'warning' END, 
            validation_results);
    
    IF legacy_count > 0 THEN
        RAISE NOTICE 'ROLLBACK VALIDATION SUCCESS: % legacy privacy levels restored', legacy_count;
    ELSE
        RAISE WARNING 'ROLLBACK VALIDATION WARNING: No legacy privacy levels found - rollback may have failed';
    END IF;
    
    RAISE NOTICE 'ROLLBACK SUMMARY: % legacy, % standard privacy levels', legacy_count, standard_count;
END $$;

-- =====================================================================
-- PHASE 4: CLEANUP AND COMPLETION
-- =====================================================================

-- Mark rollback as completed
INSERT INTO migration_log (migration_name, phase, status, details) 
VALUES ('privacy_level_standardization', 'rollback_completed', 'success', jsonb_build_object(
    'completed_at', NOW(),
    'summary', 'Privacy level migration rollback completed',
    'next_steps', ARRAY[
        'Verify application functionality with legacy privacy levels',
        'Update API validation to accept legacy values', 
        'Consider alternative migration approach'
    ]
));

-- Create rollback summary view
CREATE OR REPLACE VIEW rollback_summary AS
SELECT 
    migration_name,
    phase,
    status,
    details,
    created_at
FROM migration_log 
WHERE migration_name = 'privacy_level_standardization' 
AND phase LIKE 'rollback%'
ORDER BY created_at DESC;

-- Final rollback completion message
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'PRIVACY LEVEL MIGRATION ROLLBACK COMPLETED';
    RAISE NOTICE '===================================================================='; 
    RAISE NOTICE 'Data has been restored from backup table: privacy_migration_backup';
    RAISE NOTICE 'Legacy privacy levels are now active again';
    RAISE NOTICE 'Rollback details available in: rollback_summary view';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'IMPORTANT: Application may need updates to handle legacy privacy levels';
    RAISE NOTICE 'IMPORTANT: Consider investigating why migration needed to be rolled back';
    RAISE NOTICE '====================================================================';
END $$;

-- Return rollback summary
SELECT 
    'Privacy Level Migration Rollback Completed' as status,
    NOW() as completed_at,
    'Data restored from backup, legacy privacy levels active' as description,
    'Check application compatibility with legacy privacy levels' as next_steps;