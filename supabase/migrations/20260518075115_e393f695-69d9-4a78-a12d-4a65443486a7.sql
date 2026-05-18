
ALTER TABLE public.academic_terms
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS term_type public.academic_term_type NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD COLUMN IF NOT EXISTS add_drop_ends_on date,
  ADD COLUMN IF NOT EXISTS withdraw_ends_on date,
  ADD COLUMN IF NOT EXISTS status public.academic_term_status NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.academic_terms
SET starts_on = COALESCE(starts_on, start_date),
    ends_on = COALESCE(ends_on, end_date),
    code = COALESCE(code, regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g') || '-' || left(id::text, 6))
WHERE starts_on IS NULL OR ends_on IS NULL OR code IS NULL;

ALTER TABLE public.academic_terms
  ALTER COLUMN starts_on SET NOT NULL,
  ALTER COLUMN ends_on SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.academic_terms ADD CONSTRAINT academic_terms_code_key UNIQUE (code);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms readable by all" ON public.academic_terms;
CREATE POLICY "terms readable by all" ON public.academic_terms FOR SELECT USING (true);
DROP POLICY IF EXISTS "terms manageable by admin/registrar" ON public.academic_terms;
CREATE POLICY "terms manageable by admin/registrar" ON public.academic_terms FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

DROP TRIGGER IF EXISTS trg_terms_updated ON public.academic_terms;
CREATE TRIGGER trg_terms_updated BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
