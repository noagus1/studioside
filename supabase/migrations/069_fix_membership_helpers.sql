-- Fix membership helper functions to use studio_users
-- Ensures RLS helpers don't reference the removed studio_memberships table

CREATE OR REPLACE FUNCTION public.is_studio_member(studio_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.studio_users
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
    FROM public.studio_users
    WHERE studio_id = studio_uuid
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
