-- Add created_by column to gear table
-- Tracks which user created each piece of gear

ALTER TABLE public.gear
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gear_created_by ON public.gear(created_by);

-- Add comment
COMMENT ON COLUMN public.gear.created_by IS 'User ID of the person who created this gear item';














