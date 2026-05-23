/**
 * LearningReadiness — operational dashboard showing whether the
 * student study pipeline is wired end-to-end. All numbers come from
 * the v_learning_readiness view (no hardcoding).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

type Readiness = {
  courses_total: number;
  courses_with_faculty: number;
  modules_total: number;
  modules_verified: number;
  tutors_total: number;
  tutors_with_faculty: number;
  courses_with_upcoming_sessions: number;
  upcoming_sessions: number;
  quiz_pools: number;
  assignments_total: number;
  quizzes_total: number;
};

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function Row({
  label,
  value,
  total,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  hint: string;
}) {
  const percentage = pct(value, total);
  const ok = percentage >= 95;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          </div>
          <Badge
            variant="secondary"
            className={ok ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}
          >
            {ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            )}
            {value.toLocaleString()} / {total.toLocaleString()}
          </Badge>
        </div>
        <Progress value={percentage} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
      </CardContent>
    </Card>
  );
}

export default function LearningReadiness() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['learning-readiness'],
    queryFn: async (): Promise<Readiness> => {
      const { data, error } = await supabase
        .from('v_learning_readiness' as any)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as Readiness;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <PageTemplate title="Learning Readiness" description="Operational gate before student onboarding opens.">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTemplate>
    );
  }

  if (error || !data) {
    return (
      <PageTemplate title="Learning Readiness" description="">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load readiness data.
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const allGreen =
    pct(data.courses_with_faculty, data.courses_total) >= 95 &&
    pct(data.modules_verified, data.modules_total) >= 95 &&
    pct(data.tutors_with_faculty, data.tutors_total) >= 95 &&
    pct(data.courses_with_upcoming_sessions, data.courses_total) >= 95;

  return (
    <PageTemplate
      title="Learning Readiness"
      description="Pipeline gate that must be green before student onboarding opens."
    >
      <div className="space-y-6">
        <Card
          className={
            allGreen
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-amber-300 bg-amber-50/40'
          }
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {allGreen ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  Pipeline ready — onboarding can open.
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  Pipeline incomplete — resolve gaps below.
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Row
            label="Courses linked to a faculty"
            value={data.courses_with_faculty}
            total={data.courses_total}
            hint="Required for tutor matching, faculty dashboards, and filters."
          />
          <Row
            label="Modules verified & published"
            value={data.modules_verified}
            total={data.modules_total}
            hint="Modules students can actually read in the curriculum."
          />
          <Row
            label="AI tutors mapped to a faculty"
            value={data.tutors_with_faculty}
            total={data.tutors_total}
            hint="Required for the Live Avatar tab to load a tutor."
          />
          <Row
            label="Courses with upcoming live lectures"
            value={data.courses_with_upcoming_sessions}
            total={data.courses_total}
            hint="At least one scheduled session in the next 8 weeks."
          />
          <Row
            label="Quizzes with question pools"
            value={data.quiz_pools}
            total={data.quizzes_total}
            hint="Quizzes need question pools before students can attempt them."
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw counts</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>Total courses: <strong>{data.courses_total}</strong></div>
            <div>Total modules: <strong>{data.modules_total}</strong></div>
            <div>Total assignments: <strong>{data.assignments_total}</strong></div>
            <div>Upcoming live sessions: <strong>{data.upcoming_sessions}</strong></div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
