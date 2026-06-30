
-- =====================================================================
-- Sprint D3.5 — Faculty Workload Planner
-- Six-dimensional load model + append-only proposal staging.
-- Read-and-plan only; no academic-engine writes.
-- =====================================================================

-- ---------- 0. D1 substrate compat (ops_log shim, defensive) ---------
DO $shim$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ops_log') THEN
    CREATE TABLE public.ops_log (
      id bigserial PRIMARY KEY,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      correlation_id uuid,
      source text NOT NULL, event text NOT NULL, severity text NOT NULL DEFAULT 'info',
      actor_id uuid, actor_role text, fingerprint text,
      duration_ms integer, http_status integer, message text,
      context jsonb NOT NULL DEFAULT '{}'::jsonb,
      trace_id uuid, span_id uuid
    );
  END IF;
END$shim$;

-- ---------- 1. Per-assignment grading-load override -------------------
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS grade_load_minutes_override integer;

-- ---------- 2. faculty_workload_policies ------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_workload_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL UNIQUE,
  description text,
  max_sections                       integer NOT NULL DEFAULT 4,
  max_credit_hours                   numeric(6,2) NOT NULL DEFAULT 12,
  max_distinct_preps                 integer NOT NULL DEFAULT 3,
  max_advisees                       integer NOT NULL DEFAULT 25,
  max_weekly_grading_minutes         integer NOT NULL DEFAULT 600,
  max_weekly_office_hours_minutes    integer NOT NULL DEFAULT 240,
  max_weekly_support_minutes         integer NOT NULL DEFAULT 300,
  max_ai_avatar_sessions_supervised  integer NOT NULL DEFAULT 20,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faculty_workload_policies TO authenticated;
GRANT ALL    ON public.faculty_workload_policies TO service_role;
ALTER TABLE public.faculty_workload_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workload_policies_read ON public.faculty_workload_policies;
CREATE POLICY workload_policies_read ON public.faculty_workload_policies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS workload_policies_admin_write ON public.faculty_workload_policies;
CREATE POLICY workload_policies_admin_write ON public.faculty_workload_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

INSERT INTO public.faculty_workload_policies (policy_code, description, is_default)
VALUES ('standard', 'Default workload caps for full-time faculty.', true)
ON CONFLICT (policy_code) DO NOTHING;

-- ---------- 3. faculty_workload_proposals -----------------------------
CREATE TABLE IF NOT EXISTS public.faculty_workload_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.course_sections(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('primary','co_instructor','ta')),
  proposed_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','accepted','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id),
  UNIQUE (faculty_user_id, section_id, role)
);

CREATE INDEX IF NOT EXISTS workload_proposals_fac_term_idx
  ON public.faculty_workload_proposals (faculty_user_id, term_id, status);

GRANT SELECT, INSERT, UPDATE ON public.faculty_workload_proposals TO authenticated;
GRANT ALL ON public.faculty_workload_proposals TO service_role;
ALTER TABLE public.faculty_workload_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workload_proposals_self_read ON public.faculty_workload_proposals;
CREATE POLICY workload_proposals_self_read ON public.faculty_workload_proposals
  FOR SELECT TO authenticated
  USING (faculty_user_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin')
         OR public.has_role(auth.uid(),'registrar'));

DROP POLICY IF EXISTS workload_proposals_self_write ON public.faculty_workload_proposals;
CREATE POLICY workload_proposals_self_write ON public.faculty_workload_proposals
  FOR INSERT TO authenticated
  WITH CHECK (faculty_user_id = auth.uid()
              OR public.has_role(auth.uid(),'admin')
              OR public.has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS workload_proposals_self_update ON public.faculty_workload_proposals;
CREATE POLICY workload_proposals_self_update ON public.faculty_workload_proposals
  FOR UPDATE TO authenticated
  USING (faculty_user_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'superadmin'));

-- ---------- 4. vw_faculty_workload_conflicts (advisory stub) ----------
-- Structured meeting times are not yet captured; conflicts compute from
-- exact meeting_info string equality within the same term. Returns
-- pairs (a,b) where the same faculty teaches two sections that share
-- a meeting_info string. Will be replaced by interval-overlap in D4
-- when meeting_pattern lands.
CREATE OR REPLACE VIEW public.vw_faculty_workload_conflicts AS
SELECT
  s1.instructor_user_id AS faculty_user_id,
  s1.term_label,
  s1.id AS section_a, s1.course_code AS course_a, s1.section_code AS section_code_a,
  s2.id AS section_b, s2.course_code AS course_b, s2.section_code AS section_code_b,
  s1.meeting_info
FROM public.course_sections s1
JOIN public.course_sections s2
  ON s1.instructor_user_id = s2.instructor_user_id
 AND s1.term_label = s2.term_label
 AND s1.meeting_info IS NOT NULL
 AND s1.meeting_info = s2.meeting_info
 AND s1.id < s2.id
WHERE s1.active AND s2.active AND s1.instructor_user_id IS NOT NULL;

GRANT SELECT ON public.vw_faculty_workload_conflicts TO authenticated, service_role;

-- ---------- 5. vw_faculty_workload_term (six-dimension aggregate) -----
CREATE OR REPLACE VIEW public.vw_faculty_workload_term AS
WITH
sections AS (
  SELECT
    cs.instructor_user_id AS faculty_user_id,
    cs.term_label,
    COUNT(*)::int                                     AS section_count,
    COALESCE(SUM(cs.credit_hours), 0)::numeric(8,2)   AS credit_hours,
    COUNT(DISTINCT cs.course_id)::int                 AS distinct_preps
  FROM public.course_sections cs
  WHERE cs.active AND cs.instructor_user_id IS NOT NULL
  GROUP BY cs.instructor_user_id, cs.term_label
),
grading AS (
  -- Estimated weekly grading minutes = roster_size × per-assignment minutes / weeks_in_term(~14)
  SELECT
    cs.instructor_user_id AS faculty_user_id,
    cs.term_label,
    COALESCE(SUM(
      COALESCE(a.grade_load_minutes_override, 8)
      * COALESCE(cs.enrolled_count, 0)
    ), 0)::int / 14 AS weekly_grading_minutes
  FROM public.course_sections cs
  LEFT JOIN public.assignments a
    ON a.section_id = cs.id AND a.published = true
  WHERE cs.active AND cs.instructor_user_id IS NOT NULL
  GROUP BY cs.instructor_user_id, cs.term_label
),
advisees AS (
  SELECT
    aa.advisor_user_id AS faculty_user_id,
    COUNT(*)::int                                            AS advisee_count,
    COUNT(*) FILTER (WHERE saf.status = 'open')::int * 15    AS weekly_support_minutes
  FROM public.advising_assignments aa
  LEFT JOIN public.student_advising_flags saf
    ON saf.student_user_id = aa.student_user_id
  WHERE aa.active = true
  GROUP BY aa.advisor_user_id
),
ai_oversight AS (
  SELECT
    ls.host_tutor_id AS faculty_user_id,
    COUNT(*)::int AS ai_avatar_sessions_supervised
  FROM public.lecture_sessions ls
  WHERE ls.host_tutor_id IS NOT NULL
    AND ls.started_at > now() - interval '90 days'
  GROUP BY ls.host_tutor_id
),
hrr AS (
  SELECT reviewer_id AS faculty_user_id,
         COUNT(*)::int AS open_human_review_requests
  FROM public.human_review_requests
  WHERE reviewer_id IS NOT NULL AND status IN ('pending','in_progress')
  GROUP BY reviewer_id
),
conflicts AS (
  SELECT faculty_user_id, term_label, COUNT(*)::int AS conflict_count
  FROM public.vw_faculty_workload_conflicts
  GROUP BY faculty_user_id, term_label
)
SELECT
  s.faculty_user_id,
  s.term_label,
  s.section_count,
  s.credit_hours,
  s.distinct_preps,
  COALESCE(g.weekly_grading_minutes, 0)               AS weekly_grading_minutes,
  0::int                                              AS weekly_office_hours_minutes,
  COALESCE(a.advisee_count, 0)                        AS advisee_count,
  COALESCE(a.weekly_support_minutes, 0)               AS weekly_support_minutes,
  COALESCE(ao.ai_avatar_sessions_supervised, 0)
    + COALESCE(h.open_human_review_requests, 0)       AS ai_avatar_sessions_supervised,
  COALESCE(c.conflict_count, 0)                       AS conflict_count
FROM sections s
LEFT JOIN grading      g  ON g.faculty_user_id  = s.faculty_user_id AND g.term_label = s.term_label
LEFT JOIN advisees     a  ON a.faculty_user_id  = s.faculty_user_id
LEFT JOIN ai_oversight ao ON ao.faculty_user_id = s.faculty_user_id
LEFT JOIN hrr          h  ON h.faculty_user_id  = s.faculty_user_id
LEFT JOIN conflicts    c  ON c.faculty_user_id  = s.faculty_user_id AND c.term_label = s.term_label;

COMMENT ON VIEW public.vw_faculty_workload_term IS
  'D3.5 six-dimension faculty load: teaching, grading, office-hours '
  '(stub until D3.3 substrate exposes faculty_user_id on slots), '
  'student support, AI avatar oversight, conflicts. Read-only; '
  'never written to by the academic engine.';

GRANT SELECT ON public.vw_faculty_workload_term TO authenticated, service_role;

-- ---------- 6. RPC: workload_propose_assignment -----------------------
CREATE OR REPLACE FUNCTION public.workload_propose_assignment(
  _section_id uuid, _role text DEFAULT 'primary', _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_term  uuid;
  v_id    uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF NOT (public.has_role(v_actor,'faculty')
          OR public.has_role(v_actor,'admin')
          OR public.has_role(v_actor,'superadmin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _role NOT IN ('primary','co_instructor','ta') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT term_id INTO v_term FROM public.course_sections WHERE id = _section_id;
  IF v_term IS NULL THEN RAISE EXCEPTION 'section_not_found_or_no_term'; END IF;

  INSERT INTO public.faculty_workload_proposals
    (faculty_user_id, term_id, section_id, role, proposed_by, notes)
  VALUES (v_actor, v_term, _section_id, _role, v_actor, _notes)
  ON CONFLICT (faculty_user_id, section_id, role)
  DO UPDATE SET notes = EXCLUDED.notes,
                status = CASE WHEN public.faculty_workload_proposals.status = 'rejected'
                              THEN 'draft' ELSE public.faculty_workload_proposals.status END
  RETURNING id INTO v_id;

  INSERT INTO public.ops_log (correlation_id, source, event, severity, actor_id, message, context)
  VALUES (gen_random_uuid(), 'rpc', 'workload.proposal_created', 'info', v_actor,
          format('Workload proposal %s for section %s (%s)', v_id, _section_id, _role),
          jsonb_build_object('proposal_id', v_id, 'section_id', _section_id, 'role', _role));

  RETURN v_id;
END$$;

GRANT EXECUTE ON FUNCTION public.workload_propose_assignment(uuid, text, text)
  TO authenticated, service_role;

-- ---------- 7. RPC: workload_submit_proposals -------------------------
CREATE OR REPLACE FUNCTION public.workload_submit_proposals(_term_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_corr  uuid := gen_random_uuid();
  v_count integer;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  UPDATE public.faculty_workload_proposals
     SET status = 'submitted'
   WHERE faculty_user_id = v_actor
     AND term_id = _term_id
     AND status = 'draft';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.ops_log (correlation_id, source, event, severity, actor_id, message, context)
  VALUES (v_corr, 'rpc', 'workload.proposals_submitted', 'info', v_actor,
          format('%s workload proposal(s) submitted for term %s', v_count, _term_id),
          jsonb_build_object('term_id', _term_id, 'count', v_count));

  RETURN v_count;
END$$;

GRANT EXECUTE ON FUNCTION public.workload_submit_proposals(uuid)
  TO authenticated, service_role;
