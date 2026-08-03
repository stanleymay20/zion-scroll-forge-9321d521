/**
 * CourseCurriculumBrowser - Browse and navigate course modules
 * Shows all modules with progress tracking and quick access
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  Award,
  Lock,
  Play,
  FileText,
  Star,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseModule {
  id: string;
  title: string;
  order_index: number;
  duration_minutes?: number;
  content_md?: string;
  rewards_amount?: number;
  reflective_prompt?: string | null;
  formative_checkpoints?: unknown;
}

interface CourseCurriculumBrowserProps {
  course: {
    id: string;
    title: string;
    description?: string;
    faculty?: string;
    level?: string;
    rating?: number;
  };
  modules: CourseModule[];
  currentModuleId?: string;
  completedModuleIds: string[];
  overallProgress: number;
  onModuleSelect: (moduleId: string) => void;
  onStartCourse?: () => void;
}

export const CourseCurriculumBrowser = ({
  course,
  modules,
  currentModuleId,
  completedModuleIds,
  overallProgress,
  onModuleSelect,
  onStartCourse
}: CourseCurriculumBrowserProps) => {
  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index);
  
  const totalDuration = sortedModules.reduce((acc, m) => acc + (m.duration_minutes || 30), 0);
  const totalXP = sortedModules.reduce((acc, m) => acc + (m.rewards_amount || 10), 0);
  const completedCount = completedModuleIds.length;
  const modulesWithPedagogy = sortedModules.filter((m) => {
    const checkpoints = Array.isArray(m.formative_checkpoints) ? m.formative_checkpoints.length : 0;
    return !!m.reflective_prompt || checkpoints > 0;
  }).length;

  const getModuleStatus = (moduleId: string, index: number) => {
    if (completedModuleIds.includes(moduleId)) return 'completed';
    if (moduleId === currentModuleId) return 'current';
    // First module is always unlocked
    if (index === 0) return 'unlocked';
    // Module is unlocked if previous is completed
    const previousModule = sortedModules[index - 1];
    if (previousModule && completedModuleIds.includes(previousModule.id)) return 'unlocked';
    return 'locked';
  };

  return (
    <div className="space-y-6">
      {/* Course Overview Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{course.faculty}</Badge>
                <Badge variant="secondary">{course.level}</Badge>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{course.title}</h2>
              {course.description && (
                <p className="text-muted-foreground line-clamp-2">{course.description}</p>
              )}
            </div>
            
            {course.rating && (
              <div className="flex items-center gap-1 bg-background/50 rounded-lg px-3 py-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-foreground">{course.rating}</span>
              </div>
            )}
          </div>
        </div>
        
        <CardContent className="p-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{modules.length}</div>
              <div className="text-xs text-muted-foreground">Modules</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{Math.round(totalDuration / 60)}h</div>
              <div className="text-xs text-muted-foreground">Total Duration</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">{totalXP}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-6 text-sm">
            <div className="rounded-md border p-3">
              <div className="font-medium">Mastery gates</div>
              <div className="text-xs text-muted-foreground">{modulesWithPedagogy}/{modules.length} modules include reflection or checkpoints</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium">Assessment evidence</div>
              <div className="text-xs text-muted-foreground">Module work, outcome checks, and completion record</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium">Academic standard</div>
              <div className="text-xs text-muted-foreground">Original work, citation discipline, and final synthesis</div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="font-medium text-foreground">{overallProgress}% Complete</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {completedCount === 0 && onStartCourse && (
            <Button onClick={onStartCourse} className="w-full mt-4" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Course
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Module List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Curriculum
          </CardTitle>
          <CardDescription>
            {modules.length} modules • {completedCount} completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {sortedModules.map((module, index) => {
                const status = getModuleStatus(module.id, index);
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';
                const isLocked = status === 'locked';

                return (
                  <div
                    key={module.id}
                    className={cn(
                      "group relative rounded-lg border p-4 transition-all cursor-pointer",
                      isCurrent && "border-primary bg-primary/5 ring-1 ring-primary",
                      isCompleted && "border-green-500/30 bg-green-50/50 dark:bg-green-900/10",
                      isLocked && "opacity-60 cursor-not-allowed",
                      !isLocked && !isCurrent && !isCompleted && "hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onClick={() => !isLocked && onModuleSelect(module.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={cn(
                        "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                        isCompleted && "bg-green-500 text-white",
                        isCurrent && "bg-primary text-primary-foreground",
                        !isCompleted && !isCurrent && !isLocked && "bg-muted text-muted-foreground",
                        isLocked && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted && <CheckCircle2 className="h-5 w-5" />}
                        {isCurrent && <Play className="h-5 w-5" />}
                        {!isCompleted && !isCurrent && !isLocked && <span className="font-semibold">{index + 1}</span>}
                        {isLocked && <Lock className="h-4 w-4" />}
                      </div>

                      {/* Module Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={cn(
                              "font-medium text-foreground",
                              isLocked && "text-muted-foreground"
                            )}>
                              {module.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {module.duration_minutes || 30} min
                              </span>
                              {module.rewards_amount && (
                                <span className="flex items-center gap-1 text-accent">
                                  <Award className="h-3 w-3" />
                                  +{module.rewards_amount} XP
                                </span>
                              )}
                              {module.content_md && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Content
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {!isLocked && (
                            <ChevronRight className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform",
                              "group-hover:translate-x-1 group-hover:text-primary"
                            )} />
                          )}
                        </div>

                        {/* Module Description Preview */}
                        {module.content_md && !isLocked && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                            {module.content_md.substring(0, 150).replace(/[#*]/g, '')}...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Current Module Indicator */}
                    {isCurrent && (
                      <div className="absolute -left-px top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
                    )}
                  </div>
                );
              })}

              {/* Course Completion */}
              {completedCount === modules.length && modules.length > 0 && (
                <div className="text-center p-6 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg border border-accent/30">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 text-accent" />
                  <h4 className="font-bold text-lg text-foreground mb-1">Course Completed!</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Congratulations! You've completed all {modules.length} modules.
                  </p>
                  <Badge variant="default" className="bg-accent text-accent-foreground">
                    <Award className="h-3 w-3 mr-1" />
                    {totalXP} XP Earned
                  </Badge>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseCurriculumBrowser;
