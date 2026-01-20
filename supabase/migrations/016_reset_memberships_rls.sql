-- Reset RLS policies on studio_memberships table
-- Drops all existing policies and recreates the correct ones

-- Drop ALL existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.studio_memberships;
DROP POLICY IF EXISTS "user can accept invitation" ON public.studio_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their current studio" ON public.studio_memberships;

-- POLICY 1 — SELECT (Users can see their own memberships OR memberships in their current studio if they're a member)
CREATE POLICY "Users can view their own memberships"
ON public.studio_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    studio_id = current_studio_id()
    AND is_studio_member(current_studio_id())
  )
);

-- POLICY 2 — INSERT (Invited users can accept invitation into a studio)
CREATE POLICY "user can accept invitation"
ON public.studio_memberships
FOR INSERT
TO authenticated
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

-- POLICY 3 — ALL (Admins can manage memberships in their current studio, except owner role)
CREATE POLICY "Admins can manage memberships in their current studio"
ON public.studio_memberships
FOR ALL
TO authenticated
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

