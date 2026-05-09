/**
 * Prophetic Check-in Questionnaire Component
 * Spiritual assessment questionnaire
 * Requirements: 7.4
 */

import React, { useState } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

import type { PropheticCheckIn, QuestionnaireResponse } from '@/types/prophetic-checkin';

interface PropheticCheckInQuestionnaireProps {
  userId: string;
  lastCheckIn?: PropheticCheckIn;
}

const QUESTIONS = [
  {
    id: 'spiritual-health-1',
    question: 'How would you describe your current spiritual health?',
    category: 'spiritual-health' as const,
    importance: 'high' as const
  },
  {
    id: 'prayer-life-1',
    question: 'How consistent has your prayer life been this week?',
    category: 'prayer-life' as const,
    importance: 'high' as const
  },
  {
    id: 'scripture-engagement-1',
    question: 'How engaged have you been with Scripture?',
    category: 'scripture-engagement' as const,
    importance: 'high' as const
  },
  {
    id: 'worship-1',
    question: 'Describe your worship experiences recently',
    category: 'worship' as const,
    importance: 'medium' as const
  },
  {
    id: 'service-1',
    question: 'How have you served others this week?',
    category: 'service' as const,
    importance: 'medium' as const
  }
];

export function PropheticCheckInQuestionnaire({
  userId,
  lastCheckIn
}: PropheticCheckInQuestionnaireProps): JSX.Element {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    spiritualTemperature: 5,
    mood: '',
    lifeCircumstances: '',
    prayerFocus: [] as string[],
    scriptureHighlights: [] as string[],
    godsVoice: '',
    obedienceLevel: 5,
    communityEngagement: 5,
    ministryActivity: '',
    challengesFaced: [] as string[],
    victoriesExperienced: [] as string[],
    questionnaire: [] as QuestionnaireResponse[]
  });

  const [currentAnswer, setCurrentAnswer] = useState<string>('');

  const handleNext = (): void => {
    if (step < QUESTIONS.length) {
      // Save current answer
      const question = QUESTIONS[step];
      const newResponse: QuestionnaireResponse = {
        questionId: question.id,
        question: question.question,
        answer: currentAnswer,
        category: question.category,
        importance: question.importance
      };
      
      setFormData({
        ...formData,
        questionnaire: [...formData.questionnaire, newResponse]
      });
      setCurrentAnswer('');
      setStep(step + 1);
    }
  };

  const handleBack = (): void => {
    if (step > 0) {
      setStep(step - 1);
      const previousAnswer = formData.questionnaire[step - 1];
      if (previousAnswer) {
        setCurrentAnswer(previousAnswer.answer);
      }
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await legacyApiCall('/api/prophetic-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
          timestamp: new Date()
        })
      });

      if (!response.ok) throw new Error('Failed to submit check-in');
      
      setCompleted(true);
    } catch (error) {
      console.error('Error submitting check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <CardTitle>Check-in Complete!</CardTitle>
          </div>
          <CardDescription>
            Your spiritual check-in has been recorded. We're processing your responses to provide personalized guidance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm">
                Your prophetic guidance and growth insights will be available shortly. 
                Check the Growth tab to see your spiritual progress visualization.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              View Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial assessment step
  if (step === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prophetic Check-in</CardTitle>
          <CardDescription>
            Take a moment to reflect on your spiritual journey and receive personalized guidance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {lastCheckIn && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm">
                Last check-in: {new Date(lastCheckIn.timestamp).toLocaleDateString()}
              </p>
            </div>
          )}

          <div>
            <Label>Spiritual Temperature (1-10)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider
                value={[formData.spiritualTemperature]}
                onValueChange={(value) => setFormData({ ...formData, spiritualTemperature: value[0] })}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <Badge>{formData.spiritualTemperature}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              How would you rate your spiritual vitality right now?
            </p>
          </div>

          <div>
            <Label>Current Mood</Label>
            <Input
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
              placeholder="e.g., Peaceful, Anxious, Joyful..."
            />
          </div>

          <div>
            <Label>Life Circumstances</Label>
            <Textarea
              value={formData.lifeCircumstances}
              onChange={(e) => setFormData({ ...formData, lifeCircumstances: e.target.value })}
              placeholder="Briefly describe what's happening in your life..."
              rows={3}
            />
          </div>

          <div>
            <Label>Obedience Level (1-10)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider
                value={[formData.obedienceLevel]}
                onValueChange={(value) => setFormData({ ...formData, obedienceLevel: value[0] })}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <Badge>{formData.obedienceLevel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              How obedient have you been to God's leading?
            </p>
          </div>

          <div>
            <Label>Community Engagement (1-10)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider
                value={[formData.communityEngagement]}
                onValueChange={(value) => setFormData({ ...formData, communityEngagement: value[0] })}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <Badge>{formData.communityEngagement}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              How engaged have you been with your faith community?
            </p>
          </div>

          <Button onClick={() => setStep(1)} className="w-full">
            Continue to Questions
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Questionnaire steps
  if (step <= QUESTIONS.length) {
    const currentQuestion = QUESTIONS[step - 1];
    const progress = ((step - 1) / QUESTIONS.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge>Question {step} of {QUESTIONS.length}</Badge>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <CardTitle>{currentQuestion.question}</CardTitle>
          <CardDescription>
            Category: {currentQuestion.category.replace('-', ' ')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Share your thoughts..."
            rows={6}
            autoFocus
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!currentAnswer.trim()}
              className="flex-1"
            >
              {step === QUESTIONS.length ? 'Review' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Final review step
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Your Check-in</CardTitle>
        <CardDescription>Review your responses before submitting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/5 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Spiritual Temp</p>
              <p className="text-2xl font-bold">{formData.spiritualTemperature}/10</p>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Obedience</p>
              <p className="text-2xl font-bold">{formData.obedienceLevel}/10</p>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Community</p>
              <p className="text-2xl font-bold">{formData.communityEngagement}/10</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Responses:</p>
            <div className="space-y-2">
              {formData.questionnaire.map((response, index) => (
                <div key={response.questionId} className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  <p className="text-xs text-muted-foreground mb-1">
                    Q{index + 1}: {response.question}
                  </p>
                  <p className="text-sm">{response.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep(QUESTIONS.length)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Submitting...' : 'Submit Check-in'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
