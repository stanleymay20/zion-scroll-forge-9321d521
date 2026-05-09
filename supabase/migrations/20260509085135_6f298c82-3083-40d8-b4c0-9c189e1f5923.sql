
DO $$ BEGIN
  CREATE TYPE public.faculty_category AS ENUM (
    'founding_faculty',
    'visiting_scholar',
    'research_fellow',
    'advisory_faculty',
    'seminar_faculty'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.faculty_verification_status AS ENUM ('pending','verified','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.public_faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.faculty_category NOT NULL,
  full_name text NOT NULL,
  title text,
  credentials text,
  affiliation text,
  orcid_id text,
  google_scholar_url text,
  linkedin_url text,
  personal_url text,
  publications jsonb NOT NULL DEFAULT '[]'::jsonb,
  research_areas text[] NOT NULL DEFAULT ARRAY[]::text[],
  contribution text,
  bio text,
  photo_url text,
  verification_status public.faculty_verification_status NOT NULL DEFAULT 'pending',
  display_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_faculty_cat_active
  ON public.public_faculty (category, is_active, verification_status);

ALTER TABLE public.public_faculty ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view verified active faculty" ON public.public_faculty;
CREATE POLICY "Public can view verified active faculty"
  ON public.public_faculty FOR SELECT
  USING (is_active = true AND verification_status = 'verified');

DROP POLICY IF EXISTS "Admins can view all faculty" ON public.public_faculty;
CREATE POLICY "Admins can view all faculty"
  ON public.public_faculty FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can insert faculty" ON public.public_faculty;
CREATE POLICY "Admins can insert faculty"
  ON public.public_faculty FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can update faculty" ON public.public_faculty;
CREATE POLICY "Admins can update faculty"
  ON public.public_faculty FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Admins can delete faculty" ON public.public_faculty;
CREATE POLICY "Admins can delete faculty"
  ON public.public_faculty FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP TRIGGER IF EXISTS trg_public_faculty_updated ON public.public_faculty;
CREATE TRIGGER trg_public_faculty_updated
  BEFORE UPDATE ON public.public_faculty
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
