-- RLS Policies for profiles table
-- Users can read their own profile and profiles of users in their current studio

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their current studio" ON public.profiles;

-- Policy: Users can always view and update their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can view profiles of members in their current studio
CREATE POLICY "Users can view profiles in their current studio"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.studio_memberships sm1
      JOIN public.studio_memberships sm2 ON sm1.studio_id = sm2.studio_id
      WHERE sm1.user_id = auth.uid()
        AND sm2.user_id = profiles.id
        AND sm1.studio_id = public.current_studio_id()
    )
  );


