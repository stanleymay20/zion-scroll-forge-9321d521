-- ============================================================================
-- SUYAS canonical calendar substrate reconciliation
-- Current truth-boundary migrations must be able to replay after the repository's
-- tolerated historical bootstrap drift. This creates/reconciles only the minimal
-- academic-year and canonical-term substrate; it does not publish or activate data.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.academic_term_type AS ENUM
    ('fall','spring','summer','winter','trimester','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.academic_term_status AS ENUM
    ('planned','open','in_session','closed','archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  year_type text DEFAULT 'semester',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'draft',
  created_by uuid
);

ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS institution_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS year_type text DEFAULT 'semester',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Existing production rows already satisfy these fields. The fallback values are
-- only for historically drifted bootstrap rows where old partial migrations left
-- metadata nullable.
UPDATE public.academic_years
   SET name = COALESCE(NULLIF(trim(name), ''), 'Academic Year ' || left(id::text, 8)),
       is_active = COALESCE(is_active, false),
       year_type = COALESCE(NULLIF(trim(year_type), ''), 'semester'),
       status = COALESCE(NULLIF(trim(status), ''), 'draft'),
       created_at = COALESCE(created_at, now()),
       updated_at = COALESCE(updated_at, now())
 WHERE name IS NULL OR trim(name) = ''
    OR is_active IS NULL OR year_type IS NULL OR trim(year_type) = ''
    OR status IS NULL OR trim(status) = ''
    OR created_at IS NULL OR updated_at IS NULL;

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean DEFAULT false,
  term_type public.academic_term_type NOT NULL DEFAULT 'custom',
  starts_on date,
  ends_on date,
  add_drop_ends_on date,
  withdraw_ends_on date,
  status public.academic_term_status NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_terms
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS term_type public.academic_term_type DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD COLUMN IF NOT EXISTS add_drop_ends_on date,
  ADD COLUMN IF NOT EXISTS withdraw_ends_on date,
  ADD COLUMN IF NOT EXISTS status public.academic_term_status DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.academic_terms
   SET code = COALESCE(NULLIF(trim(code), ''), 'term-' || replace(id::text, '-', '')),
       name = COALESCE(NULLIF(trim(name), ''), NULLIF(trim(code), ''), 'Academic Term ' || left(id::text, 8)),
       starts_on = COALESCE(starts_on, start_date),
       ends_on = COALESCE(ends_on, end_date),
       start_date = COALESCE(start_date, starts_on),
       end_date = COALESCE(end_date, ends_on),
       is_active = COALESCE(is_active, false),
       term_type = COALESCE(term_type, 'custom'::public.academic_term_type),
       status = COALESCE(status, 'planned'::public.academic_term_status),
       created_at = COALESCE(created_at, now()),
       updated_at = COALESCE(updated_at, now());

-- A duplicate historical code is not allowed to become a new ambiguity in the
-- canonical rollover contract. Preserve the first code and deterministically
-- suffix later duplicates with their row id.
WITH ranked AS (
  SELECT id, code,
         row_number() OVER (PARTITION BY lower(code) ORDER BY created_at NULLS LAST, id) AS rn
    FROM public.academic_terms
   WHERE code IS NOT NULL
)
UPDATE public.academic_terms t
   SET code = t.code || '-' || left(replace(t.id::text, '-', ''), 8)
  FROM ranked r
 WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS academic_terms_code_ci_unique_idx
  ON public.academic_terms (lower(code));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.academic_years
     WHERE name IS NULL OR start_date IS NULL OR end_date IS NULL
  ) THEN
    RAISE EXCEPTION 'SUYAS substrate reconciliation failed: academic_years contains rows without identity/date bounds';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.academic_terms
     WHERE code IS NULL OR name IS NULL
        OR COALESCE(starts_on, start_date) IS NULL
        OR COALESCE(ends_on, end_date) IS NULL
  ) THEN
    RAISE EXCEPTION 'SUYAS substrate reconciliation failed: academic_terms contains rows without identity/date bounds';
  END IF;
END$$;

ALTER TABLE public.academic_years
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE public.academic_terms
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN term_type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- The repository contains historical assignment schemas that use is_published,
-- while current faculty/governance code uses published and section_id. Reconcile
-- that vocabulary before the authority migration installs its fail-closed trigger.
-- Existing canonical values win; the legacy flag is used only to fill a missing
-- canonical publication state.
DO $$
DECLARE
  v_has_legacy_is_published boolean;
BEGIN
  IF to_regclass('public.assignments') IS NOT NULL THEN
    ALTER TABLE public.assignments
      ADD COLUMN IF NOT EXISTS section_id uuid,
      ADD COLUMN IF NOT EXISTS published boolean;

    SELECT EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'assignments'
         AND column_name = 'is_published'
    ) INTO v_has_legacy_is_published;

    IF v_has_legacy_is_published THEN
      EXECUTE 'UPDATE public.assignments
                  SET published = COALESCE(published, is_published, false)
                WHERE published IS NULL';
    ELSE
      UPDATE public.assignments
         SET published = false
       WHERE published IS NULL;
    END IF;

    ALTER TABLE public.assignments
      ALTER COLUMN published SET DEFAULT false;
  END IF;
END$$;

COMMENT ON TABLE public.academic_terms IS
  'Canonical SUYAS operational term table. The subsequent authority migration attaches every row to academic_years.';
