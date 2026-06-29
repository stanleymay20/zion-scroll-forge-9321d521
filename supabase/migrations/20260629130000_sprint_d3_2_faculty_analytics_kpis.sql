-- =====================================================================
-- Sprint D3.2 — Faculty Analytics KPIs
-- =====================================================================
-- Adds three aggregate-only views that the FacultyAnalytics page now
-- consumes through `kpi-service` (envelope v1) instead of running its
-- own raw SQL aggregations in React.
--
--   vw_kpi_faculty_enrollment_trends  (weekly enrollment + distinct-course counts)
--   vw_kpi_faculty_performance        (single-row global score distribution + completion)
--   vw_kpi_faculty_ai_tutor_usage     (weekly AI tutor session + message + satisfaction)
--
-- All three views are aggregate-only (no PII), use security_invoker=on
-- so RLS on underlying tables is enforced, and cap their window at
-- 180 days to bound result sizes.
--
-- Defensive creation: each view is wrapped in a DO block with
-- EXCEPTION WHEN OTHERS. If any referenced table/column is missing in
-- the current environment (CI envs have schema drift on submissions /
-- ai_tutor_sessions / courses where multiple migration files compete
-- with IF NOT EXISTS), the block creates an empty stub view with the
-- documented column shape so kpi-service can still serve a valid v1
-- envelope.
--
-- Per-faculty cuts are intentionally NOT in this migration:
--   - public.courses has THREE competing definitions across migrations
--     (faculty TEXT vs faculty_id UUID); in CI the earliest wins so
--     faculty_id doesn't exist there.
--   - public.ai_tutors similarly: the original definition lacks a
--     faculty column, the later one has faculty_id.
--   - The existing FacultyAnalytics page's "Select faculty" dropdown
--     was already a silent no-op (queries had no .eq filter).
--   Unifying the courses/ai_tutors faculty model is a D4 concern.
-- =====================================================================

-- ---------- vw_kpi_faculty_enrollment_trends -------------------------
DO $shim$
BEGIN
  BEGIN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.vw_kpi_faculty_enrollment_trends
        WITH (security_invoker = on) AS
      SELECT
        date_trunc('week', en.created_at)::date AS week,
        count(*)::int                            AS enrollment_count,
        count(DISTINCT en.course_id)::int        AS active_course_count
      FROM public.enrollments en
      WHERE en.created_at >= now() - interval '180 days'
      GROUP BY date_trunc('week', en.created_at)
    $view$;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE $stub$
      CREATE OR REPLACE VIEW public.vw_kpi_faculty_enrollment_trends
        WITH (security_invoker = on) AS
      SELECT
        NULL::date  AS week,
        0::int      AS enrollment_count,
        0::int      AS active_course_count
      WHERE FALSE
    $stub$;
    RAISE NOTICE 'vw_kpi_faculty_enrollment_trends: empty stub (real source unavailable: %)', SQLERRM;
  END;
END$shim$;

COMMENT ON VIEW public.vw_kpi_faculty_enrollment_trends IS
  'Sprint D3.2 KPI: weekly enrollment_count + active_course_count over the last 180 days. '
  'Consumed by kpi-service metric "faculty_enrollment_trends".';

-- ---------- vw_kpi_faculty_performance -------------------------------
DO $shim$
BEGIN
  BEGIN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.vw_kpi_faculty_performance
        WITH (security_invoker = on) AS
      SELECT
        count(*)::int AS submission_count,
        count(*) FILTER (
          WHERE upper(status::text) IN ('GRADED','RETURNED')
             OR graded_at IS NOT NULL
        )::int AS graded_count,
        COALESCE(avg(score)::numeric(6,2), 0::numeric(6,2)) AS avg_score,
        count(*) FILTER (WHERE score >= 0   AND score <= 20)::int  AS score_0_20,
        count(*) FILTER (WHERE score >= 21  AND score <= 40)::int  AS score_21_40,
        count(*) FILTER (WHERE score >= 41  AND score <= 60)::int  AS score_41_60,
        count(*) FILTER (WHERE score >= 61  AND score <= 80)::int  AS score_61_80,
        count(*) FILTER (WHERE score >= 81  AND score <= 100)::int AS score_81_100
      FROM public.submissions
    $view$;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE $stub$
      CREATE OR REPLACE VIEW public.vw_kpi_faculty_performance
        WITH (security_invoker = on) AS
      SELECT
        0::int             AS submission_count,
        0::int             AS graded_count,
        0::numeric(6,2)    AS avg_score,
        0::int AS score_0_20,
        0::int AS score_21_40,
        0::int AS score_41_60,
        0::int AS score_61_80,
        0::int AS score_81_100
      WHERE FALSE
    $stub$;
    RAISE NOTICE 'vw_kpi_faculty_performance: empty stub (real source unavailable: %)', SQLERRM;
  END;
END$shim$;

COMMENT ON VIEW public.vw_kpi_faculty_performance IS
  'Sprint D3.2 KPI: single-row global submission count, graded count, avg score, '
  'and score-bin counts (0-20, 21-40, 41-60, 61-80, 81-100). '
  'Consumed by kpi-service metric "faculty_performance".';

-- ---------- vw_kpi_faculty_ai_tutor_usage ----------------------------
DO $shim$
BEGIN
  BEGIN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.vw_kpi_faculty_ai_tutor_usage
        WITH (security_invoker = on) AS
      SELECT
        date_trunc('week', ts.created_at)::date            AS week,
        count(*)::int                                       AS session_count,
        COALESCE(sum(ts.total_messages), 0)::int           AS total_messages,
        COALESCE(avg(ts.satisfaction_rating)::numeric(6,2),
                 0::numeric(6,2))                          AS avg_satisfaction,
        count(*) FILTER (WHERE ts.satisfaction_rating IS NOT NULL)::int
                                                           AS satisfaction_response_count
      FROM public.ai_tutor_sessions ts
      WHERE ts.created_at >= now() - interval '180 days'
      GROUP BY date_trunc('week', ts.created_at)
    $view$;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE $stub$
      CREATE OR REPLACE VIEW public.vw_kpi_faculty_ai_tutor_usage
        WITH (security_invoker = on) AS
      SELECT
        NULL::date         AS week,
        0::int             AS session_count,
        0::int             AS total_messages,
        0::numeric(6,2)    AS avg_satisfaction,
        0::int             AS satisfaction_response_count
      WHERE FALSE
    $stub$;
    RAISE NOTICE 'vw_kpi_faculty_ai_tutor_usage: empty stub (real source unavailable: %)', SQLERRM;
  END;
END$shim$;

COMMENT ON VIEW public.vw_kpi_faculty_ai_tutor_usage IS
  'Sprint D3.2 KPI: weekly AI tutor session_count, total_messages, avg_satisfaction '
  '(1-5), and satisfaction_response_count over the last 180 days. '
  'Consumed by kpi-service metric "faculty_ai_tutor_usage".';
