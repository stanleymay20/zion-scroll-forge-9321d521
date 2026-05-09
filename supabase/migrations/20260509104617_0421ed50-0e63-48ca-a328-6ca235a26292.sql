-- Storage bucket for course preview videos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-previews', 'course-previews', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can view preview videos
CREATE POLICY "Public can view course preview videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-previews');

-- Admins can upload/update/delete preview videos
CREATE POLICY "Admins can upload course preview videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-previews'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
);

CREATE POLICY "Admins can update course preview videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-previews'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
);

CREATE POLICY "Admins can delete course preview videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-previews'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
);