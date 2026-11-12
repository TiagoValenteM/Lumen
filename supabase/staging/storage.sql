-- Fresh staging only. Workspace photo and avatar URLs are public by design.
INSERT INTO storage.buckets (id, name, public) VALUES
  ('workspace-photos', 'workspace-photos', true),
  ('avatars', 'avatars', true);

CREATE POLICY "Lumen staging: read own or moderate uploads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id IN ('workspace-photos', 'avatars')
  AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (bucket_id = 'workspace-photos' AND (SELECT public.is_admin()))));

CREATE POLICY "Lumen staging: upload to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('workspace-photos', 'avatars')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Lumen staging: update own uploads" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id IN ('workspace-photos', 'avatars')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
WITH CHECK (bucket_id IN ('workspace-photos', 'avatars')
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Lumen staging: delete own or moderate photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id IN ('workspace-photos', 'avatars')
  AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (bucket_id = 'workspace-photos' AND (SELECT public.is_admin()))));
