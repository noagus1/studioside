-- Drop deprecated resources column from sessions
-- session_gear is the single source of truth for gear assignments
BEGIN;
  ALTER TABLE public.sessions
    DROP COLUMN IF EXISTS resources;
END;

