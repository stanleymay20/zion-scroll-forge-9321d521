/**
 * OutcomesAchievedPanel — student-facing summary of per-outcome mastery.
 * Reads from public.student_outcome_mastery joined with course_learning_outcomes.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Circle, Award, Loader2 } from 'lucide-react';

interface Props {
  userId: string;
  courseId?: string;
  moduleId?: string;
  title?: string;
}

interface Row {
  learning_objective_id: string;
  score_pct: number;
  achieved_at: string | null;
  course_learning_outcomes: {
    code: string | null;
    statement: string;
    bloom_level: string | null;
  } | null;
}

export function OutcomesAchievedPanel({ userId, courseId, moduleId, title = 'Outcomes Mastery' }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['outcome-mastery', userId, courseId, moduleId],
    enabled: !!userId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('student_outcome_mastery')
        .select('learning_objective_id,score_pct,achieved_at,course_learning_outcomes(code,statement,bloom_level)')
        .eq('user_id', userId);
      if (moduleId) q = q.eq('module_id', moduleId);
      else if (courseId) q = q.eq('course_id', courseId);
      const { data, error } = await q;
      if (error) {
        console.warn('[OutcomesAchievedPanel]', error.message);
        return [] as Row[];
      }
      return (data ?? []) as Row[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No outcome mastery recorded yet. Complete the module assessment to populate this report.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-accent" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {data.map((r) => {
            const tier: 'achieved' | 'approaching' | 'not_yet' =
              r.score_pct >= 70 ? 'achieved' : r.score_pct >= 50 ? 'approaching' : 'not_yet';
            const Icon = tier === 'achieved' ? CheckCircle : tier === 'approaching' ? AlertCircle : Circle;
            const color = tier === 'achieved' ? 'text-green-500' : tier === 'approaching' ? 'text-yellow-500' : 'text-muted-foreground';
            return (
              <li key={r.learning_objective_id} className="flex items-start gap-3 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="flex-1">
                  <p className="text-foreground/90">
                    {r.course_learning_outcomes?.code && (
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {r.course_learning_outcomes.code}
                      </span>
                    )}
                    {r.course_learning_outcomes?.statement ?? 'Outcome'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tier === 'achieved' ? 'Achieved' : tier === 'approaching' ? 'Approaching' : 'Not yet'} · {r.score_pct}%
                    {r.course_learning_outcomes?.bloom_level && (
                      <span className="ml-2 capitalize">· {r.course_learning_outcomes.bloom_level}</span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default OutcomesAchievedPanel;
