-- ======================================================================
-- PRE-MIGRATION BACKUP SCRIPT
-- ======================================================================
-- Purpose: Create backup tables for all existing data before migration
-- Run this FIRST before applying any migrations

-- Create backup tables for existing data
DO $$
DECLARE
    table_name text;
    backup_sql text;
BEGIN
    -- List of existing tables to backup
    FOR table_name IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE 'backup_%'
    LOOP
        backup_sql := format('CREATE TABLE backup_%s_20250907 AS SELECT * FROM %I', 
                           table_name, table_name);
        
        BEGIN
            EXECUTE backup_sql;
            RAISE NOTICE 'Created backup: backup_%_20250907', table_name;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Failed to backup %: %', table_name, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Verify backups were created
SELECT 
    'BACKUP_VERIFICATION' as status,
    table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'backup_' || t.table_name || '_20250907') as backup_exists
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'backup_%'
ORDER BY table_name;

-- Show backup table sizes
SELECT 
    'BACKUP_SIZE' as status,
    schemaname,
    tablename as table_name,
    n_tup_ins as row_count
FROM pg_stat_user_tables 
WHERE tablename LIKE 'backup_%_20250907'
ORDER BY tablename;
