-- Add room pricing fields: use_studio_pricing, billing_style, rate, and overtime_rate
-- These fields allow rooms to either use studio pricing or have custom pricing

-- Add use_studio_pricing column (default true for existing rooms)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS use_studio_pricing BOOLEAN DEFAULT true NOT NULL;

-- Add billing_style column to rooms table (nullable, only used when use_studio_pricing = false)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS billing_style public.billing_style;

-- Add rate column to rooms table (nullable, only used when use_studio_pricing = false)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2);

-- Add overtime_rate column to rooms table (nullable, only used when use_studio_pricing = false)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.rooms.use_studio_pricing IS 'Whether this room uses studio pricing (true) or custom pricing (false). When true, billing_style, rate, and overtime_rate are ignored.';
COMMENT ON COLUMN public.rooms.billing_style IS 'Custom billing style for this room: hourly or flat_session. Only used when use_studio_pricing = false.';
COMMENT ON COLUMN public.rooms.rate IS 'Custom base rate for this room in decimal format. Only used when use_studio_pricing = false.';
COMMENT ON COLUMN public.rooms.overtime_rate IS 'Custom overtime rate for this room in decimal format. Only used when use_studio_pricing = false.';

