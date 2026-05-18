
ALTER TABLE public.academic_terms
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL,
  ALTER COLUMN starts_on DROP NOT NULL,
  ALTER COLUMN ends_on DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_academic_terms_sync_dates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.starts_on IS NULL AND NEW.start_date IS NOT NULL THEN NEW.starts_on := NEW.start_date; END IF;
  IF NEW.ends_on   IS NULL AND NEW.end_date   IS NOT NULL THEN NEW.ends_on   := NEW.end_date;   END IF;
  IF NEW.start_date IS NULL AND NEW.starts_on IS NOT NULL THEN NEW.start_date := NEW.starts_on; END IF;
  IF NEW.end_date   IS NULL AND NEW.ends_on   IS NOT NULL THEN NEW.end_date   := NEW.ends_on;   END IF;
  IF NEW.code IS NULL THEN
    NEW.code := regexp_replace(lower(coalesce(NEW.name,'term')), '[^a-z0-9]+', '-', 'g') || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_academic_terms_sync_dates ON public.academic_terms;
CREATE TRIGGER trg_academic_terms_sync_dates
  BEFORE INSERT OR UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.tg_academic_terms_sync_dates();
