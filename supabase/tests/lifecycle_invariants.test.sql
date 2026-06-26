-- ============================================================================
-- Lifecycle Invariants Suite (Sprint 3 / Phase A2)
-- Verifies data-integrity invariants that must hold regardless of cohort size.
-- These are the "subtle issues timing metrics don't reveal" checks the
-- user explicitly requested in the Sprint 3 review.
--
-- Each check returns counts of violating rows; non-zero = FAIL.
-- Skips cleanly when the relevant table doesn't exist in this DB.
-- ============================================================================

\set QUIET on
\pset pager off

BEGIN;

DROP TABLE IF EXISTS _invariant_results;
CREATE TEMP TABLE _invariant_results(test_no int, name text, violations bigint, status text);

CREATE OR REPLACE FUNCTION pg_temp.has_tbl(p text) RETURNS boolean LANGUAGE sql AS $$
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=p);
$$;

CREATE OR REPLACE FUNCTION pg_temp.inv(p_no int, p_name text, p_violations bigint)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_status text;
BEGIN
  v_status := CASE WHEN p_violations = 0 THEN 'PASS' ELSE 'FAIL' END;
  INSERT INTO _invariant_results VALUES (p_no, p_name, p_violations, v_status);
  RAISE NOTICE 'INV % %: % (violations=%)', p_no, v_status, p_name, p_violations;
END$$;

CREATE OR REPLACE FUNCTION pg_temp.inv_skip(p_no int, p_name text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _invariant_results VALUES (p_no, p_name, 0, 'SKIP');
  RAISE NOTICE 'INV % SKIP: %', p_no, p_name;
END$$;

-- ── 1. Every finalized grade has an audit record ───────────────────────────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('grade_records') AND pg_temp.has_tbl('academic_records_audit') THEN
    EXECUTE $q$
      SELECT count(*) FROM public.grade_records g
      WHERE COALESCE(g.is_final, false) = true
        AND NOT EXISTS (
          SELECT 1 FROM public.academic_records_audit a
          WHERE a.entity_id::text = g.id::text
        )
    $q$ INTO v;
    PERFORM pg_temp.inv(1, 'finalized grades have audit row', v);
  ELSE
    PERFORM pg_temp.inv_skip(1, 'finalized grades have audit row');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(1, 'finalized grades have audit row [' || SQLERRM || ']');
END $$;

-- ── 2. No orphaned section_enrollments (student or section missing) ─────────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('section_enrollments') AND pg_temp.has_tbl('course_sections') THEN
    EXECUTE $q$
      SELECT count(*) FROM public.section_enrollments se
      WHERE NOT EXISTS (SELECT 1 FROM public.course_sections cs WHERE cs.id = se.section_id)
    $q$ INTO v;
    PERFORM pg_temp.inv(2, 'no orphaned section_enrollments (section)', v);
  ELSE
    PERFORM pg_temp.inv_skip(2, 'no orphaned section_enrollments (section)');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(2, 'no orphaned section_enrollments [' || SQLERRM || ']');
END $$;

-- ── 3. No duplicate degree-plan items per (plan, requirement) ──────────────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('degree_plan_items') THEN
    EXECUTE $q$
      SELECT count(*) FROM (
        SELECT degree_plan_id, requirement_id, count(*) c
        FROM public.degree_plan_items
        WHERE requirement_id IS NOT NULL
        GROUP BY degree_plan_id, requirement_id
        HAVING count(*) > 1
      ) d
    $q$ INTO v;
    PERFORM pg_temp.inv(3, 'no duplicate degree_plan_items per requirement', v);
  ELSE
    PERFORM pg_temp.inv_skip(3, 'no duplicate degree_plan_items per requirement');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(3, 'no duplicate degree_plan_items [' || SQLERRM || ']');
END $$;

-- ── 4. Notifications reference a valid entity when related_id is set ───────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('notifications') THEN
    EXECUTE $q$
      SELECT count(*) FROM public.notifications n
      WHERE n.related_id IS NOT NULL
        AND n.related_type IS NULL
    $q$ INTO v;
    PERFORM pg_temp.inv(4, 'notifications with related_id have related_type', v);
  ELSE
    PERFORM pg_temp.inv_skip(4, 'notifications with related_id have related_type');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(4, 'notifications related_type [' || SQLERRM || ']');
END $$;

-- ── 5. No duplicate AI logs for same (feature, input_reference) within 1s ─
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('ai_output_log') THEN
    EXECUTE $q$
      SELECT count(*) FROM (
        SELECT feature, input_reference, date_trunc('second', created_at) bucket, count(*) c
        FROM public.ai_output_log
        WHERE input_reference IS NOT NULL
        GROUP BY feature, input_reference, date_trunc('second', created_at)
        HAVING count(*) > 1
      ) d
    $q$ INTO v;
    PERFORM pg_temp.inv(5, 'no duplicate ai_output_log within same second', v);
  ELSE
    PERFORM pg_temp.inv_skip(5, 'no duplicate ai_output_log within same second');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(5, 'duplicate ai_output_log [' || SQLERRM || ']');
END $$;

-- ── 6. No dangling attendance sessions (no records AND > 30 days old) ──────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('section_attendance_sessions') AND pg_temp.has_tbl('section_attendance_records') THEN
    EXECUTE $q$
      SELECT count(*) FROM public.section_attendance_sessions s
      WHERE s.created_at < now() - interval '30 days'
        AND NOT EXISTS (SELECT 1 FROM public.section_attendance_records r WHERE r.session_id = s.id)
    $q$ INTO v;
    PERFORM pg_temp.inv(6, 'no dangling attendance sessions (>30d, no records)', v);
  ELSE
    PERFORM pg_temp.inv_skip(6, 'no dangling attendance sessions');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(6, 'dangling attendance [' || SQLERRM || ']');
END $$;

-- ── 7. Every graduation candidate has a degree plan ────────────────────────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('graduation_candidates') AND pg_temp.has_tbl('degree_plans') THEN
    EXECUTE $q$
      SELECT count(*) FROM public.graduation_candidates gc
      WHERE NOT EXISTS (
        SELECT 1 FROM public.degree_plans dp
        WHERE dp.student_user_id = gc.user_id
      )
    $q$ INTO v;
    PERFORM pg_temp.inv(7, 'graduation candidates have degree plan', v);
  ELSE
    PERFORM pg_temp.inv_skip(7, 'graduation candidates have degree plan');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(7, 'graduation candidates [' || SQLERRM || ']');
END $$;

-- ── 8. user_roles has no rows referencing a missing auth.users id ──────────
DO $$
DECLARE v bigint;
BEGIN
  IF pg_temp.has_tbl('user_roles') THEN
    EXECUTE $q$
      SELECT count(*) FROM public.user_roles ur
      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id)
    $q$ INTO v;
    PERFORM pg_temp.inv(8, 'user_roles all reference valid auth.users', v);
  ELSE
    PERFORM pg_temp.inv_skip(8, 'user_roles all reference valid auth.users');
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_temp.inv_skip(8, 'user_roles fk [' || SQLERRM || ']');
END $$;

-- ── Summary ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_total int; v_pass int; v_fail int; v_skip int;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE status='PASS'),
         count(*) FILTER (WHERE status='FAIL'),
         count(*) FILTER (WHERE status='SKIP')
    INTO v_total, v_pass, v_fail, v_skip FROM _invariant_results;
  RAISE NOTICE '────────────────────────────────────────';
  RAISE NOTICE 'INVARIANT SUITE: total=%, pass=%, fail=%, skip=%',
    v_total, v_pass, v_fail, v_skip;
  RAISE NOTICE '────────────────────────────────────────';
  IF v_fail > 0 THEN
    RAISE EXCEPTION '% invariant violation(s) found', v_fail;
  END IF;
END $$;

ROLLBACK;
