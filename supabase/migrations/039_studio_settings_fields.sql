-- Add studio settings fields: timezone, default_buffer_minutes, and overtime_rules
-- These fields control how the studio operates by default

ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS default_buffer_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rules TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.studios.timezone IS 'IANA timezone string (e.g., "America/New_York") for the studio';
COMMENT ON COLUMN public.studios.default_buffer_minutes IS 'Default buffer time in minutes between sessions (0-60)';
COMMENT ON COLUMN public.studios.overtime_rules IS 'JSON string or text describing overtime rules and policies';
