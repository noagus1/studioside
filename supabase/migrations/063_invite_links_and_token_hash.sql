-- Invite links + hashed tokens for invitations
-- - Store only token hashes for invitations
-- - Add studio_invite_links for one enabled link per studio
-- - Tighten role constraints and RLS so only owners/admins manage invites

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Ensure functions from pgcrypto are resolvable regardless of extension schema
SET LOCAL search_path = public, extensions, pg_temp;

-- Safety: drop dependent objects before altering columns
DROP FUNCTION IF EXISTS public.validate_invite_token(TEXT);
DROP INDEX IF EXISTS idx_invitations_token;

-- 1) Invite links table (one active link per studio, member-only role)
CREATE TABLE IF NOT EXISTS public.studio_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  token TEXT,
  token_hash TEXT NOT NULL,
  default_role membership_role NOT NULL DEFAULT 'member',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_invite_links_role_check CHECK (default_role = 'member')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_links_token_hash
  ON public.studio_invite_links (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_links_studio_unique
  ON public.studio_invite_links (studio_id);

-- 2) Invitations: hash tokens and disallow owner role
ALTER TABLE public.studio_invitations
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Backfill existing invites using SHA-256 of the legacy token
UPDATE public.studio_invitations
SET token_hash = encode(digest(convert_to(token, 'UTF8'), 'sha256'), 'hex')
WHERE token IS NOT NULL
  AND token_hash IS NULL;

-- Enforce non-null token_hash
ALTER TABLE public.studio_invitations
  ALTER COLUMN token_hash SET NOT NULL;

-- Disallow owner role on invitations (only admin/member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'studio_invitations_role_check'
  ) THEN
    ALTER TABLE public.studio_invitations
      ADD CONSTRAINT studio_invitations_role_check
      CHECK (role IN ('admin', 'member'));
  END IF;
END$$;

-- Keep single pending invite per studio/email (lowercased) already handled by idx_invitations_unique_pending
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token_hash
  ON public.studio_invitations (token_hash);

-- Drop legacy plain token column now that hashes exist
ALTER TABLE public.studio_invitations
  DROP COLUMN IF EXISTS token;

-- 3) Token validation helpers (hash-based)
CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  studio_id UUID,
  email TEXT,
  role membership_role,
  status invitation_status,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  token_digest TEXT;
BEGIN
  token_digest := encode(digest(invite_token, 'sha256'), 'hex');

  RETURN QUERY
  SELECT
    si.id,
    si.studio_id,
    si.email,
    si.role,
    si.status,
    si.expires_at
  FROM public.studio_invitations si
  WHERE si.token_hash = token_digest
    AND si.status = 'pending'
    AND si.accepted_at IS NULL
    AND si.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_invite_link_token(invite_token TEXT)
RETURNS TABLE (
  studio_id UUID,
  default_role membership_role,
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  token_digest TEXT;
BEGIN
  token_digest := encode(digest(invite_token, 'sha256'), 'hex');

  RETURN QUERY
  SELECT
    sil.studio_id,
    sil.default_role,
    sil.is_enabled,
    sil.created_at
  FROM public.studio_invite_links sil
  WHERE sil.token_hash = token_digest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) RLS for invite links: only owners/admins manage or view
ALTER TABLE public.studio_invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage invite links" ON public.studio_invite_links;
DROP POLICY IF EXISTS "Admins can view invite links" ON public.studio_invite_links;

CREATE POLICY "Admins can view invite links"
  ON public.studio_invite_links
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can manage invite links"
  ON public.studio_invite_links
  FOR ALL
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- 5) RLS tightening for invitations: only owners/admins manage
ALTER TABLE public.studio_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view invites for their current studio" ON public.studio_invitations;
DROP POLICY IF EXISTS "Admins can create invites for their current studio" ON public.studio_invitations;
DROP POLICY IF EXISTS "Admins can delete invites for their current studio" ON public.studio_invitations;
DROP POLICY IF EXISTS "Users can update invites when accepting" ON public.studio_invitations;
DROP POLICY IF EXISTS "Users can delete invites when accepting" ON public.studio_invitations;
DROP POLICY IF EXISTS "Users can view invites sent to their email" ON public.studio_invitations;

CREATE POLICY "Admins can view invites for their current studio"
  ON public.studio_invitations
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can create invites for their current studio"
  ON public.studio_invitations
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND invited_by = auth.uid()
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can update invites for their current studio"
  ON public.studio_invitations
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

CREATE POLICY "Admins can delete invites for their current studio"
  ON public.studio_invitations
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );
