-- RLS Policies for studios table
-- Users can only access studios where they are members AND it matches current_studio_id

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view studios they are members of" ON public.studios;
DROP POLICY IF EXISTS "Users can update studios they own or admin" ON public.studios;
DROP POLICY IF EXISTS "Users can create studios" ON public.studios;

-- Policy: Users can view studios where they are members AND it's their current studio
CREATE POLICY "Users can view studios they are members of"
  ON public.studios
  FOR SELECT
  USING (
    id = public.current_studio_id()
    AND EXISTS (
      SELECT 1
      FROM public.studio_memberships
      WHERE studio_id = studios.id
        AND user_id = auth.uid()
    )
  );

-- Policy: Users can update studios where they are owner or admin AND it's their current studio
CREATE POLICY "Users can update studios they own or admin"
  ON public.studios
  FOR UPDATE
  USING (
    id = public.current_studio_id()
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.studio_memberships
        WHERE studio_id = studios.id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- Policy: Users can create studios (subscription check happens in server action)
CREATE POLICY "Users can create studios"
  ON public.studios
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);


