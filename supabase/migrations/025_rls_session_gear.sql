-- RLS Policies for session_gear table
-- Users can only access session_gear for sessions in their current studio
-- Members can view, admins can manage
-- 
-- Note: These policies reference the sessions and gear tables, so they will only
-- be created after those tables exist (migrations 026 and 027)

-- Only create policies if sessions and gear tables exist
DO $$
BEGIN
  -- Check if both sessions and gear tables exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gear'
  ) THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Members can view session_gear in their current studio" ON public.session_gear;
    DROP POLICY IF EXISTS "Admins can create session_gear in their current studio" ON public.session_gear;
    DROP POLICY IF EXISTS "Admins can update session_gear in their current studio" ON public.session_gear;
    DROP POLICY IF EXISTS "Admins can delete session_gear in their current studio" ON public.session_gear;

    -- Policy: Members can view session_gear for sessions in their current studio
    -- Use is_studio_member() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
    EXECUTE '
      CREATE POLICY "Members can view session_gear in their current studio"
        ON public.session_gear
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = session_gear.session_id
            AND sessions.studio_id = public.current_studio_id()
          )
          AND public.is_studio_member(public.current_studio_id())
        )';

    -- Policy: Admins can create session_gear for sessions in their current studio
    -- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
    EXECUTE '
      CREATE POLICY "Admins can create session_gear in their current studio"
        ON public.session_gear
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = session_gear.session_id
            AND sessions.studio_id = public.current_studio_id()
          )
          AND EXISTS (
            SELECT 1 FROM public.gear
            WHERE gear.id = session_gear.gear_id
            AND gear.studio_id = public.current_studio_id()
          )
          AND public.is_studio_admin(public.current_studio_id())
        )';

    -- Policy: Admins can update session_gear for sessions in their current studio
    -- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
    EXECUTE '
      CREATE POLICY "Admins can update session_gear in their current studio"
        ON public.session_gear
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = session_gear.session_id
            AND sessions.studio_id = public.current_studio_id()
          )
          AND public.is_studio_admin(public.current_studio_id())
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = session_gear.session_id
            AND sessions.studio_id = public.current_studio_id()
          )
          AND EXISTS (
            SELECT 1 FROM public.gear
            WHERE gear.id = session_gear.gear_id
            AND gear.studio_id = public.current_studio_id()
          )
          AND public.is_studio_admin(public.current_studio_id())
        )';

    -- Policy: Admins can delete session_gear for sessions in their current studio
    -- Use is_studio_admin() function which is SECURITY DEFINER and bypasses RLS to avoid recursion
    EXECUTE '
      CREATE POLICY "Admins can delete session_gear in their current studio"
        ON public.session_gear
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = session_gear.session_id
            AND sessions.studio_id = public.current_studio_id()
          )
          AND public.is_studio_admin(public.current_studio_id())
        )';
  END IF;
END $$;


