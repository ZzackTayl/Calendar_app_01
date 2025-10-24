-- Add is_floating column to events table
-- This column distinguishes between floating events (e.g., daily routines that should 
-- always be at the same local time) and fixed events (absolute time events)

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_floating BOOLEAN DEFAULT FALSE;

-- Update existing events to be fixed by default (backward compatibility)
-- Only run this for events that don't already have a value set (in case the column exists but has null values)
UPDATE public.events 
SET is_floating = FALSE 
WHERE is_floating IS NULL;