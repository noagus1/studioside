-- Gear table: Studio equipment inventory
-- Each piece of gear belongs to a studio

CREATE TABLE IF NOT EXISTS public.gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  category TEXT,
  serial_number TEXT,
  brand TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gear_studio_id ON public.gear(studio_id);
CREATE INDEX IF NOT EXISTS idx_gear_category ON public.gear(category);

-- Create updated_at trigger
CREATE TRIGGER set_gear_updated_at
  BEFORE UPDATE ON public.gear
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

