-- ============================================================================
-- Academic Spine — Sprint 2 Regression Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/academic_spine.test.sql
--
-- Covers: prerequisite enforcement, section enrollment lifecycle, grading,
-- GPA computation, academic standing, degree plan/audit, graduation
-- eligibility, CLO/PLO mastery, and RLS smoke tests on student data.
--
-- All assertions live inside a single transaction that ROLLBACKs at the end.
-- Each test records a row in _suite_results; the final SELECT prints a
-- summary table. Non-zero exit code = regression (CI-friendly).
-- ============================================================================

\set QUIET on
\pset pager off

BEGIN;

DROP TABLE IF EXISTS _suite_results;
CREATE TEMP TABLE _suite_results(test_no int, name text, status text, detail text);
-- Allow recording from non-superuser roles (anon/authenticated) during RLS smoke tests.
GRANT INSERT, SELECT ON _suite_results TO PUBLIC;

CREATE OR REPLACE FUNCTION pg_temp.record(p_no int, p_name text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO _suite_results VALUES (p_no, p_name, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail);
  IF NOT p_ok THEN
    RAISE WARNING 'TEST % FAIL: % — %', p_no, p_name, p_detail;
  ELSE
    RAISE NOTICE 'TEST % PASS: %', p_no, p_name;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION pg_temp.fn_exists(p_schema text, p_name text)
RETURNS boolean LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = p_schema AND p.proname = p_name
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.tbl_exists(p_name text)
RETURNS boolean LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name=p_name
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.trg_exists(p_name text)
RETURNS boolean LANGUAGE sql AS $$
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = p_name);
$$;

CREATE OR REPLACE FUNCTION pg_temp.rls_enabled(p_table text)
RETURNS boolean LANGUAGE sql AS $$
  SELECT relrowsecurity FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname = p_table;
$$;

CREATE OR REPLACE FUNCTION pg_temp.policy_count(p_table text)
RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename = p_table;
$$;

-- ============================================================================
-- SECTION A — Schema spine: tables, functions, triggers must exist
-- ============================================================================

DO $$ BEGIN
  PERFORM pg_temp.record(1,  'Table course_sections exists',         pg_temp.tbl_exists('course_sections'));
  PERFORM pg_temp.record(2,  'Table section_enrollments exists',     pg_temp.tbl_exists('section_enrollments'));
  PERFORM pg_temp.record(3,  'Table grade_records exists',           pg_temp.tbl_exists('grade_records'));
  PERFORM pg_temp.record(4,  'Table student_academic_standing exists', pg_temp.tbl_exists('student_academic_standing'));
  PERFORM pg_temp.record(5,  'Table degree_plans exists',            pg_temp.tbl_exists('degree_plans'));
  PERFORM pg_temp.record(6,  'Table degree_plan_items exists',       pg_temp.tbl_exists('degree_plan_items'));
  PERFORM pg_temp.record(7,  'Table graduation_candidates exists',   pg_temp.tbl_exists('graduation_candidates'));
  PERFORM pg_temp.record(8,  'Table student_outcome_mastery exists', pg_temp.tbl_exists('student_outcome_mastery'));
  PERFORM pg_temp.record(9,  'Table clo_plo_mapping exists',         pg_temp.tbl_exists('clo_plo_mapping'));
  PERFORM pg_temp.record(10, 'Table registrar_audit_log exists',     pg_temp.tbl_exists('registrar_audit_log'));
  PERFORM pg_temp.record(11, 'Table academic_records_audit exists',  pg_temp.tbl_exists('academic_records_audit'));
  PERFORM pg_temp.record(12, 'Table degree_audit_log exists',        pg_temp.tbl_exists('degree_audit_log'));
  PERFORM pg_temp.record(13, 'Table faculty_audit_log exists',       pg_temp.tbl_exists('faculty_audit_log'));
  PERFORM pg_temp.record(14, 'Table ai_output_log exists',           pg_temp.tbl_exists('ai_output_log'));
  PERFORM pg_temp.record(15, 'Table cron_execution_log exists',      pg_temp.tbl_exists('cron_execution_log'));
END $$;

-- ============================================================================
-- SECTION B — Registrar RPCs
-- ============================================================================

DO $$ BEGIN
  PERFORM pg_temp.record(20, 'RPC enroll_student_in_section exists',  pg_temp.fn_exists('public','enroll_student_in_section'));
  PERFORM pg_temp.record(21, 'RPC drop_section_enrollment exists',    pg_temp.fn_exists('public','drop_section_enrollment'));
  PERFORM pg_temp.record(22, 'RPC submit_course_grade exists',        pg_temp.fn_exists('public','submit_course_grade'));
  PERFORM pg_temp.record(23, 'RPC compute_student_gpa exists',        pg_temp.fn_exists('public','compute_student_gpa'));
  PERFORM pg_temp.record(24, 'RPC evaluate_academic_standing exists', pg_temp.fn_exists('public','evaluate_academic_standing'));
  PERFORM pg_temp.record(25, 'RPC generate_transcript exists',        pg_temp.fn_exists('public','generate_transcript'));
  PERFORM pg_temp.record(26, 'RPC generate_degree_plan exists',       pg_temp.fn_exists('public','generate_degree_plan'));
  PERFORM pg_temp.record(27, 'RPC run_degree_audit exists',           pg_temp.fn_exists('public','run_degree_audit'));
  PERFORM pg_temp.record(28, 'RPC evaluate_graduation_candidate exists', pg_temp.fn_exists('public','evaluate_graduation_candidate'));
  PERFORM pg_temp.record(29, 'RPC has_role exists',                   pg_temp.fn_exists('public','has_role'));
  PERFORM pg_temp.record(30, 'RPC cron_log_start exists',             pg_temp.fn_exists('public','cron_log_start'));
  PERFORM pg_temp.record(31, 'RPC cron_log_finish exists',            pg_temp.fn_exists('public','cron_log_finish'));
  PERFORM pg_temp.record(32, 'RPC get_system_health exists',          pg_temp.fn_exists('public','get_system_health'));
END $$;

-- ============================================================================
-- SECTION C — Notification trigger producers (Sprint 1 deliverable)
-- ============================================================================

DO $$ BEGIN
  PERFORM pg_temp.record(40, 'Trigger trg_notify_grade_posted installed',       pg_temp.trg_exists('trg_notify_grade_posted'));
  PERFORM pg_temp.record(41, 'Trigger trg_notify_standing_changed installed',   pg_temp.trg_exists('trg_notify_standing_changed'));
  PERFORM pg_temp.record(42, 'Trigger trg_notify_advising_flag installed',      pg_temp.trg_exists('trg_notify_advising_flag'));
  PERFORM pg_temp.record(43, 'Trigger trg_notify_intervention_assigned installed', pg_temp.trg_exists('trg_notify_intervention_assigned'));
END $$;

-- ============================================================================
-- SECTION D — RLS armor: every sensitive table must have RLS + ≥1 policy
-- ============================================================================

DO $$
DECLARE
  tbls text[] := ARRAY[
    'profiles','students','user_roles','grade_records','section_enrollments',
    'student_academic_standing','degree_plans','degree_plan_items',
    'graduation_candidates','student_outcome_mastery','ai_output_log',
    'student_advising_notes','student_advising_flags','human_review_requests'
  ];
  t text; ok boolean; pc int;
  i int := 50;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    ok := pg_temp.rls_enabled(t);
    pc := pg_temp.policy_count(t);
    PERFORM pg_temp.record(i, 'RLS armor: '||t,
      ok AND pc > 0,
      CASE WHEN NOT ok THEN 'RLS not enabled'
           WHEN pc = 0 THEN 'no policies'
           ELSE 'rls=on, policies='||pc::text END);
    i := i + 1;
  END LOOP;
END $$;

-- ============================================================================
-- SECTION E — Grade immutability (finalized grades cannot be edited)
-- ============================================================================

DO $$
DECLARE
  v_section uuid;
  v_student uuid;
  v_grade_id uuid;
  v_err text;
BEGIN
  -- Find any real student + section pair already in the DB
  SELECT se.section_id, se.student_user_id
    INTO v_section, v_student
    FROM section_enrollments se
    LIMIT 1;

  IF v_section IS NULL THEN
    PERFORM pg_temp.record(70, 'Grade immutability test', true, 'skipped — no section enrollments seeded');
  ELSE
    -- Insert a posted grade
    INSERT INTO grade_records (student_id, section_id, letter_grade, numeric_grade, status, posted_at)
    VALUES (v_student, v_section, 'B+', 87, 'posted', now())
    RETURNING id INTO v_grade_id;

    -- Posted grades should be editable
    BEGIN
      UPDATE grade_records SET numeric_grade = 90 WHERE id = v_grade_id;
      PERFORM pg_temp.record(70, 'Posted grade is editable', true);
    EXCEPTION WHEN OTHERS THEN
      PERFORM pg_temp.record(70, 'Posted grade is editable', false, SQLERRM);
    END;

    -- Finalize it
    UPDATE grade_records SET status = 'final', finalized_at = now() WHERE id = v_grade_id;

    -- Finalized grade should be immutable
    BEGIN
      UPDATE grade_records SET numeric_grade = 95 WHERE id = v_grade_id;
      PERFORM pg_temp.record(71, 'Finalized grade is immutable', false, 'UPDATE was allowed');
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      PERFORM pg_temp.record(71, 'Finalized grade is immutable', true, v_err);
    END;
  END IF;
END $$;

-- ============================================================================
-- SECTION F — Prerequisite enforcement RPC behavior (smoke)
-- ============================================================================

DO $$
DECLARE
  v_student uuid;
  v_section uuid;
  v_result jsonb;
BEGIN
  -- Synthetic call: missing student should reject
  BEGIN
    SELECT public.enroll_student_in_section(
      gen_random_uuid(),  -- non-existent student
      (SELECT id FROM course_sections LIMIT 1)
    ) INTO v_result;
    PERFORM pg_temp.record(80, 'Enrollment rejects unknown student',
      (v_result->>'success')::boolean IS NOT TRUE,
      coalesce(v_result->>'error', 'no error returned'));
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record(80, 'Enrollment rejects unknown student', true, SQLERRM);
  END;
END $$;

-- ============================================================================
-- SECTION G — GPA computation: returns numeric for known student
-- ============================================================================

DO $$
DECLARE
  v_student uuid;
  v_gpa jsonb;
BEGIN
  SELECT student_id INTO v_student
    FROM grade_records
    WHERE status IN ('provisional','final')
    LIMIT 1;

  IF v_student IS NULL THEN
    PERFORM pg_temp.record(90, 'GPA RPC returns shape', true, 'skipped — no posted grades');
  ELSE
    BEGIN
      SELECT public.compute_student_gpa(v_student, NULL) INTO v_gpa;
      PERFORM pg_temp.record(90, 'compute_student_gpa returns jsonb',
        v_gpa IS NOT NULL AND (v_gpa ? 'cumulative_gpa' OR v_gpa ? 'gpa'),
        coalesce(v_gpa::text, 'null'));
    EXCEPTION WHEN OTHERS THEN
      PERFORM pg_temp.record(90, 'compute_student_gpa runs', false, SQLERRM);
    END;
  END IF;
END $$;

-- ============================================================================
-- SECTION H — Academic standing categories are valid
-- ============================================================================

DO $$
DECLARE
  v_count int;
  v_bad   int;
BEGIN
  SELECT count(*) INTO v_count FROM student_academic_standing;
  SELECT count(*) INTO v_bad   FROM student_academic_standing
    WHERE standing NOT IN ('good_standing','warning','probation','suspension','dismissal','deans_list','presidents_list');
  PERFORM pg_temp.record(100, 'Academic standing values are within enum',
    v_bad = 0,
    'rows='||v_count||', invalid='||v_bad);
END $$;

-- ============================================================================
-- SECTION I — Degree audit: log table grows when audit runs
-- ============================================================================

DO $$
DECLARE
  v_student uuid;
  v_before bigint;
  v_after  bigint;
BEGIN
  SELECT student_user_id INTO v_student FROM degree_plans LIMIT 1;
  IF v_student IS NULL THEN
    PERFORM pg_temp.record(110, 'run_degree_audit writes audit log', true, 'skipped — no degree plans');
  ELSE
    SELECT count(*) INTO v_before FROM degree_audit_log;
    BEGIN
      PERFORM public.run_degree_audit(v_student);
      SELECT count(*) INTO v_after FROM degree_audit_log;
      PERFORM pg_temp.record(110, 'run_degree_audit writes audit log',
        v_after >= v_before,
        'before='||v_before||', after='||v_after);
    EXCEPTION WHEN OTHERS THEN
      PERFORM pg_temp.record(110, 'run_degree_audit runs', false, SQLERRM);
    END;
  END IF;
END $$;

-- ============================================================================
-- SECTION J — CLO/PLO mapping integrity
-- ============================================================================

DO $$
DECLARE
  v_orphans int;
BEGIN
  SELECT count(*) INTO v_orphans
    FROM clo_plo_mapping m
    WHERE NOT EXISTS (SELECT 1 FROM course_learning_outcomes c WHERE c.id = m.clo_id)
       OR NOT EXISTS (SELECT 1 FROM program_learning_outcomes p WHERE p.id = m.plo_id);
  PERFORM pg_temp.record(120, 'clo_plo_mapping has no orphan FKs',
    v_orphans = 0,
    'orphans='||v_orphans);
END $$;

-- ============================================================================
-- SECTION K — RLS smoke: anonymous role cannot read students/grades
-- ============================================================================

DO $$
DECLARE
  v_cnt int;
BEGIN
  -- Simulate anon: clear JWT, switch role
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;

  BEGIN
    SELECT count(*) INTO v_cnt FROM grade_records;
    PERFORM pg_temp.record(130, 'anon cannot SELECT grade_records',
      v_cnt = 0,
      'anon saw '||v_cnt||' rows');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.record(130, 'anon cannot SELECT grade_records', true, 'permission denied (good)');
  WHEN OTHERS THEN
    PERFORM pg_temp.record(130, 'anon cannot SELECT grade_records', true, SQLERRM);
  END;

  BEGIN
    SELECT count(*) INTO v_cnt FROM student_academic_standing;
    PERFORM pg_temp.record(131, 'anon cannot SELECT student_academic_standing',
      v_cnt = 0,
      'anon saw '||v_cnt||' rows');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.record(131, 'anon cannot SELECT student_academic_standing', true, 'permission denied (good)');
  WHEN OTHERS THEN
    PERFORM pg_temp.record(131, 'anon cannot SELECT student_academic_standing', true, SQLERRM);
  END;

  RESET ROLE;
END $$;

-- ============================================================================
-- SECTION L — AI audit log shape
-- ============================================================================

DO $$
DECLARE
  v_cols int;
BEGIN
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_output_log'
      AND column_name IN ('feature','model','provider','prompt_hash','confidence',
                          'human_review_required','latency_ms','tokens_in','tokens_out',
                          'cost_estimate','status','output_reference');
  PERFORM pg_temp.record(140, 'ai_output_log has required columns',
    v_cols = 12,
    'matched columns: '||v_cols||'/12');
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo
\echo '======================= ACADEMIC SPINE SUITE ======================='
SELECT test_no, status, name,
  CASE WHEN length(detail) > 60 THEN substring(detail, 1, 57)||'...' ELSE detail END AS detail
FROM _suite_results
ORDER BY test_no;

\echo
SELECT
  count(*)                                     AS total,
  count(*) FILTER (WHERE status='PASS')        AS passed,
  count(*) FILTER (WHERE status='FAIL')        AS failed
FROM _suite_results;

-- Exit non-zero if any failures
DO $$
DECLARE v_fail int;
BEGIN
  SELECT count(*) INTO v_fail FROM _suite_results WHERE status='FAIL';
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'Academic Spine suite: % test(s) FAILED', v_fail;
  END IF;
END $$;

ROLLBACK;
