-- Add foreign key constraints to session_gear table
-- This migration runs after sessions and gear tables are created (026 and 027)

-- Add foreign key constraint for session_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_gear_session_id_fkey'
  ) THEN
    ALTER TABLE public.session_gear
      ADD CONSTRAINT session_gear_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for gear_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_gear_gear_id_fkey'
  ) THEN
    ALTER TABLE public.session_gear
      ADD CONSTRAINT session_gear_gear_id_fkey
      FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
  END IF;
END $$;

