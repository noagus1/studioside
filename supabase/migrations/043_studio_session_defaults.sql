-- Add session duration and overtime rate fields to studios table
-- These fields control default timing and pricing for new sessions

ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS default_session_length_hours INTEGER,
  ADD COLUMN IF NOT EXISTS default_overtime_rate DECIMAL(10,2);

-- Add comments for documentation
COMMENT ON COLUMN public.studios.default_session_length_hours IS 'Default session length in hours (e.g., 6, 8, 10, 12). Used to pre-fill new sessions.';
COMMENT ON COLUMN public.studios.default_overtime_rate IS 'Default overtime rate as a flat hourly rate in decimal format. Used to pre-fill new sessions.';

