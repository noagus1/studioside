-- Storage admin guard that works with either studio_users or studio_memberships
CREATE OR REPLACE FUNCTION public.is_storage_studio_admin(studio_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  IF to_regclass('public.studio_users') IS NOT NULL THEN
    EXECUTE
      'SELECT EXISTS (
         SELECT 1
         FROM public.studio_users
         WHERE studio_id = $1
           AND user_id = auth.uid()
           AND status = ''active''
           AND role IN (''owner'', ''admin'')
       )'
      INTO result
      USING studio_uuid;
    RETURN result;
  END IF;

  IF to_regclass('public.studio_memberships') IS NOT NULL THEN
    EXECUTE
      'SELECT EXISTS (
         SELECT 1
         FROM public.studio_memberships
         WHERE studio_id = $1
           AND user_id = auth.uid()
           AND role IN (''owner'', ''admin'')
       )'
      INTO result
      USING studio_uuid;
    RETURN result;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate storage policies using the new guard for both buckets
DROP POLICY IF EXISTS "Studio admins can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can upload studio logos" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can update studio logos" ON storage.objects;
DROP POLICY IF EXISTS "Studio admins can delete studio logos" ON storage.objects;

CREATE POLICY "Studio admins can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can update avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can delete avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can upload studio logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'studio-logos'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can update studio logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'studio-logos'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  )
  WITH CHECK (
    bucket_id = 'studio-logos'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "Studio admins can delete studio logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'studio-logos'
    AND split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
    AND public.is_storage_studio_admin(split_part(name, '/', 1)::uuid)
  );
