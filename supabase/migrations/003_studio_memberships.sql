-- Studio memberships: Links users to studios with roles
-- This is the core of multi-tenant access control

CREATE TYPE public.membership_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS public.studio_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(studio_id, user_id)
);

-- Enable RLS
ALTER TABLE public.studio_memberships ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memberships_studio_id ON public.studio_memberships(studio_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.studio_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_studio_user ON public.studio_memberships(studio_id, user_id);

-- Create updated_at trigger
CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON public.studio_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Automatically create membership for studio owner
CREATE OR REPLACE FUNCTION public.handle_studio_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.studio_memberships (studio_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (studio_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_studio_created
  AFTER INSERT ON public.studios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_studio_owner_membership();


