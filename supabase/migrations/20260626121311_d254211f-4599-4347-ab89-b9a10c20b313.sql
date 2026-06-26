
CREATE TABLE IF NOT EXISTS public.curriculum_backfill_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_program_id uuid NOT NULL REFERENCES public.degree_programs(id) ON DELETE CASCADE,
  previous_credit_total numeric(6,1) NOT NULL,
  target_credit_total integer NOT NULL,
  new_credit_total numeric(6,1) NOT NULL,
  courses_added integer NOT NULL DEFAULT 0,
  mappings_added integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.curriculum_backfill_audit TO authenticated;
GRANT ALL ON public.curriculum_backfill_audit TO service_role;

ALTER TABLE public.curriculum_backfill_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read curriculum backfill audit"
  ON public.curriculum_backfill_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cba_program ON public.curriculum_backfill_audit(degree_program_id);
