ALTER TABLE public.testimonies ADD COLUMN IF NOT EXISTS category text;

CREATE TABLE IF NOT EXISTS public.testimony_encouragements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimony_id uuid NOT NULL REFERENCES public.testimonies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (testimony_id, user_id)
);

ALTER TABLE public.testimony_encouragements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view encouragements"
  ON public.testimony_encouragements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add own encouragement"
  ON public.testimony_encouragements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own encouragement"
  ON public.testimony_encouragements FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_testimony_encouragements_testimony ON public.testimony_encouragements(testimony_id);