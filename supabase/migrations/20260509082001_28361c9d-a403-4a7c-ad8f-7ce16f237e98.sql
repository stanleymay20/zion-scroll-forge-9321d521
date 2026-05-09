ALTER TABLE public.devotional_completions
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5);