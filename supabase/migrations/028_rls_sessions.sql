-- RLS Policies for sessions table
-- Users can only access sessions for their current studio
-- Members can view, admins can manage

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view sessions in their current studio" ON public.sessions;
DROP POLICY IF EXISTS "Admins can create sessions in their current studio" ON public.sessions;
DROP POLICY IF EXISTS "Admins can update sessions in their current studio" ON public.sessions;
DROP POLICY IF EXISTS "Admins can delete sessions in their current studio" ON public.sessions;

-- Policy: Members can view sessions in their current studio
-- Use is_studio_member() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Members can view sessions in their current studio"
  ON public.sessions
  FOR SELECT
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_member(public.current_studio_id())
  );

-- Policy: Admins can create sessions in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can create sessions in their current studio"
  ON public.sessions
  FOR INSERT
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can update sessions in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can update sessions in their current studio"
  ON public.sessions
  FOR UPDATE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  )
  WITH CHECK (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

-- Policy: Admins can delete sessions in their current studio
-- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
CREATE POLICY "Admins can delete sessions in their current studio"
  ON public.sessions
  FOR DELETE
  USING (
    studio_id = public.current_studio_id()
    AND public.is_studio_admin(public.current_studio_id())
  );

