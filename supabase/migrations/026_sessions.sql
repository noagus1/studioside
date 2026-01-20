-- Sessions table: Studio recording/booked sessions
-- Each session belongs to a studio and optionally a room

CREATE TYPE public.session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  client_id UUID, -- Future foreign key to clients table
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status session_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_studio_id ON public.sessions(studio_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON public.sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON public.sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON public.sessions(end_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- Create updated_at trigger
CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

