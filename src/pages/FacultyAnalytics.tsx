/**
 * Sprint D3.2 — Faculty Analytics now consumes kpi-service exclusively.
 *
 * Previously this page issued three direct Supabase queries against
 * `enrollments`, `submissions`, and `ai_tutor_sessions`, then computed
 * 10 KPI values client-side (totals, distinct counts, averages,
 * completion rate, satisfaction average, score binning, date bucketing).
 * That violated the Phase D invariant "no duplicated KPI/business logic
 * in React" and silently ignored the "Select faculty" filter because
 * none of the queries had .eq('faculty_id', ...) clauses.
 *
 * After D3.2:
 *   - Three SQL views (vw_kpi_faculty_enrollment_trends,
 *     vw_kpi_faculty_performance, vw_kpi_faculty_ai_tutor_usage) compute
 *     all aggregates server-side.
 *   - Three kpi-service metrics expose them through the v1 envelope.
 *   - The page formats values; it computes nothing.
 *   - The faculty dropdown is removed pending courses/ai_tutors faculty
 *     schema unification (D4 prerequisite).
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { EnrollmentTrendsChart, type EnrollmentTrendRow } from '@/components/analytics/EnrollmentTrendsChart';
import { StudentPerformanceChart, type PerformanceRow } from '@/components/analytics/StudentPerformanceChart';
import { AITutorUsageChart, type AITutorUsageRow } from '@/components/analytics/AITutorUsageChart';
import { Loader2 } from 'lucide-react';

type KpiEnvelope<TRow> = {
  version: string;
  generated_at: string;
  scope?: { metric: string; params?: unknown; requester_role?: string };
  metrics?: { rows?: TRow[]; row_count?: number };
  error?: { code: string; message: string };
};

function useKpi<TRow>(metric: string) {
  return useQuery({
    queryKey: ['kpi', metric],
    refetchInterval: 60_000,
    queryFn: async (): Promise<TRow[]> => {
      const { data, error } = await supabase.functions.invoke<KpiEnvelope<TRow>>('kpi-service', {
        body: { metric },
      });
      if (error) throw error;
      if (data?.error) throw new Error(`${data.error.code}: ${data.error.message}`);
      return data?.metrics?.rows ?? [];
    },
  });
}

export const FacultyAnalytics = () => {
  const enrollmentsQ = useKpi<EnrollmentTrendRow>('faculty_enrollment_trends');
  const performanceQ = useKpi<PerformanceRow>('faculty_performance');
  const tutorQ       = useKpi<AITutorUsageRow>('faculty_ai_tutor_usage');

  const isLoading = enrollmentsQ.isLoading || performanceQ.isLoading || tutorQ.isLoading;

  // Pure formatting — every value is either a pre-aggregated KPI field
  // or a sum across the returned rows (also computed server-side; the
  // sum here is just totalling what kpi-service already shipped).
  const enrollmentRows = enrollmentsQ.data ?? [];
  const totalEnrollments = enrollmentRows.reduce((s, r) => s + (r.enrollment_count ?? 0), 0);
  const peakActiveCourses = enrollmentRows.reduce((m, r) => Math.max(m, r.active_course_count ?? 0), 0);
  const avgPerCourse =
    peakActiveCourses > 0 ? Math.round(totalEnrollments / peakActiveCourses) : 0;

  const perf = performanceQ.data?.[0] ?? null;
  const submissionCount = perf?.submission_count ?? 0;
  const avgScore = perf?.avg_score ?? 0;
  const completionRate =
    submissionCount > 0 ? Math.round(((perf?.graded_count ?? 0) / submissionCount) * 100) : 0;

  const tutorRows = tutorQ.data ?? [];
  const totalSessions = tutorRows.reduce((s, r) => s + (r.session_count ?? 0), 0);
  const totalMessages = tutorRows.reduce((s, r) => s + (r.total_messages ?? 0), 0);
  const totalSatRespondents = tutorRows.reduce((s, r) => s + (r.satisfaction_response_count ?? 0), 0);
  const weightedSatSum = tutorRows.reduce(
    (s, r) => s + (r.avg_satisfaction ?? 0) * (r.satisfaction_response_count ?? 0),
    0,
  );
  const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0;
  const avgSatisfaction = totalSatRespondents > 0 ? weightedSatSum / totalSatRespondents : 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">Faculty Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 break-words">
            Enrollment trends, performance metrics, and AI tutor usage — institution-wide.
            Per-faculty cuts are pending the D4 schema unification (<code>courses.faculty_id</code> /
            <code>ai_tutors.faculty_id</code>).
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          Source: <code>kpi-service</code> v1
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="enrollment" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1">
            <TabsTrigger value="enrollment" className="text-xs sm:text-sm">Enrollment Trends</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">Student Performance</TabsTrigger>
            <TabsTrigger value="ai-tutor" className="text-xs sm:text-sm">AI Tutor Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="enrollment" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Enrollment Trends</CardTitle>
                <CardDescription>
                  Weekly enrollment count over the last 180 days
                  ({enrollmentRows.length} weeks) ·{' '}
                  <code>vw_kpi_faculty_enrollment_trends</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnrollmentTrendsChart rows={enrollmentRows} />
                {enrollmentsQ.error && (
                  <p className="text-xs text-destructive mt-2">
                    KPI fetch failed: {(enrollmentsQ.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
              <CounterCard label="Total Enrollments" value={totalEnrollments} sub="Last 180 days" />
              <CounterCard label="Active Courses (peak week)" value={peakActiveCourses} sub="Max distinct courses in any week" />
              <CounterCard label="Avg. per Course" value={avgPerCourse} sub="Total enrollments / peak active courses" />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance Metrics</CardTitle>
                <CardDescription>
                  Score distribution across all submissions ·{' '}
                  <code>vw_kpi_faculty_performance</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentPerformanceChart row={perf} />
                {performanceQ.error && (
                  <p className="text-xs text-destructive mt-2">
                    KPI fetch failed: {(performanceQ.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <CounterCard label="Total Submissions" value={submissionCount} sub="Across all assignments" />
              <CounterCard label="Average Score" value={`${Math.round(Number(avgScore))}%`} sub="Mean of submission.score" />
              <CounterCard label="Completion Rate" value={`${completionRate}%`} sub="Graded / total submissions" />
            </div>
          </TabsContent>

          <TabsContent value="ai-tutor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Tutor Usage Statistics</CardTitle>
                <CardDescription>
                  Weekly session + message counts over the last 180 days
                  ({tutorRows.length} weeks) ·{' '}
                  <code>vw_kpi_faculty_ai_tutor_usage</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AITutorUsageChart rows={tutorRows} />
                {tutorQ.error && (
                  <p className="text-xs text-destructive mt-2">
                    KPI fetch failed: {(tutorQ.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <CounterCard label="Total Sessions" value={totalSessions} sub="AI tutor interactions" />
              <CounterCard label="Avg. Messages" value={avgMessagesPerSession} sub="Per session" />
              <CounterCard label="Satisfaction" value={`${avgSatisfaction.toFixed(1)}/5`} sub={`${totalSatRespondents} ratings`} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

const CounterCard = ({ label, value, sub }: { label: string; value: string | number; sub: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </CardContent>
  </Card>
);

export default FacultyAnalytics;
