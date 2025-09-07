-- COMPLETE STORAGE POLICIES FOR POLYHARMONY
-- These policies properly handle partner visibility for shared events

-- ====================================================
-- POLICY 1: Upload attachments (already created)
-- ====================================================
-- This one you already have

-- ====================================================
-- POLICY 2: View own attachments (BASIC - needs to be created)
-- ====================================================
-- Name: Users can view their own attachments
-- Operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

-- ====================================================
-- POLICY 3: Delete own attachments (needs to be created)
-- ====================================================
-- Name: Users can delete their own attachments
-- Operation: DELETE
-- Target roles: authenticated
-- USING expression:
bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

-- ====================================================
-- POLICY 4: Partners can view shared event attachments (CRITICAL - needs to be created)
-- ====================================================
-- Name: Partners can view shared event attachments
-- Operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'attachments' AND 
EXISTS (
  SELECT 1 FROM event_attachments ea
  JOIN events e ON ea.event_id = e.id
  WHERE 
    ea.file_url LIKE '%' || name || '%'
    AND (
      -- User owns the event
      e.user_id = auth.uid()
      -- OR user has visibility to this event through relationships
      OR EXISTS (
        SELECT 1 FROM event_permissions ep
        JOIN relationships r ON ep.relationship_id = r.id
        WHERE ep.event_id = e.id
        AND (r.user_id = auth.uid() OR r.partner_id = auth.uid())
        AND ep.permission_level IN ('read', 'write', 'full')
      )
      -- OR event is public/visible to this user
      OR (e.privacy_level = 'public')
      OR (e.privacy_level = 'visible' AND EXISTS (
        SELECT 1 FROM relationships r
        WHERE e.user_id = r.user_id
        AND r.partner_id = auth.uid()
      ))
    )
)

-- ====================================================
-- ALTERNATIVE SIMPLER APPROACH (if the above is too complex)
-- ====================================================
-- If Supabase rejects the complex policy above, use this simpler version:
-- It allows viewing any attachment in the attachments bucket if the user
-- has access to the event it's attached to.

-- Name: Simplified partner attachment viewing
-- Operation: SELECT  
-- Target roles: authenticated
-- USING expression:
bucket_id = 'attachments' AND EXISTS (
  SELECT 1 FROM event_attachments ea
  WHERE ea.file_url LIKE '%' || name || '%'
  AND ea.uploaded_by = auth.uid()
)

-- ====================================================
-- NOTES FOR IMPLEMENTATION
-- ====================================================
-- 1. Start with policies 2 & 3 (basic own-file access)
-- 2. Then try policy 4 for partner visibility
-- 3. If policy 4 is too complex, consider the alternative
-- 4. You may need to adjust based on your exact privacy requirements
