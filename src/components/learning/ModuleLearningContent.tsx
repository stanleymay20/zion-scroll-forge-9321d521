/**
 * ModuleLearningContent - Mobile-optimized rich content display
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen, CheckCircle2, Clock, FileText, MessageSquare,
  ChevronLeft, ChevronRight, Bookmark, Share2,
  Lightbulb, PenTool, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleLearningContentProps {
  module: {
    id: string;
    title: string;
    content_md: string;
    order_index: number;
    duration_minutes?: number;
    rewards_amount?: number;
    content?: any;
    learning_objectives?: string[] | null;
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

export const ModuleLearningContent = ({
  module,
  courseTitle,
  totalModules,
  onComplete,
  onNext,
  onPrevious,
  isCompleted = false,
  isFirst = false,
  isLast = false
}: ModuleLearningContentProps) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const estimatedReadTime = module.duration_minutes || Math.ceil((module.content_md?.length || 0) / 1000);
  
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
          <CardTitle className="text-lg md:text-xl text-foreground mt-2">
            {module.title}
          </CardTitle>
          
          {/* Reading Progress */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Reading</span>
              <span>{Math.round(readingProgress)}%</span>
            </div>
            <Progress value={readingProgress} className="h-1" />
          </div>
        </CardHeader>
      </Card>

      {/* Learning Outcomes for this Module */}
      {(() => {
        const objectives: string[] = Array.isArray(module.learning_objectives) && module.learning_objectives.length > 0
          ? module.learning_objectives
          : Array.isArray(module.content?.learning_objectives)
            ? module.content.learning_objectives
            : [];
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
              <p className="text-xs text-muted-foreground mt-3 italic">
                Mastery for each outcome will be tracked once you complete the module assessment.
              </p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Quick Actions Bar - Mobile Horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:hidden">
        <Button
          variant={isBookmarked ? "default" : "outline"}
          size="sm"
          className="shrink-0 h-9"
          onClick={() => setIsBookmarked(!isBookmarked)}
        >
          <Bookmark className={cn("h-3.5 w-3.5 mr-1.5", isBookmarked && "fill-current")} />
          {isBookmarked ? 'Saved' : 'Save'}
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 h-9" onClick={() => setShowNotes(!showNotes)}>
          <PenTool className="h-3.5 w-3.5 mr-1.5" /> Notes
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 h-9">
          <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
        </Button>
      </div>

      {/* Notes Panel (Collapsible) */}
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
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4 md:p-6">
              <ScrollArea className="h-[60vh] md:h-[600px] pr-2 md:pr-4" onScrollCapture={handleScroll}>
                <div className="prose prose-sm md:prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl md:text-2xl font-bold text-foreground border-b border-border pb-3 mb-6">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg md:text-xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base md:text-lg font-medium text-foreground mt-6 mb-3">
                          {children}
                        </h3>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary bg-primary/5 pl-4 py-3 my-6 italic rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-2 my-4">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{children}</span>
                        </li>
                      ),
                      p: ({ children }) => (
                        <p className="leading-relaxed mb-4 text-foreground/90">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                          {children}
                        </code>
                      )
                    }}
                  >
                    {module.content_md || 'This module is being prepared by the Faculty Council. Lecture material, readings, and reflection prompts will appear here once published. In the meantime, review the learning objectives above and engage your assigned AI Tutor for foundational concepts.'}
                  </ReactMarkdown>
                </div>
                
                {/* Reflection */}
                {module.content_md && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="bg-accent/5 rounded-lg p-4 md:p-6 border border-accent/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-5 w-5 text-accent" />
                        <h4 className="font-semibold text-foreground">Reflection</h4>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Take a moment to reflect on what you've learned. 
                        How does this connect to your spiritual journey and purpose?
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={isBookmarked ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsBookmarked(!isBookmarked)}
              >
                <Bookmark className={cn("h-4 w-4 mr-2", isBookmarked && "fill-current")} />
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Module Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{estimatedReadTime} min</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isCompleted ? "default" : "outline"} className={isCompleted ? "bg-green-500" : ""}>
                  {isCompleted ? 'Completed' : 'In Progress'}
                </Badge>
              </div>
              {module.rewards_amount && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">XP Reward</span>
                    <span className="text-accent font-medium">{module.rewards_amount} XP</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border p-3 md:p-4 md:relative md:bg-transparent md:border-0 md:backdrop-blur-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={isFirst}
            className="h-11 touch-target"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Button
            onClick={onComplete}
            disabled={isCompleted}
            size="sm"
            className={cn(
              "h-11 flex-1 max-w-[200px] touch-target",
              isCompleted && "bg-green-500 hover:bg-green-600"
            )}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {isCompleted ? 'Completed ✓' : 'Complete'}
          </Button>

          <Button
            variant={isLast ? "default" : "outline"}
            size="sm"
            onClick={onNext}
            disabled={isLast && !isCompleted}
            className="h-11 touch-target"
          >
            <span className="hidden sm:inline">{isLast ? 'Finish' : 'Next'}</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModuleLearningContent;