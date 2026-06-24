/**
 * Quiz Interface Component
 * Interactive quiz with immediate feedback and scoring
 */

import { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { ExplainScoreDialog } from '@/components/ai/ExplainScoreDialog';

interface QuizInterfaceProps {
  lectureId: string;
  courseId: string;
  onComplete?: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export function QuizInterface({ lectureId, courseId, onComplete }: QuizInterfaceProps) {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Fetch quiz questions
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['quiz', lectureId],
    queryFn: async () => {
      // In production, this would fetch from the backend
      // For now, we'll return mock data
      const mockQuestions: QuizQuestion[] = [
        {
          id: '1',
          question: 'What is the primary purpose of prophetic intelligence?',
          options: [
            'To predict the future',
            'To hear and communicate God\'s heart',
            'To gain personal power',
            'To impress others'
          ],
          correctAnswer: 1,
          explanation: 'Prophetic intelligence is about hearing and communicating God\'s heart to His people, not about personal gain or prediction.'
        },
        {
          id: '2',
          question: 'Which of the following is a key characteristic of biblical prophecy?',
          options: [
            'It always predicts future events',
            'It builds up, encourages, and comforts',
            'It condemns and judges',
            'It requires special training'
          ],
          correctAnswer: 1,
          explanation: 'According to 1 Corinthians 14:3, prophecy should build up, encourage, and comfort the church.'
        },
        {
          id: '3',
          question: 'How should prophetic words be tested?',
          options: [
            'By the reputation of the prophet',
            'By how it makes you feel',
            'Against Scripture and with spiritual discernment',
            'By majority vote'
          ],
          correctAnswer: 2,
          explanation: 'All prophetic words must be tested against Scripture and with spiritual discernment (1 Thessalonians 5:20-21).'
        }
      ];

      return { questions: mockQuestions };
    }
  });

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (answers: Record<number, number>) => {
      const { error } = await supabase
        .from('quiz_submissions')
        .insert({
          lecture_id: lectureId,
          course_id: courseId,
          answers: answers,
          score: score,
          submitted_at: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions', lectureId] });
      if (onComplete) onComplete();
    }
  });

  const questions = quizData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answerIndex
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let correctCount = 0;
    questions.forEach((question: QuizQuestion, index: number) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setShowResults(true);

    // Submit to backend
    submitQuizMutation.mutate(selectedAnswers);

    // Show toast
    if (finalScore >= 70) {
      toast.success('Quiz Passed!', {
        description: `You scored ${finalScore}%. Great job!`
      });
    } else {
      toast.error('Quiz Not Passed', {
        description: `You scored ${finalScore}%. You need 70% to pass. Try again!`
      });
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
          <p className="text-muted-foreground">No quiz available for this lecture yet.</p>
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
          {/* Score Display */}
          <div className="text-center py-6">
            <div className={`text-6xl font-bold mb-2 ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
              {score}%
            </div>
            <p className="text-lg text-muted-foreground">
              {score >= 70 ? 'Congratulations! You passed!' : 'Keep studying and try again!'}
            </p>
            <Badge variant={score >= 70 ? 'default' : 'destructive'} className="mt-2">
              {questions.filter((q: QuizQuestion, i: number) => selectedAnswers[i] === q.correctAnswer).length} / {questions.length} Correct
            </Badge>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Your Answers</h3>
            {questions.map((question: QuizQuestion, index: number) => {
              const isCorrect = selectedAnswers[index] === question.correctAnswer;
              return (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {index + 1}. {question.question}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                          Your answer: {question.options[selectedAnswers[index]]}
                        </p>
                        {!isCorrect && (
                          <p className="text-green-600">
                            Correct answer: {question.options[question.correctAnswer]}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-muted-foreground mt-2 italic">
                            {question.explanation}
                          </p>
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
                Continue to Next Lecture
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
        <CardTitle>Lecture Quiz</CardTitle>
        <CardDescription>
          Test your understanding of the lecture material
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Object.keys(selectedAnswers).length} / {questions.length} answered</span>
          </div>
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} />
        </div>

        {/* Question */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {currentQuestionIndex + 1}. {currentQuestion.question}
          </h3>

          {/* Answer Options */}
          <RadioGroup
            value={selectedAnswers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
          >
            {currentQuestion.options.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== questions.length}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={selectedAnswers[currentQuestionIndex] === undefined}
            >
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
