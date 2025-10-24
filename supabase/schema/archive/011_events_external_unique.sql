-- ======================================================================
-- Migration 011: Unique external event identity per owner
-- Prevent duplicate imports across providers
-- ======================================================================

-- Normalize NULLs to avoid NULL != NULL pitfalls when creating unique indexes
CREATE OR REPLACE FUNCTION public.null_to_empty_text(text)
RETURNS text AS $$
  SELECT COALESCE($1, '');
$$ LANGUAGE SQL IMMUTABLE;

-- Create a unique index considering owner + provider + external id
DROP INDEX IF EXISTS events_owner_provider_external_unique;
CREATE UNIQUE INDEX events_owner_provider_external_unique
  ON public.events(
    owner_id,
    public.null_to_empty_text(external_provider),
    public.null_to_empty_text(external_event_id)
  )
  WHERE external_provider IS NOT NULL AND external_event_id IS NOT NULL;
