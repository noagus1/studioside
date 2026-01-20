-- RLS Policies for gear table
-- Users can only access gear for their current studio
-- Members can view, admins can manage

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view gear in their current studio" ON public.gear;
DROP POLICY IF EXISTS "Admins can create gear in their current studio" ON public.gear;
DROP POLICY IF EXISTS "Admins can update gear in their current studio" ON public.gear;
DROP POLICY IF EXISTS "Admins can delete gear in their current studio" ON public.gear;

-- Policy: Members can view gear in their current studio
-- Use is_studio_member() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Members can view gear in their current studio"
  ON public.gear
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

-- Policy: Admins can create gear in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can create gear in their current studio"
  ON public.gear
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can update gear in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can update gear in their current studio"
  ON public.gear
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can delete gear in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can delete gear in their current studio"
  ON public.gear
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

