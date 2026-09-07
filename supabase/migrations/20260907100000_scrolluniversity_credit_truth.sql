-- ScrollUniversity academic-credit truth boundary.
-- Internal workload planning may benchmark study hours against external conventions,
-- but it must not be represented as awarded or transferable ECTS / US / UK credit
-- without an explicit authorized basis.

ALTER TABLE public.transcript_equivalency_rules
  ADD COLUMN IF NOT EXISTS formally_authorized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authority_basis text;

-- Historical bootstrap data expressed numeric external-credit equivalencies without
-- an authorized awarding/transfer basis. Remove those claims from the effective state.
DELETE FROM public.transcript_equivalency_rules
WHERE source_system = 'SCROLL_CREDIT'
  AND target_system IN ('ECTS', 'US_SEMESTER_HOUR', 'UK_CATS')
  AND formally_authorized = false;

-- Prevent the same unsupported claim from being reintroduced. A future formal
-- articulation/transfer agreement can populate this table only with an explicit basis.
DO $$ BEGIN
  ALTER TABLE public.transcript_equivalency_rules
    ADD CONSTRAINT transcript_external_credit_requires_authority
    CHECK (
      target_system NOT IN ('ECTS', 'US_SEMESTER_HOUR', 'UK_CATS')
      OR (
        formally_authorized = true
        AND authority_basis IS NOT NULL
        AND length(btrim(authority_basis)) >= 10
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.transcript_equivalency_rules IS
  'Formal transcript/transfer equivalencies only. External academic-credit mappings require an explicit authorized basis; workload benchmarking belongs in academic_workload_benchmarks.';

CREATE TABLE IF NOT EXISTS public.academic_workload_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_code text NOT NULL UNIQUE,
  external_framework text NOT NULL,
  hours_per_internal_unit_min numeric NOT NULL CHECK (hours_per_internal_unit_min > 0),
  hours_per_internal_unit_max numeric NOT NULL CHECK (hours_per_internal_unit_max >= hours_per_internal_unit_min),
  award_status text NOT NULL DEFAULT 'workload_planning_only'
    CHECK (award_status IN ('workload_planning_only', 'formally_authorized_credit')),
  transferable_credit boolean NOT NULL DEFAULT false,
  authority_basis text,
  notes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workload_transfer_requires_authority CHECK (
    transferable_credit = false
    OR (
      award_status = 'formally_authorized_credit'
      AND authority_basis IS NOT NULL
      AND length(btrim(authority_basis)) >= 10
    )
  )
);

ALTER TABLE public.academic_workload_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read workload benchmarks" ON public.academic_workload_benchmarks;
CREATE POLICY "Public read workload benchmarks"
  ON public.academic_workload_benchmarks
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage workload benchmarks" ON public.academic_workload_benchmarks;
CREATE POLICY "Admin manage workload benchmarks"
  ON public.academic_workload_benchmarks
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'superadmin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'superadmin')
  );

INSERT INTO public.academic_workload_benchmarks (
  benchmark_code,
  external_framework,
  hours_per_internal_unit_min,
  hours_per_internal_unit_max,
  award_status,
  transferable_credit,
  authority_basis,
  notes
) VALUES (
  'SCROLL_WORKLOAD_ECTS_CONVENTION',
  'ECTS workload convention',
  25,
  30,
  'workload_planning_only',
  false,
  NULL,
  'Used only to estimate learner workload. ScrollUniversity does not represent this benchmark as awarded ECTS, a formal ECTS equivalency, or transferable academic credit unless an authorized agreement is recorded separately.'
)
ON CONFLICT (benchmark_code) DO UPDATE SET
  external_framework = EXCLUDED.external_framework,
  hours_per_internal_unit_min = EXCLUDED.hours_per_internal_unit_min,
  hours_per_internal_unit_max = EXCLUDED.hours_per_internal_unit_max,
  award_status = EXCLUDED.award_status,
  transferable_credit = EXCLUDED.transferable_credit,
  authority_basis = EXCLUDED.authority_basis,
  notes = EXCLUDED.notes,
  updated_at = now();

GRANT SELECT ON public.academic_workload_benchmarks TO anon, authenticated;
