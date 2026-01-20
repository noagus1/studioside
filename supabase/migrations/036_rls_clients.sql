-- RLS Policies for clients table
-- Users can only access clients for their current studio
-- Members can view, admins can manage

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view clients in their current studio" ON public.clients;
DROP POLICY IF EXISTS "Admins can create clients in their current studio" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients in their current studio" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients in their current studio" ON public.clients;

-- Policy: Members can view clients in their current studio
-- Use is_studio_member() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Members can view clients in their current studio"
  ON public.clients
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

-- Policy: Admins can create clients in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can create clients in their current studio"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can update clients in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can update clients in their current studio"
  ON public.clients
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can delete clients in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can delete clients in their current studio"
  ON public.clients
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );
