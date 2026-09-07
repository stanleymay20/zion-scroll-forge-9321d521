/**
 * LearningReadiness — operational and academic-content truth dashboard.
 * All numbers come from v_learning_readiness; no catalogue-readiness value is hardcoded.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, BookOpenCheck, ShieldAlert } from 'lucide-react';

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
  courses_shell?: number;
  courses_in_development?: number;
  courses_teaching_ready?: number;
  courses_scheduled_blocked?: number;
  courses_enrollable?: number;
  courses_content_ready?: number;
};

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function Row({ label, value, total, hint }: { label: string; value: number; total: number; hint: string }) {
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
          <Badge variant="secondary" className={ok ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}>
            {ok ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
            {value.toLocaleString()} / {total.toLocaleString()}
          </Badge>
        </div>
        <Progress value={percentage} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
      </CardContent>
    </Card>
  );
}

function StageCard({ label, value, hint, emphasis = false }: { label: string; value: number; hint: string; emphasis?: boolean }) {
  return (
    <Card className={emphasis ? 'border-emerald-300 bg-emerald-50/30' : undefined}>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
        <p className="text-sm font-medium mt-1">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function LearningReadiness() {
  const [seeding, setSeeding] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
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

  const runSeed = async () => {
    setSeeding(true);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('seed-quiz-questions', {
        body: { batch_size: 10 },
      });
      if (err) throw err;
      setLastRun(
        `Generated ${res.processed_quizzes ?? 0} quiz pools + ${res.processed_assignments ?? 0} assignment pools. ${res.errors?.length ? `${res.errors.length} errors.` : ''}`,
      );
      toast({
        title: 'Generation batch complete',
        description: 'Generated questions still require the normal academic review/readiness evidence.',
      });
      await refetch();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Generation failed', description: message, variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <PageTemplate title="Learning Readiness" description="Evidence-based course and delivery readiness.">
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
          <CardContent className="py-8 text-center text-muted-foreground">Failed to load readiness data.</CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const hasCatalogueTruth = typeof data.courses_enrollable === 'number';
  const enrollable = data.courses_enrollable ?? 0;
  const contentReady = data.courses_content_ready ?? 0;
  const limitedCohortReady = hasCatalogueTruth && enrollable > 0;

  return (
    <PageTemplate
      title="Learning Readiness"
      description="Separates catalogue presence from evidence that a course can actually be taught and enrolled."
    >
      <div className="space-y-6">
        <Card className={limitedCohortReady ? 'border-emerald-300 bg-emerald-50/40' : 'border-amber-300 bg-amber-50/40'}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {limitedCohortReady ? (
                <>
                  <BookOpenCheck className="h-5 w-5 text-emerald-700" />
                  Limited cohort readiness — only {enrollable.toLocaleString()} evidence-cleared course{enrollable === 1 ? '' : 's'} may accept enrollment.
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-700" />
                  {hasCatalogueTruth
                    ? 'No course currently clears the complete enrollment-readiness gate.'
                    : 'Catalogue truth migration has not reached this environment yet.'}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A catalogue row, faculty link, generated module, or scheduled section does not by itself make a course teaching-ready. New enrollments are allowed only when the course is approved and has verified modules, learning outcomes, assessment evidence, learning resources, and an open staffed section.
          </CardContent>
        </Card>

        {hasCatalogueTruth && (
          <section className="space-y-3" aria-labelledby="catalogue-truth-heading">
            <div>
              <h2 id="catalogue-truth-heading" className="font-serif text-xl">Catalogue truth</h2>
              <p className="text-sm text-muted-foreground">
                These states are calculated from academic evidence rather than course titles or marketing visibility.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StageCard label="Shell" value={data.courses_shell ?? 0} hint="No substantive module structure yet." />
              <StageCard label="In development" value={data.courses_in_development ?? 0} hint="Has content, but one or more academic evidence gates fail." />
              <StageCard label="Teaching ready" value={data.courses_teaching_ready ?? 0} hint="Content evidence passes; no active section yet." />
              <StageCard label="Scheduled / blocked" value={data.courses_scheduled_blocked ?? 0} hint="Content passes, but no open staffed section." />
              <StageCard label="Enrollable" value={enrollable} hint="Content-ready with an open staffed section." emphasis />
            </div>
            <p className="text-xs text-muted-foreground">
              {contentReady.toLocaleString()} of {data.courses_total.toLocaleString()} catalogue courses currently clear the content-readiness evidence gate before scheduling is considered.
            </p>
          </section>
        )}

        <section className="space-y-3" aria-labelledby="operational-heading">
          <div>
            <h2 id="operational-heading" className="font-serif text-xl">Operational coverage</h2>
            <p className="text-sm text-muted-foreground">Supporting infrastructure signals. These do not override academic readiness.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Row label="Courses linked to a faculty" value={data.courses_with_faculty} total={data.courses_total} hint="Supports faculty dashboards, ownership and filtering." />
            <Row label="Modules passing quality evaluation" value={data.modules_verified} total={data.modules_total} hint="Native module-quality evaluator result; not a substitute for whole-course readiness." />
            <Row label="AI tutors mapped to a faculty" value={data.tutors_with_faculty} total={data.tutors_total} hint="Required for faculty-aware tutor experiences." />
            <Row label="Courses with active scheduled sections" value={data.courses_with_upcoming_sessions} total={data.courses_total} hint="Registrar scheduling coverage only; an active section does not prove curriculum depth." />
            <Row label="Quizzes with question pools" value={data.quiz_pools} total={data.quizzes_total} hint="Question availability; review and course-level assessment evidence still apply." />
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Generate missing quiz pools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Generates quiz content for empty pools in bounded batches. AI generation is an authoring aid, not academic approval: generated questions do not make a course teaching-ready unless the normal quality and review evidence also passes.
            </p>
            <Button onClick={runSeed} disabled={seeding}>
              {seeding ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Run bounded generation batch</>
              )}
            </Button>
            {lastRun && <p className="text-xs text-muted-foreground">{lastRun}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Raw counts</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>Total courses: <strong>{data.courses_total.toLocaleString()}</strong></div>
            <div>Total modules: <strong>{data.modules_total.toLocaleString()}</strong></div>
            <div>Total assignments: <strong>{data.assignments_total.toLocaleString()}</strong></div>
            <div>Active course sections: <strong>{data.upcoming_sessions.toLocaleString()}</strong></div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
