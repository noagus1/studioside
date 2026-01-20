-- Track quantities for gear items
-- Adds a non-negative quantity column with a default of 1

ALTER TABLE public.gear
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0);

COMMENT ON COLUMN public.gear.quantity IS 'Number of identical units available for this gear item.';

