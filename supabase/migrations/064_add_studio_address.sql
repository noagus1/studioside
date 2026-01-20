-- Add address fields to studios table
-- These fields capture the studio's physical location for invoicing, scheduling, and contact context.

ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

COMMENT ON COLUMN public.studios.street IS 'Street address (line 1) for the studio';
COMMENT ON COLUMN public.studios.city IS 'City for the studio address';
COMMENT ON COLUMN public.studios.state IS 'State/region/province for the studio address';
COMMENT ON COLUMN public.studios.postal_code IS 'Postal/ZIP code for the studio address';
COMMENT ON COLUMN public.studios.country IS 'Country for the studio address (e.g., US, CA, UK)';
