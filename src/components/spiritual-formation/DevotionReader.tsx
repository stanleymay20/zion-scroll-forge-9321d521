/**
 * Devotion Reader Component
 * Daily devotion reader with audio playback
 * Requirements: 7.1
 */

import React, { useState, useRef } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Share2, BookmarkPlus, Star, Flame } from 'lucide-react';

import type { DailyDevotion, DevotionStreak } from '@/types/devotion';

interface DevotionReaderProps {
  devotion: DailyDevotion;
  streak: DevotionStreak;
  userId: string;
}

export function DevotionReader({ devotion, streak, userId }: DevotionReaderProps): JSX.Element {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = (): void => {
    if (!audioRef.current || !devotion.audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleComplete = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await legacyApiCall('/api/devotions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          devotionId: devotion.id,
          notes,
          rating: rating > 0 ? rating : undefined
        })
      });

      if (!response.ok) throw new Error('Failed to complete devotion');
      setCompleted(true);
    } catch (error) {
      console.error('Error completing devotion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Streak Display */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{streak.currentStreak} Day Streak</p>
                <p className="text-sm text-muted-foreground">
                  Longest: {streak.longestStreak} days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Completions</p>
              <p className="text-xl font-semibold">{streak.totalCompletions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Devotion Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge>{devotion.theme}</Badge>
                {devotion.difficulty && (
                  <Badge variant="outline">{devotion.difficulty}</Badge>
                )}
              </div>
              <CardTitle className="text-3xl mb-2">{devotion.title}</CardTitle>
              <CardDescription>
                {new Date(devotion.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <BookmarkPlus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Scripture Passage */}
          <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">
                {devotion.scripture.reference}
              </h3>
              <Badge variant="outline">{devotion.scripture.translation}</Badge>
            </div>
            <p className="text-lg leading-relaxed italic">
              "{devotion.scripture.text}"
            </p>
            {devotion.scripture.audioUrl && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  className="gap-2"
                >
                  {isPlaying ? (
                    <><Pause className="h-4 w-4" /> Pause Audio</>
                  ) : (
                    <><Play className="h-4 w-4" /> Play Audio</>
                  )}
                </Button>
                <audio
                  ref={audioRef}
                  src={devotion.scripture.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Reflection */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Reflection</h3>
            <div className="prose prose-sm max-w-none">
              {devotion.reflection.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3">{paragraph}</p>
              ))}
            </div>
          </div>

          <Separator />

          {/* Prayer Prompt */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Prayer Prompt</h3>
            <p className="text-sm">{devotion.prayerPrompt}</p>
          </div>

          {/* Action Step */}
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Today's Action Step</h3>
            <p className="text-sm">{devotion.actionStep}</p>
          </div>

          <Separator />

          {/* Personal Notes */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Personal Notes</h3>
            <Textarea
              placeholder="Write your thoughts, prayers, or insights..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={completed}
            />
          </div>

          {/* Rating */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Rate This Devotion</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => !completed && setRating(star)}
                  disabled={completed}
                  className="transition-colors"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Complete Button */}
          {!completed ? (
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Completing...' : 'Mark as Complete'}
            </Button>
          ) : (
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-green-700 dark:text-green-300 font-semibold">
                ✓ Devotion Completed! Keep up your streak!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
