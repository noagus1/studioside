-- Fix Studio Invite RLS Policies
-- 
-- This migration fixes the RLS policies for studio_memberships to allow
-- invited users to join studios without requiring current_studio_id().
--
-- Changes:
-- 1. Creates is_valid_invite() helper function to check invitations
-- 2. Simplifies SELECT policy to avoid recursion
-- 3. Updates INSERT policy to support invites without current_studio_id()
-- 4. Separates UPDATE/DELETE policy from INSERT to avoid conflicts

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.studio_memberships;
DROP POLICY IF EXISTS "user can accept invitation" ON public.studio_memberships;
DROP POLICY IF EXISTS "Users can create memberships via invites" ON public.studio_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their current studio" ON public.studio_memberships;

-- Create helper function to check if a user has a valid invitation for a studio
-- This function bypasses RLS (SECURITY DEFINER) to check studio_invitations
-- Checks if invitation email matches user's email from auth.users or profiles
CREATE OR REPLACE FUNCTION public.is_valid_invite(studio_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user's email from auth.users (primary source) or profiles (fallback)
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = user_uuid),
    (SELECT email FROM public.profiles WHERE id = user_uuid)
  ) INTO user_email;
  
  -- If no email found, return false
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if valid invitation exists for this studio and email
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_invitations si
    WHERE si.studio_id = studio_uuid
      AND si.email = user_email
      AND si.accepted_at IS NULL
      AND si.expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICY 1: SELECT - Users can view their own memberships
-- Also allows owners/admins to view all memberships in their current studio
-- This allows:
-- - getUserStudios() to work (queries by user_id = auth.uid())
-- - acceptInvite() to check existing memberships (queries by studio_id AND user_id = auth.uid())
-- - removeStudioMember() to query target memberships (owners/admins can see all members in studio)
-- Note: is_studio_admin() is SECURITY DEFINER so it won't cause recursion
CREATE POLICY "Users can view their own memberships"
ON public.studio_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR (
    studio_id = public.current_studio_id() 
    AND public.is_studio_admin(public.current_studio_id())
  )
);

-- POLICY 2: INSERT - Users can create memberships via invites or admins can add members
-- Allows:
-- - Invited users to insert when is_valid_invite() returns true (doesn't require current_studio_id())
-- - Admins to insert when studio_id = current_studio_id() AND is_studio_admin() returns true
-- Note: is_studio_admin() is SECURITY DEFINER so it won't cause recursion
CREATE POLICY "Users can create memberships via invites or admins can add members"
ON public.studio_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_valid_invite(studio_id, auth.uid())
    OR (
      studio_id = public.current_studio_id()
      AND public.is_studio_admin(public.current_studio_id())
    )
  )
);

-- POLICY 3: UPDATE - Admins can update memberships in their current studio
-- Only allows admins to update memberships (except owner role)
-- Separated from INSERT to avoid conflicts
CREATE POLICY "Admins can update memberships in their current studio"
ON public.studio_memberships
FOR UPDATE
TO authenticated
USING (
  studio_id = public.current_studio_id()
  AND public.is_studio_admin(public.current_studio_id())
  AND role <> 'owner'
)
WITH CHECK (
  studio_id = public.current_studio_id()
  AND public.is_studio_admin(public.current_studio_id())
  AND role <> 'owner'
);

-- POLICY 4: DELETE - Admins can delete memberships in their current studio
-- Only allows admins to delete memberships (except owner role)
CREATE POLICY "Admins can delete memberships in their current studio"
ON public.studio_memberships
FOR DELETE
TO authenticated
USING (
  studio_id = public.current_studio_id()
  AND public.is_studio_admin(public.current_studio_id())
  AND role <> 'owner'
);

