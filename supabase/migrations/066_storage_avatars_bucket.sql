-- Create avatars bucket for studio logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can delete avatars" ON storage.objects;

CREATE POLICY "Public read avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Studio admins can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can update avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_studio_admin(split_part(name, '/', 1)::uuid)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can delete avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_studio_admin(split_part(name, '/', 1)::uuid)
  );
