-- ESSENTIAL MIGRATION FOR PRODUCTION
-- Copy and paste this SQL into Supabase SQL Editor
-- This is a minimal migration to fix the most critical issues

-- 1. Create privacy level enum
DO $$ 
BEGIN
    CREATE TYPE privacy_level_enum AS ENUM (
        'private',
        'visible', 
        'semi_private',
        'public'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'privacy_level_enum already exists, skipping...';
END $$;

-- 2. Add essential columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS privacy_level privacy_level_enum DEFAULT 'private';

-- 3. Add essential columns to users table  
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS default_privacy_level privacy_level_enum DEFAULT 'private';

-- 4. Create relationships table (essential for the app)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    partner_id UUID,
    partner_email TEXT,
    partner_name TEXT,
    default_privacy_level privacy_level_enum DEFAULT 'private',
    start_date DATE,
    birthday DATE,
    anniversary_date DATE,
    color TEXT DEFAULT '#3B82F6',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS on relationships table
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policy for relationships
DROP POLICY IF EXISTS "Users can manage own relationships" ON relationships;
CREATE POLICY "Users can manage own relationships" ON relationships
    FOR ALL USING (auth.uid()::text = user_id::text);

-- 7. Add foreign key constraints
DO $$ 
BEGIN
    -- Events table
    ALTER TABLE events
        DROP CONSTRAINT IF EXISTS fk_events_user_id;
    ALTER TABLE events
        ADD CONSTRAINT fk_events_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    -- Relationships table  
    ALTER TABLE relationships
        DROP CONSTRAINT IF EXISTS fk_relationships_user_id;
    ALTER TABLE relationships
        ADD CONSTRAINT fk_relationships_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE relationships
        DROP CONSTRAINT IF EXISTS fk_relationships_partner_id;
    ALTER TABLE relationships
        ADD CONSTRAINT fk_relationships_partner_id 
        FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE;
        
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Constraint already exists, skipping...';
END $$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_privacy ON events(privacy_level);
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON relationships(user_id);

-- 9. Update any existing events to have owner_id as user_id (if owner_id exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'events' AND column_name = 'owner_id') THEN
        UPDATE events SET user_id = owner_id WHERE user_id IS NULL;
        RAISE NOTICE 'Updated events.user_id from owner_id where needed';
    END IF;
END $$;

-- 10. Verify the migration
SELECT 
    'Essential migration completed successfully' as status,
    NOW() as completed_at;

-- Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('events', 'users', 'relationships')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;