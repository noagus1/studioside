-- RLS Policies for studio_memberships table
-- Users can only access memberships for their current studio

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view memberships in their current studio" ON public.studio_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their current studio" ON public.studio_memberships;
DROP POLICY IF EXISTS "Users can create memberships via invites" ON public.studio_memberships;

-- Policy: Users can view their own memberships
-- This allows users to see all studios they belong to (needed for studio switcher)
-- Also allows viewing memberships in current studio if set
CREATE POLICY "Users can view their own memberships"
  ON public.studio_memberships
  FOR SELECT
  USING (
    -- Users can always see their own memberships (needed for getUserStudios)
    user_id = auth.uid()
    OR (
      -- Or if viewing memberships in current studio and user is a member
      studio_id = public.current_studio_id()
      AND public.is_studio_member(public.current_studio_id())
    )
  );

-- Policy: Admins can update/delete memberships in their current studio (except owner role)
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can manage memberships in their current studio"
  ON public.studio_memberships
  FOR ALL
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
    AND role != 'owner' -- Cannot modify owner memberships
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
    AND role != 'owner'
  );

-- Policy: Users can create memberships when accepting invites (handled by server action)
-- Uses has_valid_invitation() function which bypasses RLS to check for invitations
CREATE POLICY "Users can create memberships via invites"
  ON public.studio_memberships
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_valid_invitation(studio_memberships.studio_id)
  );


