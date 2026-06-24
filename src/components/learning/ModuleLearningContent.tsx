/**
 * ModuleLearningContent - Mobile-optimized rich content display
 * Now enforces ScrollUniversity pedagogy gates:
 *   • Surfaces module-specific learning objectives, reflective prompt,
 *     and formative checkpoints.
 *   • Blocks module completion until the reflection has a meaningful
 *     answer AND at least 2 of 3 formative checkpoints are attempted.
 */

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen, CheckCircle2, Clock, MessageSquare,
  ChevronLeft, ChevronRight, Bookmark, Share2,
  Lightbulb, PenTool, Award, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormativeCheckpoint {
  prompt: string;
  expected?: string;
}

interface ModuleLearningContentProps {
  module: {
    id: string;
    title: string;
    content_md: string;
    order_index: number;
    duration_minutes?: number;
    rewards_amount?: number;
    content?: any;
    learning_objectives?: any;
    reflective_prompt?: string | null;
    formative_checkpoints?: any;
    progression_level?: number | null;
  };
  courseTitle: string;
  totalModules: number;
  onComplete: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isCompleted?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

const REFLECTION_MIN = 80;
const CHECKPOINT_MIN = 20;

export const ModuleLearningContent = ({
  module,
  totalModules,
  onComplete,
  onNext,
  onPrevious,
  isCompleted = false,
  isFirst = false,
  isLast = false,
}: ModuleLearningContentProps) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [reflection, setReflection] = useState('');
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<number, string>>({});

  const estimatedReadTime = module.duration_minutes || Math.ceil((module.content_md?.length || 0) / 1000);

  const checkpoints: FormativeCheckpoint[] = useMemo(() => {
    const raw = module.formative_checkpoints;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) return (raw as any).items;
    return [];
  }, [module.formative_checkpoints]);

  const reflectionReady = reflection.trim().length >= REFLECTION_MIN;
  const checkpointsAttempted = Object.values(checkpointAnswers).filter((a) => a.trim().length >= CHECKPOINT_MIN).length;
  const checkpointsRequired = Math.min(2, checkpoints.length);
  const gatesPassed = (checkpoints.length === 0 || checkpointsAttempted >= checkpointsRequired)
    && (!module.reflective_prompt || reflectionReady);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    setReadingProgress(Math.min(100, progress));
  };

  return (
    <div className="space-y-4">
      {/* Compact Module Header */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              Module {module.order_index} / {totalModules}
            </Badge>
            <div className="flex items-center gap-2">
              {module.progression_level && (
                <Badge variant="outline" className="text-xs">Level {module.progression_level}</Badge>
              )}
              {module.rewards_amount && (
                <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">
                  <Award className="h-3 w-3 mr-1" />+{module.rewards_amount} XP
                </Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{estimatedReadTime}m</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-lg md:text-xl text-foreground mt-2">{module.title}</CardTitle>

          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Reading</span>
              <span>{Math.round(readingProgress)}%</span>
            </div>
            <Progress value={readingProgress} className="h-1" />
          </div>
        </CardHeader>
      </Card>

      {/* Learning Outcomes */}
      {(() => {
        const objectives: string[] = Array.isArray(module.learning_objectives) && module.learning_objectives.length > 0
          ? module.learning_objectives
          : Array.isArray(module.content?.learning_objectives) ? module.content.learning_objectives : [];
        if (objectives.length === 0) return null;
        return (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-accent" />
                Learning Outcomes for This Module
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ul className="space-y-2">
                {objectives.map((obj, i) => (
                  <li key={i} className="text-sm flex items-start gap-2 text-foreground/90">
                    <CheckCircle2 className="h-4 w-4 text-accent/50 mt-0.5 flex-shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })()}

      {/* Quick Actions Bar - Mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:hidden">
        <Button variant={isBookmarked ? 'default' : 'outline'} size="sm" className="shrink-0 h-9" onClick={() => setIsBookmarked(!isBookmarked)}>
          <Bookmark className={cn('h-3.5 w-3.5 mr-1.5', isBookmarked && 'fill-current')} />
          {isBookmarked ? 'Saved' : 'Save'}
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 h-9" onClick={() => setShowNotes(!showNotes)}>
          <PenTool className="h-3.5 w-3.5 mr-1.5" /> Notes
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 h-9">
          <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
        </Button>
      </div>

      {showNotes && (
        <Card>
          <CardContent className="p-4">
            <textarea
              className="w-full h-32 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              placeholder="Write your notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <ScrollArea className="h-[60vh] md:h-[600px] pr-2 md:pr-4" onScrollCapture={handleScroll}>
                <div className="prose prose-sm md:prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-xl md:text-2xl font-bold text-foreground border-b border-border pb-3 mb-6">{children}</h1>,
                      h2: ({ children }) => (
                        <h2 className="text-lg md:text-xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => <h3 className="text-base md:text-lg font-medium text-foreground mt-6 mb-3">{children}</h3>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-primary bg-primary/5 pl-4 py-3 my-6 italic rounded-r-lg">{children}</blockquote>,
                      ul: ({ children }) => <ul className="space-y-2 my-4">{children}</ul>,
                      li: ({ children }) => (
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{children}</span>
                        </li>
                      ),
                      p: ({ children }) => <p className="leading-relaxed mb-4 text-foreground/90">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">{children}</code>,
                    }}
                  >
                    {module.content_md || 'This module is being prepared by the Faculty Council. Lecture material, readings, and reflection prompts will appear here once published.'}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Formative Checkpoints */}
          {checkpoints.length > 0 && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Check Your Understanding
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Answer at least {checkpointsRequired} of {checkpoints.length} ({CHECKPOINT_MIN}+ characters) before you can complete this module.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkpoints.map((cp, i) => {
                  const answer = checkpointAnswers[i] ?? '';
                  const ready = answer.trim().length >= CHECKPOINT_MIN;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Badge variant={ready ? 'default' : 'outline'} className="text-[10px] mt-0.5">{i + 1}</Badge>
                        <p className="text-sm text-foreground/90 flex-1">{cp.prompt}</p>
                      </div>
                      <textarea
                        className="w-full min-h-[72px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Your answer…"
                        value={answer}
                        onChange={(e) => setCheckpointAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      />
                      {ready && cp.expected && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">Show model answer</summary>
                          <p className="mt-1 italic">{cp.expected}</p>
                        </details>
                      )}
                    </div>
                  );
                })}
                <div className="text-xs text-muted-foreground">
                  Attempted: <span className={cn(checkpointsAttempted >= checkpointsRequired ? 'text-emerald-600 font-medium' : 'text-foreground')}>{checkpointsAttempted}</span> / {checkpoints.length}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reflection */}
          {module.reflective_prompt && (
            <Card className="bg-accent/5 border-accent/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent" /> Reflection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90">{module.reflective_prompt}</p>
                <textarea
                  className="w-full min-h-[120px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                  placeholder="Write your reflection (minimum 80 characters)…"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  {reflection.trim().length} / {REFLECTION_MIN} characters
                  {reflectionReady && <span className="text-emerald-600 ml-2">✓ ready</span>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant={isBookmarked ? 'default' : 'outline'} size="sm" className="w-full justify-start" onClick={() => setIsBookmarked(!isBookmarked)}>
                <Bookmark className={cn('h-4 w-4 mr-2', isBookmarked && 'fill-current')} />
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowNotes(!showNotes)}>
                <PenTool className="h-4 w-4 mr-2" /> Take Notes
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" /> Ask AI Tutor
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Pedagogy Gates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {module.reflective_prompt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reflection</span>
                  <Badge variant={reflectionReady ? 'default' : 'outline'} className={reflectionReady ? 'bg-emerald-500' : ''}>
                    {reflectionReady ? 'Ready' : 'Pending'}
                  </Badge>
                </div>
              )}
              {checkpoints.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Checkpoints</span>
                  <Badge variant={checkpointsAttempted >= checkpointsRequired ? 'default' : 'outline'} className={checkpointsAttempted >= checkpointsRequired ? 'bg-emerald-500' : ''}>
                    {checkpointsAttempted}/{checkpointsRequired}
                  </Badge>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isCompleted ? 'default' : 'outline'} className={isCompleted ? 'bg-green-500' : ''}>
                  {isCompleted ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border p-3 md:p-4 md:relative md:bg-transparent md:border-0 md:backdrop-blur-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={isFirst} className="h-11 touch-target">
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Button
            onClick={onComplete}
            disabled={isCompleted || !gatesPassed}
            size="sm"
            className={cn('h-11 flex-1 max-w-[240px] touch-target', isCompleted && 'bg-green-500 hover:bg-green-600')}
            title={!gatesPassed ? 'Finish the reflection and checkpoints to complete this module' : undefined}
          >
            {!gatesPassed && !isCompleted ? <Lock className="h-4 w-4 mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
            {isCompleted ? 'Completed ✓' : gatesPassed ? 'Complete' : 'Finish gates to complete'}
          </Button>

          <Button variant={isLast ? 'default' : 'outline'} size="sm" onClick={onNext} disabled={isLast && !isCompleted} className="h-11 touch-target">
            <span className="hidden sm:inline">{isLast ? 'Finish' : 'Next'}</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModuleLearningContent;
