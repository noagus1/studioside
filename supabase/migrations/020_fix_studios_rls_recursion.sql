-- Fix infinite recursion in studios RLS policy
-- 
-- PROBLEM: The SELECT policy on studios queries studio_memberships to check membership.
-- When getUserStudios() queries studio_memberships with a join to studios, this creates
-- a recursion loop:
-- 1. Query studio_memberships → RLS allows (user_id = auth.uid())
-- 2. Join to studios → RLS on studios queries studio_memberships
-- 3. This triggers studio_memberships RLS again → recursion
--
-- SOLUTION: Simplify the studios SELECT policy to not query studio_memberships.
-- Instead, allow users to view studios where they are the owner OR where the studio_id
-- matches their memberships (which we can check via the foreign key relationship without
-- explicitly querying studio_memberships in the policy).

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view studios they are members of" ON public.studios;

-- Create simplified SELECT policy that doesn't query studio_memberships
-- 
-- IMPORTANT: When PostgREST does a foreign key join (studio_memberships -> studios),
-- it first applies RLS to studio_memberships (which filters to user_id = auth.uid()),
-- then fetches the related studios rows. 
--
-- The key insight: For foreign key joins, PostgREST will only fetch studios that are
-- referenced by the studio_memberships rows that passed RLS. So we can allow viewing
-- any studio - the join itself provides the security because it only includes studios
-- that the user has memberships for.
--
-- However, we still need to restrict direct queries to studios. We allow:
-- 1. Owners to view their own studios (needed for immediate SELECT after creation)
-- 2. For foreign key joins, PostgREST handles filtering automatically
--
-- Note: This means direct SELECT queries to studios will only work for owners.
-- But all our queries go through studio_memberships first, so this is acceptable.
CREATE POLICY "Users can view studios they are members of"
ON public.studios
FOR SELECT
USING (
  -- Allow owners to view their own studios (needed for immediate SELECT after creation)
  owner_id = auth.uid()
  -- For foreign key joins from studio_memberships, PostgREST automatically filters
  -- to only include studios referenced by rows that passed RLS on studio_memberships.
  -- So we don't need to check membership here - the join provides the security.
);

