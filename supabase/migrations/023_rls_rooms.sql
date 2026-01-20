-- RLS Policies for rooms table
-- Users can only access rooms for their current studio
-- Members can view, admins can manage

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view rooms in their current studio" ON public.rooms;
DROP POLICY IF EXISTS "Admins can create rooms in their current studio" ON public.rooms;
DROP POLICY IF EXISTS "Admins can update rooms in their current studio" ON public.rooms;
DROP POLICY IF EXISTS "Admins can delete rooms in their current studio" ON public.rooms;

-- Policy: Members can view rooms in their current studio
-- Use is_studio_member() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Members can view rooms in their current studio"
  ON public.rooms
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

-- Policy: Admins can create rooms in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can create rooms in their current studio"
  ON public.rooms
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can update rooms in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can update rooms in their current studio"
  ON public.rooms
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can delete rooms in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can delete rooms in their current studio"
  ON public.rooms
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );
















