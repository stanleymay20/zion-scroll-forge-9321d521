import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent } from '@/components/ui/card';
import { QuizInterface } from '@/components/course/QuizInterface';
import { supabase } from '@/integrations/supabase/client';

console.info('✝️ Quiz Page — trusted assessment boundary enabled');

/**
 * Legacy /quiz/:quizId compatibility route.
 *
 * This page intentionally does NOT read embedded quiz questions or answer_index
 * values from the `quizzes` row. It resolves only the quiz/module/course identity
 * and delegates question delivery + grading to QuizInterface -> module-quiz,
 * where protected answers remain server-side.
 */
export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ['safe-quiz-shell', quizId],
    enabled: !!quizId,
    queryFn: async () => {
      const { data: quizRow, error: quizError } = await (supabase as any)
        .from('quizzes')
        .select('id,title,module_id,passing_score')
        .eq('id', quizId!)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizRow?.module_id) return null;

      const { data: moduleRow, error: moduleError } = await supabase
        .from('course_modules')
        .select('id,course_id')
        .eq('id', quizRow.module_id)
        .maybeSingle();

      if (moduleError) throw moduleError;
      if (!moduleRow?.course_id) return null;

      return {
        id: quizRow.id,
        title: quizRow.title ?? 'Module Quiz',
        moduleId: quizRow.module_id as string,
        courseId: moduleRow.course_id as string,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <PageTemplate title="Quiz Not Found">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This quiz could not be loaded safely. Return to the course and try again.
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title={quiz.title}>
      <QuizInterface lectureId={quiz.moduleId} courseId={quiz.courseId} />
    </PageTemplate>
  );
}
