-- Launch P0: private ownership boundary for AI tutor recordings.
-- Historical schema created ai-tutor-videos as a public bucket and allowed any
-- authenticated user to upload into the shared namespace. The frontend uses
-- this bucket for camera/microphone recordings made by individual learners, so
-- these objects are personal learning data and must not be public assets.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'launch storage authority requires Supabase Storage tables';
  END IF;
  IF to_regclass('public.ai_tutor_videos') IS NULL THEN
    RAISE EXCEPTION 'launch storage authority requires public.ai_tutor_videos';
  END IF;
END $$;

-- Existing objects immediately stop resolving through public bucket URLs.
-- Keep the existing bucket id so current upload code remains compatible.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['video/webm']::text[]
WHERE id = 'ai-tutor-videos';

-- Remove historical broad/public policies.
DROP POLICY IF EXISTS "Anyone can view AI tutor videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list AI tutor videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own AI tutor recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own AI tutor recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own AI tutor recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own AI tutor recordings" ON storage.objects;

-- Uploads remain available to signed-in learners, but Supabase Storage records
-- the uploader as owner_id. Reads and mutations are then restricted to that
-- owner; service_role retains its normal RLS bypass for trusted backend work.
CREATE POLICY "Users can upload own AI tutor recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ai-tutor-videos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can read own AI tutor recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ai-tutor-videos'
  AND owner_id = auth.uid()::text
);

CREATE POLICY "Users can update own AI tutor recordings"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ai-tutor-videos'
  AND owner_id = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'ai-tutor-videos'
  AND owner_id = auth.uid()::text
);

CREATE POLICY "Users can delete own AI tutor recordings"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ai-tutor-videos'
  AND owner_id = auth.uid()::text
);

-- Bind metadata to the authenticated learner. Existing legacy rows remain NULL
-- and therefore become inaccessible to browser roles until explicitly reviewed.
ALTER TABLE public.ai_tutor_videos
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ai_tutor_videos
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_ai_tutor_videos_user_id
  ON public.ai_tutor_videos(user_id);

DROP POLICY IF EXISTS "Anyone can view AI tutor videos" ON public.ai_tutor_videos;
DROP POLICY IF EXISTS "Users can view own AI tutor videos" ON public.ai_tutor_videos;
DROP POLICY IF EXISTS "Users can create own AI tutor videos" ON public.ai_tutor_videos;
DROP POLICY IF EXISTS "Users can update own AI tutor videos" ON public.ai_tutor_videos;
DROP POLICY IF EXISTS "Users can delete own AI tutor videos" ON public.ai_tutor_videos;

CREATE POLICY "Users can view own AI tutor videos"
ON public.ai_tutor_videos FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own AI tutor videos"
ON public.ai_tutor_videos FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI tutor videos"
ON public.ai_tutor_videos FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own AI tutor videos"
ON public.ai_tutor_videos FOR DELETE TO authenticated
USING (user_id = auth.uid());

COMMENT ON COLUMN public.ai_tutor_videos.user_id IS
  'Owner of a private learner-created AI tutor recording. Legacy NULL rows are not browser-readable.';
