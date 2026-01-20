-- RLS Policies for studio_invitations table
-- Members can view/create invites for their current studio
-- Anyone can view invites by token (for validation)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view invites for their current studio" ON public.studio_invitations;
DROP POLICY IF EXISTS "Admins can create invites for their current studio" ON public.studio_invitations;
DROP POLICY IF EXISTS "Admins can delete invites for their current studio" ON public.studio_invitations;
DROP POLICY IF EXISTS "Users can update invites when accepting" ON public.studio_invitations;
DROP POLICY IF EXISTS "Users can delete invites when accepting" ON public.studio_invitations;
DROP POLICY IF EXISTS "Users can view invites sent to their email" ON public.studio_invitations;

-- Policy: Admins can view invites for their current studio
CREATE POLICY "Admins can view invites for their current studio"
  ON public.studio_invitations
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND EXISTS (
      SELECT 1
      FROM public.studio_memberships
      WHERE studio_id = public.current_studio_id()
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view invites sent to their email
-- This is needed so the membership INSERT policy can check if an invitation exists
CREATE POLICY "Users can view invites sent to their email"
  ON public.studio_invitations
  FOR SELECT
  USING (
    email = auth.email()
  );

-- Policy: Admins can create invites for their current studio
CREATE POLICY "Admins can create invites for their current studio"
  ON public.studio_invitations
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND invited_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.studio_memberships
      WHERE studio_id = public.current_studio_id()
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins can delete invites for their current studio
CREATE POLICY "Admins can delete invites for their current studio"
  ON public.studio_invitations
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND EXISTS (
      SELECT 1
      FROM public.studio_memberships
      WHERE studio_id = public.current_studio_id()
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Note: Token validation should use the validate_invite_token() function
-- which bypasses RLS for secure validation. This policy is removed
-- to prevent unauthorized access to invite data.

-- Policy: Users can delete invites when accepting (after membership is created)
-- This allows users to delete invitations sent to their email address
CREATE POLICY "Users can delete invites when accepting"
  ON public.studio_invitations
  FOR DELETE
  USING (
    email = auth.email()
  );

