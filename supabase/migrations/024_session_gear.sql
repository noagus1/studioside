-- Session gear junction table: Links sessions to gear
-- Creates a many-to-many relationship between sessions and gear
-- One session can use multiple pieces of gear, one piece of gear can be used in multiple sessions

CREATE TABLE IF NOT EXISTS public.session_gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  gear_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, gear_id)
);

-- Add foreign key constraints
-- Note: Foreign keys will be added in migration 030 after sessions and gear tables are created

-- Enable RLS
ALTER TABLE public.session_gear ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_gear_session_id ON public.session_gear(session_id);
CREATE INDEX IF NOT EXISTS idx_session_gear_gear_id ON public.session_gear(gear_id);
CREATE INDEX IF NOT EXISTS idx_session_gear_session_gear ON public.session_gear(session_id, gear_id);

-- Create updated_at trigger
CREATE TRIGGER set_session_gear_updated_at
  BEFORE UPDATE ON public.session_gear
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to check for overlapping sessions when assigning gear
-- Prevents gear from being assigned to multiple sessions that overlap in time
-- 
-- This function checks for time overlaps by detecting which time columns exist
-- in the sessions table. It supports common field names:
--   - start_time/end_time
--   - start_date/end_date  
--   - scheduled_start/scheduled_end
--
-- Two sessions overlap if: (new_start < existing_end) AND (new_end > existing_start)
CREATE OR REPLACE FUNCTION public.check_gear_session_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_session_start TIMESTAMPTZ;
  new_session_end TIMESTAMPTZ;
  overlapping_count INTEGER;
  start_col TEXT;
  end_col TEXT;
BEGIN
  -- Only proceed if sessions table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sessions'
  ) THEN
    RETURN NEW;
  END IF;

  -- Detect which time columns exist in the sessions table
  -- Priority: start_time > start_date > scheduled_start
  SELECT column_name INTO start_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'sessions'
    AND column_name IN ('start_time', 'start_date', 'scheduled_start')
  ORDER BY CASE column_name
    WHEN 'start_time' THEN 1
    WHEN 'start_date' THEN 2
    WHEN 'scheduled_start' THEN 3
  END
  LIMIT 1;

  -- Priority: end_time > end_date > scheduled_end
  SELECT column_name INTO end_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'sessions'
    AND column_name IN ('end_time', 'end_date', 'scheduled_end')
  ORDER BY CASE column_name
    WHEN 'end_time' THEN 1
    WHEN 'end_date' THEN 2
    WHEN 'scheduled_end' THEN 3
  END
  LIMIT 1;

  -- If we couldn't find time fields, skip the check
  -- (sessions table might not have them yet or uses different names)
  IF start_col IS NULL OR end_col IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the new session's start and end times
  EXECUTE format('SELECT %I::TIMESTAMPTZ, %I::TIMESTAMPTZ FROM public.sessions WHERE id = $1', start_col, end_col)
    INTO new_session_start, new_session_end
    USING NEW.session_id;

  -- If we couldn't get the session times, skip the check
  IF new_session_start IS NULL OR new_session_end IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate that start < end
  IF new_session_start >= new_session_end THEN
    RAISE EXCEPTION 'Session start time must be before end time';
  END IF;

  -- Check for overlapping sessions with the same gear
  -- Two sessions overlap if: (new_start < existing_end) AND (new_end > existing_start)
  EXECUTE format('
    SELECT COUNT(*)
    FROM public.session_gear sg
    INNER JOIN public.sessions s ON s.id = sg.session_id
    WHERE sg.gear_id = $1
      AND sg.session_id != $2
      AND s.%I::TIMESTAMPTZ < $4
      AND s.%I::TIMESTAMPTZ > $3
  ', start_col, end_col)
    INTO overlapping_count
    USING NEW.gear_id, NEW.session_id, new_session_start, new_session_end;

  -- If there are overlapping sessions, raise an error
  IF overlapping_count > 0 THEN
    RAISE EXCEPTION 'Gear cannot be assigned to overlapping sessions. This gear is already assigned to % overlapping session(s).', overlapping_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for overlaps before insert or update
CREATE TRIGGER check_gear_session_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.session_gear
  FOR EACH ROW
  EXECUTE FUNCTION public.check_gear_session_overlap();

