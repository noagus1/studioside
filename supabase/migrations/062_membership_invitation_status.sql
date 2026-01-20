-- Add membership/invitation status columns and tighten helper functions
-- This aligns the data model with the people + membership mental model:
-- - Memberships track role + lifecycle status (active/removed)
-- - Invitations stay pending until accepted or revoked
-- - Helper functions enforce active membership and pending invites

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE public.membership_status AS ENUM ('active', 'pending', 'removed');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'revoked');
  END IF;
END$$;

-- 2) Membership status + joined_at
ALTER TABLE public.studio_memberships
  ADD COLUMN IF NOT EXISTS status public.membership_status DEFAULT 'active';

ALTER TABLE public.studio_memberships
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows
UPDATE public.studio_memberships
SET status = COALESCE(status, 'active'),
    joined_at = COALESCE(joined_at, created_at);

-- Enforce not null + defaults
ALTER TABLE public.studio_memberships
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN joined_at SET NOT NULL,
  ALTER COLUMN joined_at SET DEFAULT NOW();

-- 3) Invitation status + updated_at
ALTER TABLE public.studio_invitations
  ADD COLUMN IF NOT EXISTS status public.invitation_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill invitation rows
UPDATE public.studio_invitations
SET status = COALESCE(status, 'pending'),
    updated_at = COALESCE(updated_at, created_at);

ALTER TABLE public.studio_invitations
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Updated_at trigger for invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_invitations_updated_at'
  ) THEN
    CREATE TRIGGER set_invitations_updated_at
      BEFORE UPDATE ON public.studio_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END$$;

-- Prevent duplicate pending invites per studio/email
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON public.studio_invitations (studio_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_status
  ON public.studio_invitations (status);

-- 4) Helper functions (status-aware)
CREATE OR REPLACE FUNCTION public.is_studio_member(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_memberships
    WHERE studio_id = studio_uuid
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_studio_admin(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_memberships
    WHERE studio_id = studio_uuid
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_valid_invitation(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_invitations si
    WHERE si.studio_id = studio_uuid
      AND si.email = auth.email()
      AND si.status = 'pending'
      AND si.accepted_at IS NULL
      AND si.expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Token validation should ignore revoked/accepted
-- Drop first to allow return type change safely
DROP FUNCTION IF EXISTS public.validate_invite_token(TEXT);

CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  studio_id UUID,
  email TEXT,
  role membership_role,
  status invitation_status,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id,
    si.studio_id,
    si.email,
    si.role,
    si.status,
    si.expires_at
  FROM public.studio_invitations si
  WHERE si.token = invite_token
    AND si.status = 'pending'
    AND si.accepted_at IS NULL
    AND si.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep is_valid_invite aligned with status-aware invitations
CREATE OR REPLACE FUNCTION public.is_valid_invite(studio_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = user_uuid),
    (SELECT email FROM public.profiles WHERE id = user_uuid)
  ) INTO user_email;

  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.studio_invitations si
    WHERE si.studio_id = studio_uuid
      AND si.email = user_email
      AND si.status = 'pending'
      AND si.accepted_at IS NULL
      AND si.expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

