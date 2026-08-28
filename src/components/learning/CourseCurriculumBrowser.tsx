import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, CheckCircle2, ChevronRight, Clock, FileText, Lock, Play, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseModule {
  id: string;
  title: string;
  order_index: number;
  duration_minutes?: number;
  content_md?: string;
  reflective_prompt?: string | null;
  formative_checkpoints?: unknown;
}

interface CourseCurriculumBrowserProps {
  course: { id: string; title: string; description?: string; faculty?: string; level?: string };
  modules: CourseModule[];
  currentModuleId?: string;
  completedModuleIds: string[]; // verified mastery only
  overallProgress: number;
  onModuleSelect: (moduleId: string) => void;
  onStartCourse?: () => void;
}

export const CourseCurriculumBrowser = ({
  course, modules, currentModuleId, completedModuleIds, overallProgress, onModuleSelect, onStartCourse,
}: CourseCurriculumBrowserProps) => {
  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
  const totalMinutes = sorted.reduce((n, m) => n + (m.duration_minutes || 30), 0);
  const completedCount = sorted.filter((m) => completedModuleIds.includes(m.id)).length;

  const statusFor = (moduleId: string, index: number) => {
    if (completedModuleIds.includes(moduleId)) return 'completed';
    if (moduleId === currentModuleId) return 'current';
    if (index === 0) return 'unlocked';
    return completedModuleIds.includes(sorted[index - 1]?.id) ? 'unlocked' : 'locked';
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2 mb-2">{course.faculty && <Badge variant="outline">{course.faculty}</Badge>}{course.level && <Badge variant="secondary">{course.level}</Badge>}</div>
          <CardTitle>{course.title}</CardTitle>
          {course.description && <CardDescription>{course.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 p-3"><div className="text-xl font-bold">{sorted.length}</div><div className="text-xs text-muted-foreground">Modules</div></div>
            <div className="rounded-lg bg-muted/50 p-3"><div className="text-xl font-bold">{Math.round(totalMinutes / 60)}h</div><div className="text-xs text-muted-foreground">Estimated study</div></div>
            <div className="rounded-lg bg-muted/50 p-3"><div className="text-xl font-bold text-primary">{completedCount}</div><div className="text-xs text-muted-foreground">Verified complete</div></div>
          </div>
          <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Verified course progress</span><span>{overallProgress}%</span></div><Progress value={overallProgress} /></div>
          <div className="rounded-lg border p-3 flex gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Completion is derived from trusted module mastery. Reading, reflection, badges or engagement do not mark a module complete.</span></div>
          {completedCount === 0 && onStartCourse && <Button onClick={onStartCourse} className="w-full"><Play className="h-4 w-4 mr-2" />Start course</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex gap-2"><BookOpen className="h-5 w-5" />Course modules</CardTitle><CardDescription>{completedCount}/{sorted.length} verified complete</CardDescription></CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-3">
            <div className="space-y-3">
              {sorted.map((module, index) => {
                const status = statusFor(module.id, index);
                const locked = status === 'locked';
                const completed = status === 'completed';
                const current = status === 'current';
                return (
                  <button
                    key={module.id}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && onModuleSelect(module.id)}
                    className={cn(
                      'w-full text-left rounded-lg border p-4 transition-colors',
                      current && 'border-primary bg-primary/5',
                      completed && 'border-emerald-500/30 bg-emerald-500/5',
                      locked && 'opacity-55 cursor-not-allowed',
                      !locked && 'hover:border-primary/50',
                    )}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={cn('h-9 w-9 rounded-full grid place-items-center shrink-0 bg-muted', completed && 'bg-emerald-600 text-white', current && !completed && 'bg-primary text-primary-foreground')}>
                        {completed ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : current ? <Play className="h-4 w-4" /> : <span className="text-sm font-semibold">{index + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2"><h4 className="font-medium">{module.title}</h4>{!locked && <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1"><span className="flex gap-1"><Clock className="h-3 w-3" />{module.duration_minutes || 30} min</span>{module.content_md && <span className="flex gap-1"><FileText className="h-3 w-3" />Published content</span>}{completed && <span className="text-emerald-700 dark:text-emerald-400">Mastery ≥ 70%</span>}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseCurriculumBrowser;
