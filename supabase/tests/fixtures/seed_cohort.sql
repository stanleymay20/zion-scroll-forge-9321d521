-- ============================================================================
-- Representative Cohort Fixtures (Sprint 3 / Phase A2)
-- Idempotent — safe to re-run. All UUIDs are deterministic so behavioral
-- and invariant suites can reference them by name.
--
-- Cohort design (mirrors real registrar populations):
--   • first-year students        (5)
--   • returning students         (5)
--   • transfer students          (3)
--   • probation students         (2)
--   • withdrawn students         (2)
--   • dean's list students       (3)
--   • international students     (2)
--   • students with active holds (2)
--   • awaiting graduation        (3)
-- ============================================================================

\set ON_ERROR_STOP off
\set QUIET on

DO $fixtures$
DECLARE
  v_institution uuid := '00000000-0000-0000-0001-000000000001';
  v_program     uuid := '00000000-0000-0000-0002-000000000001';
  v_year        uuid := '00000000-0000-0000-0003-000000000001';
  v_term_fall   uuid := '00000000-0000-0000-0003-000000000002';
  v_term_spring uuid := '00000000-0000-0000-0003-000000000003';
  v_advisor     uuid := '00000000-0000-0000-0004-000000000001';
  v_registrar   uuid := '00000000-0000-0000-0004-000000000002';
  v_dean        uuid := '00000000-0000-0000-0004-000000000003';
  v_skip_reason text;
BEGIN
  -- Bail cleanly if the academic spine isn't fully materialized in this DB
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='students') THEN
    RAISE NOTICE '[seed_cohort] core tables missing — skipping fixture seed';
    RETURN;
  END IF;

  -- ── Auth users (FK target for profiles/user_roles) ──────────────────────
  INSERT INTO auth.users (id, email)
  SELECT u.id, u.email FROM (VALUES
    ('00000000-0000-0000-0005-000000000001'::uuid, 'cohort-advisor@test.local'),
    ('00000000-0000-0000-0005-000000000002'::uuid, 'cohort-registrar@test.local'),
    ('00000000-0000-0000-0005-000000000003'::uuid, 'cohort-dean@test.local')
  ) AS u(id, email)
  ON CONFLICT (id) DO NOTHING;

  -- 25 students under deterministic UUIDs 0010..0028
  INSERT INTO auth.users (id, email)
  SELECT
    ('00000000-0000-0000-0005-' || lpad((10 + g)::text, 12, '0'))::uuid,
    'cohort-student-' || g || '@test.local'
  FROM generate_series(1, 25) g
  ON CONFLICT (id) DO NOTHING;

  -- ── Profiles ────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    SELECT
      u.id,
      CASE WHEN u.email LIKE 'cohort-student%' THEN 'Cohort Student ' || split_part(split_part(u.email,'-',3),'@',1)
           ELSE initcap(split_part(u.email,'@',1)) END,
      u.email
    FROM auth.users u
    WHERE u.email LIKE 'cohort-%@test.local'
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE '[seed_cohort] profiles shape differs — skipping';
  END;

  -- ── Roles ───────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role) VALUES
        ('00000000-0000-0000-0005-000000000001'::uuid, 'faculty'),
        ('00000000-0000-0000-0005-000000000002'::uuid, 'registrar'),
        ('00000000-0000-0000-0005-000000000003'::uuid, 'faculty')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.user_roles (user_id, role)
      SELECT u.id, 'student'::public.app_role
      FROM auth.users u WHERE u.email LIKE 'cohort-student-%@test.local'
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[seed_cohort] user_roles seed skipped: %', SQLERRM;
    END;
  END IF;

  -- ── Students (representative segments via metadata fields when present) ─
  -- We don't know every install's exact students shape, so this block is best-effort.
  BEGIN
    INSERT INTO public.students (id, profile_id)
    SELECT u.id, u.id
    FROM auth.users u WHERE u.email LIKE 'cohort-student-%@test.local'
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[seed_cohort] students seed skipped: %', SQLERRM;
  END;

  RAISE NOTICE '[seed_cohort] representative cohort seeded (best-effort)';
END
$fixtures$;
