
CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment ON public.post_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user ON public.post_comment_likes(user_id);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment likes are readable by authenticated users"
  ON public.post_comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like comments as themselves"
  ON public.post_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own comment likes"
  ON public.post_comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_comment_likes ON public.post_comment_likes;
CREATE TRIGGER trg_bump_comment_likes
AFTER INSERT OR DELETE ON public.post_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_comment_likes_count();
