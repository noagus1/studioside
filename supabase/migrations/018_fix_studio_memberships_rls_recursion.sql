-- Fix infinite recursion in studio_memberships RLS policies
-- 
-- PROBLEM: The SELECT policy uses is_studio_member() which queries studio_memberships,
-- causing infinite recursion when the policy is evaluated.
--
-- SOLUTION: Remove is_studio_member() from the SELECT policy. The condition
-- user_id = auth.uid() is sufficient for all use cases:
-- - getUserStudios() filters by user_id = auth.uid() ✅
-- - getTeamData() filters by studio_id AND user_id = auth.uid() ✅
--
-- For the admin policy, we remove it entirely and handle admin checks in application code
-- to avoid recursion (is_studio_admin() queries studio_memberships, causing recursion).

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.studio_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships in their current studio" ON public.studio_memberships;

-- POLICY 1 — SELECT (Simplified to avoid recursion)
-- Removed is_studio_member() call which was causing infinite recursion
-- The user_id = auth.uid() condition is sufficient for all use cases
CREATE POLICY "Users can view their own memberships"
ON public.studio_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Note: The INSERT policy "user can accept invitation" doesn't use is_studio_member()
-- so it doesn't need to be changed. It only checks studio_invitations table.

-- POLICY 3 — ALL (Admins can manage memberships in their current studio, except owner role)
-- 
-- IMPORTANT: We cannot use is_studio_admin() or any EXISTS query on studio_memberships
-- in this policy because it will cause infinite recursion.
--
-- Solution: Temporarily remove this policy. Admin operations should be verified
-- in application code before performing the operation. The application can check
-- if the user is an admin using a separate query (which will work because it's
-- not evaluating RLS on the same table in a recursive way).
--
-- Alternatively, we could create a view or use a different approach, but for now
-- the safest fix is to remove this policy and handle admin checks in application code.
--
-- NOTE: This means admin operations (remove member, etc.) will need to be verified
-- in the application layer before calling the database operation.

-- Policy removed to prevent recursion
-- Admin checks should be done in application code (e.g., in removeStudioMember.ts)
-- before performing the operation

