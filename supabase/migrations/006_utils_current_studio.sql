-- Utility function: Set current_studio_id in session
-- This function sets the studio ID in the PostgreSQL session for RLS policies
CREATE OR REPLACE FUNCTION public.set_current_studio_id(studio_uuid UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_studio_id', studio_uuid::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Utility function: Get current_studio_id from request context
-- This function reads the studio ID from the request's local settings
-- which is set by the server-side Supabase client using set_config()

CREATE OR REPLACE FUNCTION public.current_studio_id()
RETURNS UUID AS $$
BEGIN
  -- Read from request-local setting set by server client
  -- Returns NULL if not set
  RETURN NULLIF(current_setting('app.current_studio_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function: Check if current user is a member of a studio
CREATE OR REPLACE FUNCTION public.is_studio_member(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_memberships
    WHERE studio_id = studio_uuid
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user is owner/admin of a studio
CREATE OR REPLACE FUNCTION public.is_studio_admin(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_memberships
    WHERE studio_id = studio_uuid
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user has a valid invitation for a studio
-- This bypasses RLS to allow membership creation via invites
CREATE OR REPLACE FUNCTION public.has_valid_invitation(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_invitations si
    WHERE si.studio_id = studio_uuid
      AND si.email = auth.email()
      AND si.accepted_at IS NULL
      AND si.expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


