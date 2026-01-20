-- Add optional notes to sessions for lightweight creation metadata
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS notes TEXT;
