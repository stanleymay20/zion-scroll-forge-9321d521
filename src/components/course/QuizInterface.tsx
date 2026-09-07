import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, AlertCircle, Trophy, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ExplainScoreDialog } from '@/components/ai/ExplainScoreDialog';

interface QuizInterfaceProps {
  lectureId: string;
  courseId: string;
  onComplete?: () => void;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  learning_objective_id: string | null;
  bloom_level: string | null;
  points: number;
}

interface OutcomeMeta {
  id: string;
  code: string | null;
  statement: string;
}

interface ReviewRow {
  id: string;
  correct: boolean;
  selected: number | string | null;
  correctIndex: number | null;
}

interface AttemptPolicy {
  attempts_allowed: number;
  attempts_used: number;
  attempts_remaining: number;
  can_attempt: boolean;
  passing_score: number;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  passingScore: number;
  earned: number;
  possible: number;
  review: ReviewRow[];
  attemptPolicy: AttemptPolicy;
  outcomes: Array<{ learning_objective_id: string; score_pct: number }>;
}

export function QuizInterface({ lectureId, courseId, onComplete }: QuizInterfaceProps) {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const { data: quizData, isLoading, refetch } = useQuery({
    queryKey: ['quiz', lectureId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('module-quiz', {
        body: { action: 'questions', moduleId: lectureId, courseId },
      });
      if (error) throw error;

      const questions = (data?.questions ?? []) as QuizQuestion[];
      const attemptPolicy = (data?.attemptPolicy ?? {
        attempts_allowed: 3,
        attempts_used: 0,
        attempts_remaining: 3,
        can_attempt: true,
        passing_score: 70,
      }) as AttemptPolicy;
      const objectiveIds = Array.from(new Set(
        questions.map((q) => q.learning_objective_id).filter((id): id is string => !!id),
      ));

      let outcomes: OutcomeMeta[] = [];
      if (objectiveIds.length) {
        const { data: rows, error: outcomeError } = await supabase
          .from('course_learning_outcomes')
          .select('id,code,statement')
          .in('id', objectiveIds);
        if (outcomeError) throw outcomeError;
        outcomes = (rows ?? []) as OutcomeMeta[];
      }

      return { questions, outcomes, attemptPolicy };
    },
  });

  const questions = quizData?.questions ?? [];
  const outcomes = quizData?.outcomes ?? [];
  const attemptPolicy = quizData?.attemptPolicy;
  const currentQuestion = questions[currentQuestionIndex];

  const reviewById = useMemo(
    () => new Map((result?.review ?? []).map((row) => [row.id, row])),
    [result],
  );

  const outcomeMastery = useMemo(() => {
    return (result?.outcomes ?? []).map((row) => {
      const meta = outcomes.find((o) => o.id === row.learning_objective_id);
      const tier: 'achieved' | 'approaching' | 'not_yet' =
        row.score_pct >= 70 ? 'achieved' : row.score_pct >= 50 ? 'approaching' : 'not_yet';
      return {
        id: row.learning_objective_id,
        code: meta?.code ?? null,
        statement: meta?.statement ?? 'Outcome',
        pct: row.score_pct,
        tier,
      };
    });
  }, [result, outcomes]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      const answers = Object.fromEntries(questions.map((q) => [q.id, selectedAnswers[q.id]]));
      const { data, error } = await supabase.functions.invoke('module-quiz', {
        body: { action: 'submit', moduleId: lectureId, courseId, answers },
      });
      if (error) throw error;
      return data as SubmitResult;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions', lectureId] });
      queryClient.invalidateQueries({ queryKey: ['outcome-mastery', lectureId] });
      queryClient.invalidateQueries({ queryKey: ['module-progress', lectureId] });
      queryClient.invalidateQueries({ queryKey: ['quiz', lectureId, courseId] });

      if (data.passed) {
        toast.success('Quiz Passed!', { description: `Verified score: ${data.score}%.` });
      } else {
        toast.error('Quiz Not Passed', {
          description: `Verified score: ${data.score}%. Passing score: ${data.passingScore}%. ${data.attemptPolicy.attempts_remaining} attempt${data.attemptPolicy.attempts_remaining === 1 ? '' : 's'} remaining.`,
        });
      }
    },
    onError: async (error: unknown) => {
      await refetch();
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast.error('Quiz submission failed', { description: message });
    },
  });

  const handleRetake = async () => {
    await refetch();
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
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
          <p className="text-xs text-muted-foreground mt-2">No quiz questions have been authored for this module yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (!result && attemptPolicy && !attemptPolicy.can_attempt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Assessment attempt limit reached
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            You have used {attemptPolicy.attempts_used} of {attemptPolicy.attempts_allowed} permitted attempts for this module quiz.
          </p>
          <p>The passing threshold for this assessment is {attemptPolicy.passing_score}%.</p>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    const canRetake = !result.passed && result.attemptPolicy.can_attempt;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Verified Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-6">
            <div className={`text-6xl font-bold mb-2 ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
              {result.score}%
            </div>
            <p className="text-lg text-muted-foreground">
              {result.passed ? 'Congratulations! You passed.' : 'Review the material before your next permitted attempt.'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant={result.passed ? 'default' : 'destructive'}>Server-verified assessment</Badge>
              <Badge variant="outline">Pass: {result.passingScore}%</Badge>
              <Badge variant="outline">
                Attempts: {result.attemptPolicy.attempts_used}/{result.attemptPolicy.attempts_allowed}
              </Badge>
            </div>
          </div>

          {outcomeMastery.length > 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Learning Outcomes Mastery</h3>
              {outcomeMastery.map((o) => (
                <div key={o.id} className="flex items-start gap-3 text-sm">
                  {o.tier === 'achieved' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : o.tier === 'approaching' ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p>{o.code ? `${o.code} · ` : ''}{o.statement}</p>
                    <p className="text-xs text-muted-foreground">{o.pct}% verified</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Your Answers</h3>
            {questions.map((q, index) => {
              const review = reviewById.get(q.id);
              const selectedIndex = selectedAnswers[q.id];
              return (
                <div key={q.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {review?.correct ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{index + 1}. {q.prompt}</p>
                      <p className={review?.correct ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                        Your answer: {q.options[selectedIndex] ?? '(none)'}
                      </p>
                      {!review?.correct && review?.correctIndex != null && (
                        <p className="text-green-600 text-sm">Correct answer: {q.options[review.correctIndex]}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!result.passed && (
            <p className="text-sm text-muted-foreground text-center">
              {result.attemptPolicy.attempts_remaining > 0
                ? `${result.attemptPolicy.attempts_remaining} attempt${result.attemptPolicy.attempts_remaining === 1 ? '' : 's'} remaining.`
                : 'No attempts remain for this assessment.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canRetake && (
              <Button onClick={handleRetake} variant="outline" className="flex-1 min-w-[140px]">
                <RefreshCw className="h-4 w-4 mr-2" /> Retake Quiz
              </Button>
            )}
            <ExplainScoreDialog
              score={result.score}
              threshold={result.passingScore}
              aiSystem="verified-module-grader"
              decisionReference={lectureId}
              decisionType="grade"
            />
            {result.passed && onComplete && (
              <Button onClick={onComplete} className="flex-1 min-w-[140px]">Continue</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Module Quiz</span>
          {attemptPolicy && (
            <span className="flex gap-2 text-xs font-normal">
              <Badge variant="outline">Pass: {attemptPolicy.passing_score}%</Badge>
              <Badge variant="outline">
                Attempt {attemptPolicy.attempts_used + 1} of {attemptPolicy.attempts_allowed}
              </Badge>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{answeredCount}/{questions.length} answered</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-4">
          <p className="font-medium text-lg">{currentQuestion.prompt}</p>
          {currentQuestion.bloom_level && (
            <Badge variant="outline" className="capitalize">{currentQuestion.bloom_level}</Badge>
          )}
          <RadioGroup
            value={selectedAnswers[currentQuestion.id]?.toString()}
            onValueChange={(value) => setSelectedAnswers((prev) => ({ ...prev, [currentQuestion.id]: Number(value) }))}
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={index.toString()} id={`${currentQuestion.id}-${index}`} />
                <Label htmlFor={`${currentQuestion.id}-${index}`} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              className="ml-auto"
              disabled={selectedAnswers[currentQuestion.id] == null}
              onClick={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              Next
            </Button>
          ) : (
            <Button
              className="ml-auto"
              disabled={answeredCount !== questions.length || submitQuizMutation.isPending}
              onClick={() => submitQuizMutation.mutate()}
            >
              {submitQuizMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit for Verification
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
