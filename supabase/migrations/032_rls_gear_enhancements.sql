-- RLS verification for gear enhancements
-- The existing RLS policies should continue to work with the new fields
-- since they are based on studio_id and membership, not specific columns.
-- This migration verifies the policies are still correct and adds any needed updates.

-- No changes needed to RLS policies - they work at the row level based on studio_id
-- The room_id foreign key is safe because:
-- 1. Rooms table has RLS that ensures users can only see rooms in their current studio
-- 2. The gear RLS policies ensure users can only see/update gear in their current studio
-- 3. When joining with rooms, the RLS on rooms will filter appropriately

-- Verify existing policies are still in place
DO $$
BEGIN
  -- Check if the SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gear' 
    AND policyname = 'Members can view gear in their current studio'
  ) THEN
    RAISE EXCEPTION 'Gear SELECT policy missing';
  END IF;

  -- Check if the INSERT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gear' 
    AND policyname = 'Admins can create gear in their current studio'
  ) THEN
    RAISE EXCEPTION 'Gear INSERT policy missing';
  END IF;

  -- Check if the UPDATE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gear' 
    AND policyname = 'Admins can update gear in their current studio'
  ) THEN
    RAISE EXCEPTION 'Gear UPDATE policy missing';
  END IF;

  -- Check if the DELETE policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gear' 
    AND policyname = 'Admins can delete gear in their current studio'
  ) THEN
    RAISE EXCEPTION 'Gear DELETE policy missing';
  END IF;
END $$;

-- All policies are in place and will work with the new fields
-- No changes needed















