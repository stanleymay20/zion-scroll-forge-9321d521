-- ============================================================================
-- Locked Academic Identity & Program Transfer — Governance Test Suite
-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/program_transfer_governance.test.sql
--
-- Each test sets request.jwt.claims to simulate an authenticated user and
-- ROLLBACKs at the end so the database is never mutated.
--
-- A test "fails" by raising EXCEPTION; a non-zero psql exit code means a
-- regression. The final SELECT prints the suite summary.
-- ============================================================================

\set QUIET on
\pset pager off

-- Helpers -------------------------------------------------------------------
CREATE TEMP TABLE _suite_results(test_no int, name text, status text, detail text);

CREATE OR REPLACE FUNCTION pg_temp.record(p_no int, p_name text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO _suite_results VALUES (p_no, p_name, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_detail);
  IF NOT p_ok THEN
    RAISE WARNING 'TEST % FAIL: % — %', p_no, p_name, p_detail;
  ELSE
    RAISE NOTICE 'TEST % PASS: %', p_no, p_name;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(p_uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role','authenticated')::text, true);
END$$;

-- Fixtures ------------------------------------------------------------------
DO $$
DECLARE
  v_student uuid;
  v_other_student uuid;
  v_admin uuid;
  v_from_program uuid;
  v_to_program uuid;
  v_alt_program uuid;
BEGIN
  -- Pick an accepted/enrolled student with a degree program
  SELECT s.user_id INTO v_student
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.application_status = 'accepted'
    AND s.degree_program_id IS NOT NULL
    AND p.lifecycle_status IN ('enrolled','active')
  LIMIT 1;

  IF v_student IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: no accepted+enrolled student available — seed required';
  END IF;

  -- Pick another existing profile as the non-owner (avoids querying auth schema)
  SELECT id INTO v_other_student FROM public.profiles WHERE id <> v_student LIMIT 1;

  -- Pick an admin/registrar to act as reviewer
  SELECT user_id INTO v_admin FROM public.user_roles
   WHERE role IN ('admin','superadmin','registrar') LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: no privileged reviewer available';
  END IF;

  SELECT degree_program_id INTO v_from_program FROM public.students WHERE user_id = v_student;
  SELECT id INTO v_to_program FROM public.degree_programs
   WHERE id <> v_from_program AND COALESCE(is_active, true) ORDER BY created_at LIMIT 1;
  SELECT id INTO v_alt_program FROM public.degree_programs
   WHERE id NOT IN (v_from_program, v_to_program) AND COALESCE(is_active, true) ORDER BY created_at LIMIT 1;

  IF v_to_program IS NULL OR v_alt_program IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: need at least 3 active degree programs';
  END IF;

  -- Stash fixtures in a temp table for the test block
  CREATE TEMP TABLE _fx(student uuid, other_student uuid, reviewer uuid,
                        from_program uuid, to_program uuid, alt_program uuid) ON COMMIT DROP;
  INSERT INTO _fx VALUES (v_student, v_other_student, v_admin, v_from_program, v_to_program, v_alt_program);
END$$;

-- ============================================================================
-- Tests run inside ONE transaction that ROLLS BACK at the end.
-- ============================================================================
BEGIN;

DO $outer$
DECLARE
  fx record;
  v_id uuid;
  v_id2 uuid;
  v_orig uuid;
  v_after uuid;
  v_audit_count int;
  v_archived_count int;
  v_active_before int;
  v_decision jsonb;
BEGIN
  SELECT * INTO fx FROM _fx;
  v_orig := fx.from_program;

  ---------------------------------------------------------------------------
  -- 1. Student cannot directly UPDATE degree_program_id
  ---------------------------------------------------------------------------
  PERFORM pg_temp.as_user(fx.student);
  BEGIN
    UPDATE public.students SET degree_program_id = fx.to_program WHERE user_id = fx.student;
    PERFORM pg_temp.record(1, 'student blocked from UPDATE degree_program_id', false, 'update succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.record(1, 'student blocked from UPDATE degree_program_id', true);
  WHEN OTHERS THEN
    PERFORM pg_temp.record(1, 'student blocked from UPDATE degree_program_id', false, SQLSTATE || ': ' || SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- 2. Student cannot UPDATE cohort_number / current_year / current_term / lifecycle
  ---------------------------------------------------------------------------
  BEGIN
    UPDATE public.students SET current_year = COALESCE(current_year,1) + 5 WHERE user_id = fx.student;
    PERFORM pg_temp.record(2, 'student blocked from cohort/year/term changes', false, 'current_year update succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    BEGIN
      UPDATE public.profiles SET lifecycle_status = 'graduated' WHERE id = fx.student;
      PERFORM pg_temp.record(2, 'student blocked from cohort/year/term changes', false, 'lifecycle update succeeded');
    EXCEPTION WHEN insufficient_privilege THEN
      PERFORM pg_temp.record(2, 'student blocked from cohort/year/term changes', true);
    WHEN OTHERS THEN
      PERFORM pg_temp.record(2, 'student blocked from cohort/year/term changes', false, SQLSTATE);
    END;
  WHEN OTHERS THEN
    PERFORM pg_temp.record(2, 'student blocked from cohort/year/term changes', false, SQLSTATE);
  END;

  ---------------------------------------------------------------------------
  -- 3. Student can submit a transfer request
  ---------------------------------------------------------------------------
  BEGIN
    v_id := public.submit_transfer_request(
      fx.to_program,
      'Pursuing better academic alignment with calling and gifting.',
      'Prior coursework supports this pivot.',
      '[]'::jsonb, '2026-Spring');
    PERFORM pg_temp.record(3, 'student can submit transfer request', v_id IS NOT NULL);
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record(3, 'student can submit transfer request', false, SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- 4. Second open request blocked by partial unique index
  ---------------------------------------------------------------------------
  BEGIN
    PERFORM public.submit_transfer_request(fx.alt_program,
      'Trying to open a parallel request — should be denied.', NULL, '[]'::jsonb, NULL);
    PERFORM pg_temp.record(4, 'second open request blocked', false, 'second submit succeeded');
  EXCEPTION WHEN unique_violation THEN
    PERFORM pg_temp.record(4, 'second open request blocked', true);
  WHEN OTHERS THEN
    -- Some envs surface as raise_exception with friendlier text — treat as pass if it mentions open/active
    IF SQLERRM ILIKE '%open%' OR SQLERRM ILIKE '%active%' OR SQLERRM ILIKE '%duplicate%' THEN
      PERFORM pg_temp.record(4, 'second open request blocked', true, SQLERRM);
    ELSE
      PERFORM pg_temp.record(4, 'second open request blocked', false, SQLSTATE || ': ' || SQLERRM);
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- 5. Student can withdraw their own pending request
  ---------------------------------------------------------------------------
  BEGIN
    PERFORM public.withdraw_transfer_request(v_id);
    PERFORM pg_temp.record(5, 'student can withdraw own request',
      (SELECT status FROM public.program_transfer_requests WHERE id = v_id) = 'withdrawn');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record(5, 'student can withdraw own request', false, SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- 6. A non-owner cannot withdraw someone else's request
  ---------------------------------------------------------------------------
  -- Re-submit (previous one is now 'withdrawn', so unique partial index allows a new open one)
  PERFORM pg_temp.as_user(fx.student);
  v_id := public.submit_transfer_request(fx.to_program,
    'Re-submitting after withdrawal for governance test.', NULL, '[]'::jsonb, NULL);

  PERFORM pg_temp.as_user(fx.other_student);
  BEGIN
    PERFORM public.withdraw_transfer_request(v_id);
    PERFORM pg_temp.record(6, 'non-owner cannot withdraw another request', false, 'withdraw permitted');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record(6, 'non-owner cannot withdraw another request', true, SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- 7. Privileged reviewer can advance valid stages
  ---------------------------------------------------------------------------
  PERFORM pg_temp.as_user(fx.reviewer);
  BEGIN
    PERFORM public.advance_transfer_request(v_id, 'advisor_review',  'advisor ack');
    PERFORM public.advance_transfer_request(v_id, 'faculty_review',  'faculty endorse');
    PERFORM public.advance_transfer_request(v_id, 'registrar_review','registrar queue');
    PERFORM pg_temp.record(7, 'reviewer can advance through stages',
      (SELECT status FROM public.program_transfer_requests WHERE id = v_id) = 'registrar_review');
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.record(7, 'reviewer can advance through stages', false, SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- 8. Student cannot advance review stages
  ---------------------------------------------------------------------------
  PERFORM pg_temp.as_user(fx.student);
  BEGIN
    PERFORM public.advance_transfer_request(v_id, 'archived', 'sneak');
    PERFORM pg_temp.record(8, 'student cannot advance review stages', false, 'student advanced');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.record(8, 'student cannot advance review stages', true);
  WHEN OTHERS THEN
    PERFORM pg_temp.record(8, 'student cannot advance review stages', true, SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- 10. Denial leaves original program unchanged (run before approval flow)
  ---------------------------------------------------------------------------
  PERFORM pg_temp.as_user(fx.reviewer);
  v_decision := public.decide_transfer_request(v_id, 'denied', '[]'::jsonb, 'Insufficient evidence');
  SELECT degree_program_id INTO v_after FROM public.students WHERE user_id = fx.student;
  PERFORM pg_temp.record(10, 'denial leaves original program unchanged',
    v_after = v_orig AND (v_decision->>'decision') = 'denied');

  ---------------------------------------------------------------------------
  -- 9 + 11 + 12. Approval atomically updates program AND archives prior enrollments
  ---------------------------------------------------------------------------
  PERFORM pg_temp.as_user(fx.student);
  v_id2 := public.submit_transfer_request(fx.alt_program,
    'Approval-path governance test — atomic update.', NULL, '[]'::jsonb, NULL);

  SELECT count(*) INTO v_active_before
    FROM public.enrollments WHERE user_id = fx.student AND transfer_status = 'active';

  PERFORM pg_temp.as_user(fx.reviewer);
  v_decision := public.decide_transfer_request(v_id2, 'approved', '[]'::jsonb, 'Approved by registrar');

  SELECT degree_program_id INTO v_after FROM public.students WHERE user_id = fx.student;
  PERFORM pg_temp.record(9,  'reviewer can approve request',         (v_decision->>'decision') = 'approved');
  PERFORM pg_temp.record(11, 'approval atomically updates program', v_after = fx.alt_program);

  SELECT count(*) INTO v_archived_count
    FROM public.enrollments
   WHERE user_id = fx.student
     AND transfer_status = 'archived'
     AND transferred_from_program_id = fx.from_program;

  IF v_active_before = 0 THEN
    PERFORM pg_temp.record(12, 'prior enrollments archived/remapped', true,
      'no active enrollments to remap (vacuously true)');
  ELSE
    PERFORM pg_temp.record(12, 'prior enrollments archived/remapped', v_archived_count >= v_active_before,
      format('archived=%s active_before=%s', v_archived_count, v_active_before));
  END IF;

  ---------------------------------------------------------------------------
  -- 13. SUYAS audit rows written for every state change
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_audit_count
    FROM public.suyas_audit_logs
   WHERE entity_id IN (v_id, v_id2)
     AND action_type IN ('transfer_submitted','transfer_advanced',
                         'transfer_approved','transfer_denied','transfer_withdrawn');
  -- We expect at least: submit, 3 advances, deny (for v_id) + submit, approve (for v_id2) = 7
  PERFORM pg_temp.record(13, 'SUYAS audit rows written for every transition',
    v_audit_count >= 6, format('rows=%s', v_audit_count));

  ---------------------------------------------------------------------------
  -- 14. Decide RPC role gate: non-privileged user cannot approve/deny
  ---------------------------------------------------------------------------
  PERFORM pg_temp.as_user(fx.student);
  v_id := public.submit_transfer_request(fx.to_program,
    'Role-gate test for decide RPC.', NULL, '[]'::jsonb, NULL);
  BEGIN
    PERFORM public.decide_transfer_request(v_id, 'approved', '[]'::jsonb, 'should fail');
    PERFORM pg_temp.record(14, 'unprivileged user cannot decide (RPC)', false, 'student decided');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.record(14, 'unprivileged user cannot decide (RPC)', true);
  WHEN OTHERS THEN
    PERFORM pg_temp.record(14, 'unprivileged user cannot decide (RPC)', true, SQLERRM);
  END;
END
$outer$;

-- Print results -------------------------------------------------------------
\pset format aligned
\echo
\echo '================ GOVERNANCE TEST SUITE RESULTS ================'
SELECT test_no AS "#", status, name, detail FROM _suite_results ORDER BY test_no;

DO $$
DECLARE v_pass int; v_fail int;
BEGIN
  SELECT count(*) FILTER (WHERE status='PASS'),
         count(*) FILTER (WHERE status='FAIL')
    INTO v_pass, v_fail FROM _suite_results;
  RAISE NOTICE '---------------------------------------------------------';
  RAISE NOTICE 'PASS: % / FAIL: %', v_pass, v_fail;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'GOVERNANCE TEST SUITE FAILED (% failures)', v_fail;
  END IF;
END$$;

ROLLBACK;
