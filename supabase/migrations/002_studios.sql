-- Studios table: Multi-tenant studio entities
-- Each studio is owned by a user and can have multiple members

CREATE TABLE IF NOT EXISTS public.studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_studios_owner_id ON public.studios(owner_id);
CREATE INDEX IF NOT EXISTS idx_studios_slug ON public.studios(slug);

-- Create updated_at trigger
CREATE TRIGGER set_studios_updated_at
  BEFORE UPDATE ON public.studios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


