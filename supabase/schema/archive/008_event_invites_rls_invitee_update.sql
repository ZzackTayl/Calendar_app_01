-- ======================================================================
-- Migration 008: Allow invitees to update their own event_invites
-- ======================================================================

-- Ensure RLS is enabled (already in 002, but safe)
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Invitee (as a contact with external_user_id = auth.uid()) can UPDATE their invite
DROP POLICY IF EXISTS "Invitees can update their own invites" ON public.event_invites;
CREATE POLICY "Invitees can update their own invites"
  ON public.event_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = event_invites.contact_id
        AND c.external_user_id = auth.uid()
    )
  );

-- Optional: Allow invitee to SELECT their invite (complements organizer policy)
DROP POLICY IF EXISTS "Invitees can select their own invites" ON public.event_invites;
CREATE POLICY "Invitees can select their own invites"
  ON public.event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = event_invites.contact_id
        AND c.external_user_id = auth.uid()
    )
  );

-- Helpful index for contact lookups
CREATE INDEX IF NOT EXISTS event_invites_contact_idx
  ON public.event_invites(contact_id);
