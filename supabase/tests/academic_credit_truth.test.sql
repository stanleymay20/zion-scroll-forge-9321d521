\set ON_ERROR_STOP on

DO $$
DECLARE
  unauthorized_count integer;
  benchmark_count integer;
BEGIN
  SELECT count(*)
  INTO unauthorized_count
  FROM public.transcript_equivalency_rules
  WHERE source_system = 'SCROLL_CREDIT'
    AND target_system IN ('ECTS', 'US_SEMESTER_HOUR', 'UK_CATS')
    AND (
      formally_authorized = false
      OR authority_basis IS NULL
      OR length(btrim(authority_basis)) < 10
    );

  IF unauthorized_count <> 0 THEN
    RAISE EXCEPTION 'Unsupported external academic-credit equivalencies remain: %', unauthorized_count;
  END IF;

  SELECT count(*)
  INTO benchmark_count
  FROM public.academic_workload_benchmarks
  WHERE benchmark_code = 'SCROLL_WORKLOAD_ECTS_CONVENTION'
    AND external_framework = 'ECTS workload convention'
    AND hours_per_internal_unit_min = 25
    AND hours_per_internal_unit_max = 30
    AND award_status = 'workload_planning_only'
    AND transferable_credit = false
    AND authority_basis IS NULL;

  IF benchmark_count <> 1 THEN
    RAISE EXCEPTION 'Expected one non-award ECTS workload benchmark; found %', benchmark_count;
  END IF;
END $$;

-- The database must reject a fresh unsupported external-credit mapping.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.transcript_equivalency_rules (
      source_system,
      target_system,
      conversion_factor,
      notes,
      formally_authorized,
      authority_basis
    ) VALUES (
      'SCROLL_CREDIT',
      'ECTS',
      1.0,
      'invalid test mapping',
      false,
      NULL
    );

    RAISE EXCEPTION 'Credit truth constraint failed open';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;
