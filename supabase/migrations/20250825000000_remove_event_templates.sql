-- Migration to remove event_templates table and related objects
-- This migration removes the templates feature from the database

-- Drop the event_templates table and all related objects
DROP TABLE IF EXISTS event_templates CASCADE;

-- Remove any related indexes (they should be dropped with CASCADE, but being explicit)
DROP INDEX IF EXISTS idx_event_templates_user;
DROP INDEX IF EXISTS idx_event_templates_relationship;

-- Remove any related triggers (they should be dropped with CASCADE, but being explicit)
DROP TRIGGER IF EXISTS trg_event_templates_updated ON event_templates;

-- Note: The table and all its dependencies will be removed
-- Any existing template data will be permanently deleted
