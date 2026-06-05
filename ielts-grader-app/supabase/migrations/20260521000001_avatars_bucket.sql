-- rollback: DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
--           DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
--           DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
--           DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
--           DELETE FROM storage.buckets WHERE id = 'avatars';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
