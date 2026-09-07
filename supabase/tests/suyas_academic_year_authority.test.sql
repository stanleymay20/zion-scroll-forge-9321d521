-- ============================================================================
-- SUYAS academic-year authority regression suite
-- Fails closed if terms can escape academic years or lifecycle state can be forged.
-- ============================================================================
\set QUIET on
\pset pager off

BEGIN;

ALTER TABLE auth.users DISABLE TRIGGER ALL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='academic_terms'
       AND column_name='academic_year_id' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION 'FAIL: academic_terms.academic_year_id is not mandatory';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.academic_terms'::regclass
       AND conname='academic_terms_academic_year_id_fkey'
       AND contype='f'
  ) THEN
    RAISE EXCEPTION 'FAIL: academic_terms -> academic_years FK missing';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='public.academic_years'::regclass
       AND tgname='trg_suyas_academic_year_state_authority'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: academic-year state authority trigger missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='public.academic_terms'::regclass
       AND tgname='trg_suyas_academic_term_year_integrity'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: academic-term parent integrity trigger missing';
  END IF;
END$$;

-- Seed an authorized actor.
INSERT INTO auth.users (id, email)
VALUES ('81818181-8181-8181-8181-818181818181'::uuid, 'suyas-admin@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('81818181-8181-8181-8181-818181818181'::uuid, 'admin')
ON CONFLICT DO NOTHING;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub','81818181-8181-8181-8181-818181818181',
    'role','authenticated'
  )::text,
  true
);

-- Build a future draft year with two canonical terms.
INSERT INTO public.academic_years (
  id, name, start_date, end_date, is_active, year_type, status
) VALUES (
  '82828282-8282-8282-8282-828282828282'::uuid,
  '2098-2099 SUYAS Test Year',
  '2098-08-01', '2099-07-31', false, 'semester', 'draft'
);

INSERT INTO public.academic_terms (
  id, code, name, term_type,
  starts_on, ends_on, start_date, end_date,
  status, is_active, academic_year_id
) VALUES
(
  '83838383-8383-8383-8383-838383838383'::uuid,
  'SUYAS-2098-FALL', 'SUYAS Fall 2098', 'fall',
  '2098-08-15', '2098-12-15', '2098-08-15', '2098-12-15',
  'planned', false, '82828282-8282-8282-8282-828282828282'::uuid
),
(
  '84848484-8484-8484-8484-848484848484'::uuid,
  'SUYAS-2099-SPRING', 'SUYAS Spring 2099', 'spring',
  '2099-01-10', '2099-05-20', '2099-01-10', '2099-05-20',
  'planned', false, '82828282-8282-8282-8282-828282828282'::uuid
);

-- A term may not sit outside its parent academic-year envelope.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.academic_terms (
      id, code, name, term_type,
      starts_on, ends_on, start_date, end_date,
      status, is_active, academic_year_id
    ) VALUES (
      '85858585-8585-8585-8585-858585858585'::uuid,
      'SUYAS-OUTSIDE', 'Outside Year', 'custom',
      '2097-01-01', '2097-02-01', '2097-01-01', '2097-02-01',
      'planned', false, '82828282-8282-8282-8282-828282828282'::uuid
    );
  EXCEPTION WHEN OTHERS THEN
    blocked := SQLERRM LIKE 'suyas_term_outside_academic_year%';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: out-of-year term was accepted'; END IF;
END$$;

-- Direct state mutation must fail even for an authorized admin client.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.academic_years
       SET status='published', is_active=true
     WHERE id='82828282-8282-8282-8282-828282828282'::uuid;
  EXCEPTION WHEN OTHERS THEN
    blocked := SQLERRM LIKE 'suyas_year_state_rpc_only%';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: direct academic-year state forgery was accepted'; END IF;
END$$;

-- Valid lifecycle path succeeds and makes the term governed.
SELECT public.publish_academic_year('82828282-8282-8282-8282-828282828282'::uuid);

DO $$
DECLARE v_status text; v_active boolean; v_governed boolean;
BEGIN
  SELECT status, is_active INTO v_status, v_active
    FROM public.academic_years
   WHERE id='82828282-8282-8282-8282-828282828282'::uuid;
  SELECT public.suyas_term_is_governed('83838383-8383-8383-8383-838383838383'::uuid)
    INTO v_governed;
  IF v_status <> 'published' OR NOT v_active OR NOT v_governed THEN
    RAISE EXCEPTION 'FAIL: publish RPC did not establish governed year state';
  END IF;
END$$;

-- The direct legacy clone path stays retired. The existing Operations UI
-- compatibility facade may execute, but its text inputs must resolve only to
-- canonical academic_terms and delegate to UUID-based SUYAS rollover.
DO $$
DECLARE def text; blocked boolean := false;
BEGIN
  IF to_regprocedure('public.clone_section_for_term(uuid,text,jsonb,uuid)') IS NOT NULL
     AND (has_function_privilege('authenticated','public.clone_section_for_term(uuid,text,jsonb,uuid)','EXECUTE')
          OR has_function_privilege('service_role','public.clone_section_for_term(uuid,text,jsonb,uuid)','EXECUTE')) THEN
    RAISE EXCEPTION 'FAIL: direct legacy free-text clone remains executable';
  END IF;

  IF NOT has_function_privilege('authenticated','public.rollover_suyas_term(uuid,uuid,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: governed SUYAS rollover is not executable by authenticated callers';
  END IF;

  IF NOT has_function_privilege('authenticated','public.rollover_term(text,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: Operations compatibility facade is unavailable';
  END IF;

  SELECT pg_get_functiondef('public.rollover_term(text,text,boolean)'::regprocedure) INTO def;
  IF def NOT LIKE '%public.academic_terms%' OR def NOT LIKE '%rollover_suyas_term%' THEN
    RAISE EXCEPTION 'FAIL: rollover compatibility facade does not resolve canonical terms and delegate';
  END IF;

  BEGIN
    PERFORM public.rollover_term('THIS-TERM-DOES-NOT-EXIST','NOR-DOES-THIS',true);
  EXCEPTION WHEN OTHERS THEN
    blocked := SQLERRM LIKE 'source_canonical_suyas_term_not_found%';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: arbitrary rollover labels did not fail closed'; END IF;
END$$;

-- New section cloning carries the real target term id. Planned terms create
-- scheduled/inactive sections rather than falsely operational sections.
INSERT INTO public.course_sections (
  id, term_label, term_id, course_code, course_title, section_code,
  seat_capacity, waitlist_capacity, credit_hours, active, section_status
) VALUES (
  '86868686-8686-8686-8686-868686868686'::uuid,
  'SUYAS-2098-FALL', '83838383-8383-8383-8383-838383838383'::uuid,
  'SUY101', 'SUYAS Authority Test', '001', 30, 5, 3, true, 'open'
);

DO $$
DECLARE v_new uuid; v_term uuid; v_active boolean; v_state text;
BEGIN
  v_new := public.clone_section_for_suyas_term(
    '86868686-8686-8686-8686-868686868686'::uuid,
    '84848484-8484-8484-8484-848484848484'::uuid
  );
  SELECT term_id, active, section_status INTO v_term, v_active, v_state
    FROM public.course_sections WHERE id=v_new;
  IF v_term <> '84848484-8484-8484-8484-848484848484'::uuid
     OR v_active IS TRUE OR v_state <> 'scheduled' THEN
    RAISE EXCEPTION 'FAIL: governed clone did not preserve target SUYAS term/scheduling state';
  END IF;
END$$;

-- Published assignments cannot newly enter an unscoped state.
DO $$
BEGIN
  IF to_regclass('public.assignments') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='public.assignments'::regclass
       AND tgname='trg_suyas_assignment_publication_scope'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: assignment publication scope trigger missing';
  END IF;
END$$;

-- Canonical assignment publication is single-source-of-truth and the legacy
-- is_published alias cannot independently publish an assignment.
DO $$
DECLARE
  v_has_legacy boolean;
  v_select_policy_count int;
  v_policy_qual text;
  blocked boolean := false;
  v_published boolean;
  v_legacy boolean;
BEGIN
  IF to_regclass('public.assignments') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='assignments'
       AND column_name='published' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION 'FAIL: assignments.published is not mandatory canonical state';
  END IF;

  SELECT count(*), max(qual)
    INTO v_select_policy_count, v_policy_qual
    FROM pg_policies
   WHERE schemaname='public'
     AND tablename='assignments'
     AND cmd='SELECT';

  IF v_select_policy_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: assignments has % SELECT policies; expected one canonical visibility policy', v_select_policy_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public'
       AND tablename='assignments'
       AND policyname='Assignments canonical publication visibility'
       AND cmd='SELECT'
       AND roles::text LIKE '%authenticated%'
  ) THEN
    RAISE EXCEPTION 'FAIL: canonical authenticated assignment visibility policy missing';
  END IF;

  IF v_policy_qual IS NULL
     OR lower(v_policy_qual) NOT LIKE '%published%'
     OR lower(v_policy_qual) NOT LIKE '%enrollments%' THEN
    RAISE EXCEPTION 'FAIL: canonical assignment visibility is not publication + enrollment aware';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='assignments' AND column_name='is_published'
  ) INTO v_has_legacy;

  IF v_has_legacy THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid='public.assignments'::regclass
         AND tgname='trg_z_suyas_assignment_publication_alias'
         AND NOT tgisinternal
    ) THEN
      RAISE EXCEPTION 'FAIL: legacy assignment publication alias trigger missing';
    END IF;

    EXECUTE $sql$
      INSERT INTO public.assignments (
        id, title, description, section_id, published, is_published
      ) VALUES (
        '87878787-8787-8787-8787-878787878787'::uuid,
        'SUYAS publication authority fixture',
        'Regression fixture',
        NULL,
        false,
        false
      )
    $sql$;

    BEGIN
      EXECUTE $sql$
        UPDATE public.assignments
           SET is_published = true
         WHERE id='87878787-8787-8787-8787-878787878787'::uuid
      $sql$;
    EXCEPTION WHEN OTHERS THEN
      blocked := SQLERRM LIKE 'suyas_legacy_is_published_read_only%';
    END;
    IF NOT blocked THEN
      RAISE EXCEPTION 'FAIL: legacy is_published independently changed publication state';
    END IF;

    EXECUTE $sql$
      UPDATE public.assignments
         SET section_id='86868686-8686-8686-8686-868686868686'::uuid,
             published=true
       WHERE id='87878787-8787-8787-8787-878787878787'::uuid
    $sql$;

    EXECUTE $sql$
      SELECT published, is_published
        FROM public.assignments
       WHERE id='87878787-8787-8787-8787-878787878787'::uuid
    $sql$ INTO v_published, v_legacy;

    IF v_published IS DISTINCT FROM true OR v_legacy IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'FAIL: canonical publication did not synchronize legacy alias';
    END IF;
  END IF;
END$$;

-- Lifecycle RPCs themselves must carry canonical-term checks.
DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef('public.publish_academic_year(uuid)'::regprocedure) INTO def;
  IF def NOT LIKE '%public.academic_terms%' OR def NOT LIKE '%academic_year_id%' THEN
    RAISE EXCEPTION 'FAIL: publish_academic_year is not canonical-term aware';
  END IF;
END$$;

ROLLBACK;
\echo 'SUYAS academic-year authority suite: PASS'
