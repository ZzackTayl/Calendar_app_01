-- Enhanced RLS Policies Migration
-- This migration strengthens the existing RLS policies with granular controls
-- Apply this through Supabase Dashboard > SQL Editor

-- ===================================================================
-- RELATIONSHIPS TABLE - Enhanced Policies
-- ===================================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS "Users can manage own relationships" ON relationships;

-- Create separate policies for each operation for better security
CREATE POLICY "Users can view own relationships" ON relationships 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own relationships" ON relationships 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationships" ON relationships 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationships" ON relationships 
FOR DELETE USING (auth.uid() = user_id);

-- Additional policy for partners to view shared relationships (if partner_id is set)
CREATE POLICY "Partners can view shared relationships" ON relationships 
FOR SELECT USING (
    auth.uid() = partner_id AND 
    partner_id IS NOT NULL AND 
    is_active = true
);

-- ===================================================================
-- RELATIONSHIP_GROUPS TABLE - Enhanced Policies  
-- ===================================================================

-- Drop existing policy and create granular ones
DROP POLICY IF EXISTS "Users can manage own relationship groups" ON relationship_groups;

CREATE POLICY "Users can view own relationship groups" ON relationship_groups 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own relationship groups" ON relationship_groups 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationship groups" ON relationship_groups 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationship groups" ON relationship_groups 
FOR DELETE USING (auth.uid() = user_id);

-- ===================================================================
-- RELATIONSHIP_GROUP_MEMBERS TABLE - Enhanced Policies
-- ===================================================================

-- Drop existing policy and create more secure ones
DROP POLICY IF EXISTS "Users can access own group memberships" ON relationship_group_members;

CREATE POLICY "Users can view own group memberships" ON relationship_group_members 
FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM relationship_groups WHERE id = group_id
    )
);

CREATE POLICY "Users can add to own groups" ON relationship_group_members 
FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM relationship_groups WHERE id = group_id
    ) AND
    auth.uid() IN (
        SELECT user_id FROM relationships WHERE id = relationship_id
    )
);

CREATE POLICY "Users can update own group memberships" ON relationship_group_members 
FOR UPDATE USING (
    auth.uid() IN (
        SELECT user_id FROM relationship_groups WHERE id = group_id
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM relationship_groups WHERE id = group_id
    )
);

CREATE POLICY "Users can remove from own groups" ON relationship_group_members 
FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id FROM relationship_groups WHERE id = group_id
    )
);

-- ===================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ===================================================================

-- Function to check if user can access a relationship
CREATE OR REPLACE FUNCTION can_access_relationship(relationship_id uuid, requesting_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- User can access if they own the relationship or are the partner
    RETURN EXISTS (
        SELECT 1 FROM relationships 
        WHERE id = relationship_id 
        AND (
            user_id = requesting_user_id OR 
            (partner_id = requesting_user_id AND partner_id IS NOT NULL AND is_active = true)
        )
    );
END;
$$;

-- Function to validate relationship data integrity
CREATE OR REPLACE FUNCTION validate_relationship_data()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Prevent self-relationships
    IF NEW.user_id = NEW.partner_id THEN
        RAISE EXCEPTION 'Cannot create relationship with yourself';
    END IF;
    
    -- Ensure user_id is always the authenticated user for new records
    IF TG_OP = 'INSERT' AND NEW.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot create relationship for another user';
    END IF;
    
    -- Prevent changing user_id on updates
    IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Cannot change relationship owner';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for relationship data validation
DROP TRIGGER IF EXISTS validate_relationship_trigger ON relationships;
CREATE TRIGGER validate_relationship_trigger
    BEFORE INSERT OR UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION validate_relationship_data();

-- ===================================================================
-- AUDIT AND LOGGING (Optional)
-- ===================================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    operation text NOT NULL,
    user_id uuid,
    record_id uuid,
    timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_log;
CREATE POLICY "Users can view own audit logs" ON audit_log 
FOR SELECT USING (auth.uid() = user_id);

-- Function to log relationship access attempts (optional)
CREATE OR REPLACE FUNCTION log_relationship_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log access attempts for audit purposes
    INSERT INTO audit_log (
        table_name,
        operation,
        user_id,
        record_id,
        timestamp
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        auth.uid(),
        COALESCE(NEW.id, OLD.id),
        now()
    );
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the operation if logging fails
        RETURN COALESCE(NEW, OLD);
END;
$$;

-- Audit triggers (commented out by default - uncomment to enable)
-- DROP TRIGGER IF EXISTS audit_relationships_trigger ON relationships;
-- CREATE TRIGGER audit_relationships_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON relationships
--     FOR EACH ROW
--     EXECUTE FUNCTION log_relationship_access();

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Query to verify policies are in place
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('relationships', 'relationship_groups', 'relationship_group_members')
-- ORDER BY tablename, cmd;

-- Query to check RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('relationships', 'relationship_groups', 'relationship_group_members');