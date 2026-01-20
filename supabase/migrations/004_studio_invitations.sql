-- Studio invitations: Token-based invites for users to join studios
-- Invites are free (no subscription required to accept)

CREATE TABLE IF NOT EXISTS public.studio_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role membership_role NOT NULL DEFAULT 'member',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.studio_invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_studio_id ON public.studio_invitations(studio_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.studio_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.studio_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.studio_invitations(expires_at);

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to validate invite token (bypasses RLS for validation)
-- This allows server actions to validate tokens securely
CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  studio_id UUID,
  email TEXT,
  role membership_role,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id,
    si.studio_id,
    si.email,
    si.role,
    si.expires_at
  FROM public.studio_invitations si
  WHERE si.token = invite_token
    AND si.accepted_at IS NULL
    AND si.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

