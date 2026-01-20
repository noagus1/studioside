-- Add engineer_id column to sessions table
-- Engineer references profiles (studio members who can be assigned to sessions)

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS engineer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraint for client_id (was previously just a comment)
ALTER TABLE public.sessions
  ADD CONSTRAINT fk_sessions_client_id 
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for engineer_id (for engineer conflict detection)
CREATE INDEX IF NOT EXISTS idx_sessions_engineer_id ON public.sessions(engineer_id);

-- Create composite index for room conflict detection
-- This index optimizes queries that check for room conflicts by filtering on:
-- - room_id (to find sessions in the same room)
-- - start_time and end_time (to check for time overlaps)
-- - Excludes cancelled sessions from conflict checks
CREATE INDEX IF NOT EXISTS idx_sessions_room_time_conflict 
  ON public.sessions(room_id, start_time, end_time) 
  WHERE status != 'cancelled';

-- Create composite index for engineer conflict detection (optional, for future use)
-- This index optimizes queries that check for engineer conflicts
-- Only includes sessions where engineer_id is not null
CREATE INDEX IF NOT EXISTS idx_sessions_engineer_time_conflict 
  ON public.sessions(engineer_id, start_time, end_time) 
  WHERE engineer_id IS NOT NULL AND status != 'cancelled';
