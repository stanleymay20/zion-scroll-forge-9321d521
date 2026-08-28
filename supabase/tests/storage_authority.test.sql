\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_public boolean;
  v_mimes text[];
  v_has_user_id boolean;
  v_public_table_policy boolean;
  v_broad_upload_policy boolean;
  v_owner_select_policy boolean;
BEGIN
  SELECT b.public, b.allowed_mime_types
    INTO v_public, v_mimes
  FROM storage.buckets b
  WHERE b.id = 'ai-tutor-videos';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ai-tutor-videos bucket missing';
  END IF;

  IF v_public THEN
    RAISE EXCEPTION 'ai-tutor-videos must be private';
  END IF;

  IF v_mimes IS NULL OR NOT ('video/webm' = ANY(v_mimes)) THEN
    RAISE EXCEPTION 'ai-tutor-videos must constrain uploads to video/webm';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_tutor_videos'
      AND column_name = 'user_id'
  ) INTO v_has_user_id;

  IF NOT v_has_user_id THEN
    RAISE EXCEPTION 'ai_tutor_videos.user_id ownership column missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_tutor_videos'
      AND policyname = 'Anyone can view AI tutor videos'
  ) INTO v_public_table_policy;

  IF v_public_table_policy THEN
    RAISE EXCEPTION 'public ai_tutor_videos read policy must be removed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'Authenticated users can upload videos',
        'Authenticated users can list AI tutor videos',
        'Anyone can view AI tutor videos'
      )
  ) INTO v_broad_upload_policy;

  IF v_broad_upload_policy THEN
    RAISE EXCEPTION 'historical broad AI tutor storage policy remains';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own AI tutor recordings'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
      AND qual LIKE '%owner_id%auth.uid()%'
  ) INTO v_owner_select_policy;

  IF NOT v_owner_select_policy THEN
    RAISE EXCEPTION 'owner-scoped AI tutor recording SELECT policy missing';
  END IF;
END $$;

ROLLBACK;
