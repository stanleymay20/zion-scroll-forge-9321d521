/**
 * Quiz Interface Component
 * Interactive quiz with immediate feedback, scoring, and per-outcome mastery tracking.
 *
 * Source of truth: public.quiz_questions, tagged by module_id + learning_objective_id.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExplainScoreDialog } from '@/components/ai/ExplainScoreDialog';

interface QuizInterfaceProps {
  /** Treated as module_id (the unit quizzes are tagged to). */
  lectureId: string;
  courseId: string;
  onComplete?: () => void;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  learning_objective_id: string | null;
  bloom_level: string | null;
  points: number;
}

interface OutcomeMeta {
  id: string;
  code: string | null;
  statement: string;
}

/** Normalize the DB `answer` column (text) to an option index. */
function resolveAnswerIndex(answer: unknown, options: string[]): number {
  if (typeof answer === 'number') return Math.max(0, Math.min(options.length - 1, answer));
  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    const asNum = Number(trimmed);
    if (Number.isInteger(asNum) && asNum >= 0 && asNum < options.length) return asNum;
    const matchIdx = options.findIndex((o) => o?.toString().trim().toLowerCase() === trimmed.toLowerCase());
    if (matchIdx >= 0) return matchIdx;
  }
  return 0;
}

export function QuizInterface({ lectureId, courseId, onComplete }: QuizInterfaceProps) {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Fetch real questions for this module
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['quiz', lectureId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('quiz_questions')
        .select('id,prompt,options,answer,points,order_index,learning_objective_id,bloom_level')
        .eq('module_id', lectureId)
        .order('order_index', { ascending: true });
      if (error) throw error;

      const questions: QuizQuestion[] = (rows ?? []).map((r: any) => {
        const opts: string[] = Array.isArray(r.options)
          ? r.options.map((o: any) => (typeof o === 'string' ? o : (o?.text ?? String(o))))
          : [];
        return {
          id: r.id,
          prompt: r.prompt ?? '',
          options: opts,
          correctIndex: resolveAnswerIndex(r.answer, opts),
          explanation: undefined,
          learning_objective_id: r.learning_objective_id ?? null,
          bloom_level: r.bloom_level ?? null,
          points: typeof r.points === 'number' ? r.points : 1,
        };
      });

      // Fetch outcome metadata for any objectives referenced
      const objIds = Array.from(
        new Set(questions.map((q) => q.learning_objective_id).filter((x): x is string => !!x)),
      );
      let outcomes: OutcomeMeta[] = [];
      if (objIds.length > 0) {
        const { data: oRows } = await supabase
          .from('course_learning_outcomes')
          .select('id,code,statement')
          .in('id', objIds);
        outcomes = (oRows ?? []) as OutcomeMeta[];
      }

      return { questions, outcomes };
    },
  });

  const questions = quizData?.questions ?? [];
  const outcomes = quizData?.outcomes ?? [];
  const currentQuestion = questions[currentQuestionIndex];

  // Compute per-outcome mastery on results screen
  const outcomeMastery = useMemo(() => {
    if (!showResults || questions.length === 0) return [];
    const buckets = new Map<string, { correct: number; total: number }>();
    questions.forEach((q, i) => {
      if (!q.learning_objective_id) return;
      const b = buckets.get(q.learning_objective_id) ?? { correct: 0, total: 0 };
      b.total += 1;
      if (selectedAnswers[i] === q.correctIndex) b.correct += 1;
      buckets.set(q.learning_objective_id, b);
    });
    return Array.from(buckets.entries()).map(([id, b]) => {
      const meta = outcomes.find((o) => o.id === id);
      const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
      const tier: 'achieved' | 'approaching' | 'not_yet' =
        pct >= 70 ? 'achieved' : pct >= 50 ? 'approaching' : 'not_yet';
      return { id, code: meta?.code ?? null, statement: meta?.statement ?? 'Outcome', pct, tier, ...b };
    });
  }, [showResults, questions, selectedAnswers, outcomes]);

  // Persist per-outcome mastery + overall submission
  const submitQuizMutation = useMutation({
    mutationFn: async ({ finalScore, answers }: { finalScore: number; answers: Record<number, number> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in required');

      // Per-outcome mastery upserts
      const outcomeRows = Array.from(
        questions.reduce((acc, q, i) => {
          if (!q.learning_objective_id) return acc;
          const b = acc.get(q.learning_objective_id) ?? { correct: 0, total: 0 };
          b.total += 1;
          if (answers[i] === q.correctIndex) b.correct += 1;
          acc.set(q.learning_objective_id, b);
          return acc;
        }, new Map<string, { correct: number; total: number }>()).entries(),
      ).map(([learning_objective_id, b]) => ({
        user_id: user.id,
        course_id: courseId,
        module_id: lectureId,
        learning_objective_id,
        score_pct: Math.round((b.correct / b.total) * 100),
      }));

      if (outcomeRows.length > 0) {
        // Best-effort: table is created in Phase 3 migration; ignore failures here
        const { error: omErr } = await (supabase as any)
          .from('student_outcome_mastery')
          .upsert(outcomeRows, { onConflict: 'user_id,module_id,learning_objective_id' });
        if (omErr) console.warn('[QuizInterface] outcome mastery upsert skipped:', omErr.message);
      }

      // Overall submission row (schema: user_id, course_id, module_id, score, total, submitted_at)
      const { error } = await supabase.from('quiz_submissions').insert({
        user_id: user.id,
        course_id: courseId,
        module_id: lectureId,
        score: finalScore,
        total: questions.length,
        submitted_at: new Date().toISOString(),
      } as any);
      if (error) throw error;

      // Mirror to student_module_progress.mastery_level
      const { error: smpErr } = await (supabase as any)
        .from('student_module_progress')
        .upsert(
          {
            user_id: user.id,
            module_id: lectureId,
            mastery_level: finalScore,
            status: finalScore >= 70 ? 'completed' : 'in_progress',
            last_accessed: new Date().toISOString(),
            ...(finalScore >= 70 ? { completed_at: new Date().toISOString() } : {}),
          },
          { onConflict: 'user_id,module_id' },
        );
      if (smpErr) console.warn('[QuizInterface] mastery_level update skipped:', smpErr.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions', lectureId] });
      queryClient.invalidateQueries({ queryKey: ['outcome-mastery', lectureId] });
    },
  });

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: answerIndex });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) correctCount++;
    });
    const finalScore = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    setScore(finalScore);
    setShowResults(true);
    submitQuizMutation.mutate({ finalScore, answers: selectedAnswers });

    if (finalScore >= 70) {
      toast.success('Quiz Passed!', { description: `You scored ${finalScore}%. Outcomes mastery recorded.` });
    } else {
      toast.error('Quiz Not Passed', { description: `You scored ${finalScore}%. You need 70% to pass.` });
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setScore(0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!questions.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground font-medium">Assessment pending.</p>
          <p className="text-xs text-muted-foreground mt-2">
            No quiz questions have been authored for this module yet. Faculty will publish them shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score */}
          <div className="text-center py-6">
            <div className={`text-6xl font-bold mb-2 ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
              {score}%
            </div>
            <p className="text-lg text-muted-foreground">
              {score >= 70 ? 'Congratulations! You passed!' : 'Keep studying and try again!'}
            </p>
            <Badge variant={score >= 70 ? 'default' : 'destructive'} className="mt-2">
              {questions.filter((q, i) => selectedAnswers[i] === q.correctIndex).length} / {questions.length} Correct
            </Badge>
          </div>

          {/* Per-Outcome Mastery */}
          {outcomeMastery.length > 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Learning Outcomes Mastery</h3>
              <ul className="space-y-2">
                {outcomeMastery.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 text-sm">
                    {o.tier === 'achieved' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : o.tier === 'approaching' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-foreground/90">
                        {o.code ? <span className="font-mono text-xs text-muted-foreground mr-2">{o.code}</span> : null}
                        {o.statement}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.tier === 'achieved' ? 'Achieved' : o.tier === 'approaching' ? 'Approaching' : 'Not yet'} · {o.pct}% ({o.correct}/{o.total})
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Review */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Your Answers</h3>
            {questions.map((q, index) => {
              const isCorrect = selectedAnswers[index] === q.correctIndex;
              return (
                <div key={q.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {index + 1}. {q.prompt}
                        {q.bloom_level && (
                          <Badge variant="outline" className="ml-2 text-xs capitalize">
                            {q.bloom_level}
                          </Badge>
                        )}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                          Your answer: {q.options[selectedAnswers[index]] ?? '(none)'}
                        </p>
                        {!isCorrect && (
                          <p className="text-green-600">Correct answer: {q.options[q.correctIndex]}</p>
                        )}
                        {q.explanation && (
                          <p className="text-muted-foreground mt-2 italic">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRetake} variant="outline" className="flex-1 min-w-[140px]">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
            <ExplainScoreDialog
              score={score}
              threshold={70}
              aiSystem="gpt-auto-grader"
              decisionReference={lectureId}
              decisionType="grade"
            />
            {score >= 70 && onComplete && (
              <Button onClick={onComplete} className="flex-1 min-w-[140px]">
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Quiz</CardTitle>
        <CardDescription>Test your understanding — each question maps to a learning outcome.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Object.keys(selectedAnswers).length} / {questions.length} answered</span>
          </div>
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {currentQuestionIndex + 1}. {currentQuestion.prompt}
            {currentQuestion.bloom_level && (
              <Badge variant="outline" className="ml-2 text-xs capitalize">{currentQuestion.bloom_level}</Badge>
            )}
          </h3>

          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={Object.keys(selectedAnswers).length !== questions.length}>
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={selectedAnswers[currentQuestionIndex] === undefined}>
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
