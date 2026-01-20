-- Gear enhancements: Add status, room assignment, notes, maintenance dates, and photo support
-- This migration adds professional equipment management features to the gear table

-- Create gear_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gear_status') THEN
    CREATE TYPE public.gear_status AS ENUM ('available', 'in_use', 'maintenance', 'missing');
  END IF;
END $$;

-- Add new columns to gear table
ALTER TABLE public.gear
  ADD COLUMN IF NOT EXISTS status public.gear_status NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS next_service_date DATE,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update existing gear records to have status = 'available' (already default, but explicit)
UPDATE public.gear SET status = 'available' WHERE status IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gear_status ON public.gear(status);
CREATE INDEX IF NOT EXISTS idx_gear_room_id ON public.gear(room_id);

-- Add comment to status column
COMMENT ON COLUMN public.gear.status IS 'Current status of the gear: available, in_use, maintenance, or missing';
COMMENT ON COLUMN public.gear.room_id IS 'Optional room assignment for the gear';
COMMENT ON COLUMN public.gear.notes IS 'Free-form notes about the gear';
COMMENT ON COLUMN public.gear.last_service_date IS 'Date of last maintenance/service';
COMMENT ON COLUMN public.gear.next_service_date IS 'Date of next scheduled maintenance/service';
COMMENT ON COLUMN public.gear.photo_url IS 'URL to photo/image of the gear';















