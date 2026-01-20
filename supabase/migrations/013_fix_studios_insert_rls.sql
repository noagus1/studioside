-- Fix RLS Policy for Studios INSERT
-- The policy was failing because auth.uid() might not be accessible in RLS context
-- This migration makes the policy more explicit and ensures it works correctly

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create studios" ON public.studios;

-- Create updated policy with explicit checks
-- TO authenticated ensures only authenticated users can use this policy
-- auth.uid() IS NOT NULL ensures the user is authenticated
-- auth.uid() = owner_id ensures users can only create studios they own
CREATE POLICY "Users can create studios"
  ON public.studios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = owner_id
  );






















