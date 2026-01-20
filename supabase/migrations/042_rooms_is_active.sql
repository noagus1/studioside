-- Add is_active field to rooms table
-- Allows rooms to be marked as active or inactive for scheduling purposes

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.rooms.is_active IS 'Whether the room is active and available for scheduling';

-- Set all existing rooms to active by default (already handled by DEFAULT true, but explicit for clarity)
UPDATE public.rooms SET is_active = true WHERE is_active IS NULL;

