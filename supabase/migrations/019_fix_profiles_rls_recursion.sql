-- Fix infinite recursion in profiles RLS policy
-- 
-- PROBLEM: The "Users can view profiles in their current studio" policy queries
-- studio_memberships, which triggers RLS on that table. The studio_memberships RLS
-- policy calls is_studio_member(), which queries studio_memberships again, causing
-- infinite recursion and 42P17 errors.
--
-- SOLUTION: Remove the policy that queries studio_memberships. Profile visibility
-- for studio members can be handled in application code by:
-- 1. Querying studio_memberships to get user IDs in current studio
-- 2. Querying profiles with .in('id', userIds) filter

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in their current studio" ON public.profiles;

-- Keep these policies (they don't query studio_memberships):
-- - "Users can view their own profile" (auth.uid() = id)
-- - "Users can update their own profile" (auth.uid() = id)

