-- Fix RLS Policy for Studios SELECT
-- The SELECT policy was too restrictive - it required current_studio_id() to be set
-- But when creating a studio, we need to SELECT it back immediately before setting current_studio_id
-- This migration adds a policy to allow owners to view their own studios

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view studios they are members of" ON public.studios;

-- Create updated SELECT policy that allows:
-- 1. Viewing studios where user is owner (needed for immediate SELECT after INSERT)
-- 2. Viewing studios where user is a member AND it's their current studio (existing behavior)
CREATE POLICY "Users can view studios they are members of"
  ON public.studios
  FOR SELECT
  USING (
    -- Allow owners to view their own studios (needed for immediate SELECT after creation)
    owner_id = auth.uid()
    OR (
      -- Or if viewing studios where user is a member AND it's their current studio
      id = public.current_studio_id()
      AND EXISTS (
        SELECT 1
        FROM public.studio_memberships
        WHERE studio_id = studios.id
          AND user_id = auth.uid()
      )
    )
  );






















