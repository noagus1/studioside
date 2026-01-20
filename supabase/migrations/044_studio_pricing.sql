-- Add studio pricing fields: billing_style and base_rate
-- These fields control the default pricing for rooms that use studio pricing

-- Create billing_style enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.billing_style AS ENUM ('hourly', 'flat_session');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add billing_style column to studios table
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS billing_style public.billing_style;

-- Add base_rate column to studios table
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.studios.billing_style IS 'Default billing style for rooms: hourly or flat_session. Used when rooms have use_studio_pricing = true.';
COMMENT ON COLUMN public.studios.base_rate IS 'Default base rate in decimal format. For hourly billing, this is the rate per hour. For flat_session billing, this is the rate per session. Used when rooms have use_studio_pricing = true.';

