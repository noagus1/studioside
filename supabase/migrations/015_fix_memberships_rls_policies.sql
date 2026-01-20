-- Fix RLS policies for studio_memberships
-- Addresses issues identified in policy review:
-- 1. SELECT policy too restrictive - blocks getTeamData query
-- 2. INSERT policy incomplete - missing user_id check and expiration checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.studio_memberships;
DROP POLICY IF EXISTS "User can accept invitation" ON public.studio_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their current studio" ON public.studio_memberships;

-- Policy 1: SELECT - Users can view their own memberships OR memberships in current studio
-- This allows:
-- - getUserStudios() to work (user_id = auth.uid())
-- - getTeamData() to work (studio_id = current_studio_id() AND user is a member)
CREATE POLICY "Users can view their own memberships"
  ON public.studio_memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      studio_id = current_studio_id()
      AND is_studio_member(current_studio_id())
    )
  );

-- Policy 2: INSERT - Users can accept invitations
-- This allows invited users to create their own membership when accepting an invitation
-- Key improvements:
-- - Explicitly checks user_id = auth.uid() to prevent inserting for other users
-- - Checks invitation expiration and acceptance status
CREATE POLICY "User can accept invitation"
  ON public.studio_memberships
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM studio_invitations
      WHERE studio_invitations.studio_id = studio_memberships.studio_id
      AND studio_invitations.email = auth.email()
      AND studio_invitations.accepted_at IS NULL
      AND studio_invitations.expires_at > NOW()
    )
  );

-- Policy 3: ALL - Admins can manage memberships in their current studio (except owners)
-- This allows admins to INSERT, UPDATE, DELETE memberships for non-owner roles
-- Note: Requires current_studio_id() to be set via set_current_studio_id() RPC before use
CREATE POLICY "Admins can manage memberships in their current studio"
  ON public.studio_memberships
  FOR ALL
  USING (
    studio_id = current_studio_id()
    AND is_studio_admin(current_studio_id())
    AND role <> 'owner'
  )
  WITH CHECK (
    studio_id = current_studio_id()
    AND is_studio_admin(current_studio_id())
    AND role <> 'owner'
  );

















