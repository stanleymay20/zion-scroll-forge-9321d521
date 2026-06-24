CREATE TABLE IF NOT EXISTS public.human_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_type text NOT NULL,
  decision_reference text,
  ai_system text,
  ai_output jsonb DEFAULT '{}'::jsonb,
  user_explanation text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','upheld','overturned','withdrawn')),
  reviewer_id uuid REFERENCES auth.users(id),
  reviewer_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.human_review_requests TO authenticated;
GRANT ALL ON public.human_review_requests TO service_role;

ALTER TABLE public.human_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own or reviewers view all"
  ON public.human_review_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty'));

CREATE POLICY "Users create own review requests"
  ON public.human_review_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users withdraw own pending requests"
  ON public.human_review_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','withdrawn'));

CREATE POLICY "Reviewers update requests"
  ON public.human_review_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty'));

CREATE INDEX IF NOT EXISTS idx_human_review_user ON public.human_review_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_human_review_status ON public.human_review_requests(status, created_at DESC);

CREATE TRIGGER update_human_review_updated_at
  BEFORE UPDATE ON public.human_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();