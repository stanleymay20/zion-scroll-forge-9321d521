import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  ClipboardCheck, Lightbulb, Lock, PenTool, ShieldCheck, Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FormativeCheckpoint { prompt: string; expected?: string }

interface ModuleLearningContentProps {
  module: {
    id: string;
    title: string;
    content_md: string;
    order_index: number;
    duration_minutes?: number;
    content?: any;
    learning_objectives?: any;
    reflective_prompt?: string | null;
    formative_checkpoints?: any;
    progression_level?: number | null;
  };
  courseTitle: string;
  totalModules: number;
  onComplete: () => void; // opens the trusted assessment; it does not certify completion
  onNext?: () => void;
  onPrevious?: () => void;
  isCompleted?: boolean; // verified completion only
  isFirst?: boolean;
  isLast?: boolean;
}

const REFLECTION_MIN = 80;
const CHECKPOINT_MIN = 20;

export const ModuleLearningContent = ({
  module, totalModules, onComplete, onNext, onPrevious,
  isCompleted = false, isFirst = false, isLast = false,
}: ModuleLearningContentProps) => {
  const [bookmarked, setBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [reflection, setReflection] = useState('');
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<number, string>>({});

  const checkpoints: FormativeCheckpoint[] = useMemo(() => {
    const raw = module.formative_checkpoints;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray(raw.items)) return raw.items;
    return [];
  }, [module.formative_checkpoints]);

  const objectives: string[] = Array.isArray(module.learning_objectives) && module.learning_objectives.length
    ? module.learning_objectives
    : Array.isArray(module.content?.learning_objectives) ? module.content.learning_objectives : [];
  const reflectionReady = !module.reflective_prompt || reflection.trim().length >= REFLECTION_MIN;
  const attempted = Object.values(checkpointAnswers).filter((v) => v.trim().length >= CHECKPOINT_MIN).length;
  const required = Math.min(2, checkpoints.length);
  const practiceReady = reflectionReady && (checkpoints.length === 0 || attempted >= required);
  const readTime = module.duration_minutes || Math.max(1, Math.ceil((module.content_md?.length || 0) / 1000));

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Badge variant="outline">Module {module.order_index} / {totalModules}</Badge>{isCompleted && <Badge className="bg-emerald-600"><ShieldCheck className="h-3 w-3 mr-1" />Verified complete</Badge>}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{readTime} min</div>
          </div>
          <CardTitle className="text-xl mt-2">{module.title}</CardTitle>
          <div className="space-y-1 mt-2"><div className="flex justify-between text-xs text-muted-foreground"><span>Reading progress</span><span>{Math.round(readingProgress)}%</span></div><Progress value={readingProgress} className="h-1.5" /></div>
        </CardHeader>
      </Card>

      {objectives.length > 0 && (
        <Card className="border-accent/30 bg-accent/5"><CardHeader className="pb-2"><CardTitle className="text-sm flex gap-2"><Target className="h-4 w-4" />Learning outcomes</CardTitle></CardHeader><CardContent><ul className="space-y-2">{objectives.map((o, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />{o}</li>)}</ul></CardContent></Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant={bookmarked ? 'default' : 'outline'} size="sm" onClick={() => setBookmarked((v) => !v)}><Bookmark className="h-4 w-4 mr-1" />{bookmarked ? 'Saved' : 'Save'}</Button>
        <Button variant="outline" size="sm" onClick={() => setShowNotes((v) => !v)}><PenTool className="h-4 w-4 mr-1" />Notes</Button>
      </div>

      {showNotes && <Card><CardContent className="p-4"><textarea className="w-full min-h-32 p-3 border rounded-lg bg-background" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private study notes…" /></CardContent></Card>}

      <Card>
        <CardContent className="p-5 md:p-7">
          <div
            className="max-h-[65vh] overflow-y-auto pr-2 prose prose-sm md:prose-base dark:prose-invert max-w-none"
            onScroll={(e) => {
              const el = e.currentTarget;
              const denominator = el.scrollHeight - el.clientHeight;
              setReadingProgress(denominator > 0 ? Math.min(100, (el.scrollTop / denominator) * 100) : 100);
            }}
          >
            <ReactMarkdown>{module.content_md || 'This module has not yet been published by the faculty.'}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {checkpoints.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base flex gap-2"><ClipboardCheck className="h-4 w-4" />Practice checks</CardTitle><p className="text-xs text-muted-foreground">These responses prepare you for assessment; they are not verified academic evidence.</p></CardHeader><CardContent className="space-y-4">{checkpoints.map((cp, i) => {
          const answer = checkpointAnswers[i] ?? '';
          const ready = answer.trim().length >= CHECKPOINT_MIN;
          return <div key={i} className="space-y-2"><p className="text-sm font-medium">{i + 1}. {cp.prompt}</p><textarea className="w-full min-h-20 p-2 border rounded-md bg-background" value={answer} onChange={(e) => setCheckpointAnswers((p) => ({ ...p, [i]: e.target.value }))} placeholder="Work through your answer…" />{ready && cp.expected && <details className="text-xs text-muted-foreground"><summary>Compare with guidance</summary><p className="mt-1">{cp.expected}</p></details>}</div>;
        })}<p className="text-xs text-muted-foreground">Practice attempts: {attempted}/{checkpoints.length}</p></CardContent></Card>
      )}

      {module.reflective_prompt && (
        <Card className="border-accent/30 bg-accent/5"><CardHeader><CardTitle className="text-base flex gap-2"><Lightbulb className="h-4 w-4" />Reflection</CardTitle><p className="text-xs text-muted-foreground">Reflection supports learning but does not self-certify mastery.</p></CardHeader><CardContent className="space-y-2"><p className="text-sm">{module.reflective_prompt}</p><textarea className="w-full min-h-28 p-3 border rounded-md bg-background" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Write your reflection…" /><p className="text-xs text-muted-foreground">{reflection.trim().length}/{REFLECTION_MIN} characters</p></CardContent></Card>
      )}

      <Card className={cn(practiceReady ? 'border-primary/30' : 'border-muted')}>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div><p className="font-medium flex items-center gap-2">{practiceReady ? <ClipboardCheck className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4" />}Verified assessment</p><p className="text-xs text-muted-foreground mt-1">Only the server-graded assessment can establish module mastery and completion.</p></div>
          <Button onClick={onComplete} disabled={!practiceReady}>Open verified assessment</Button>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" disabled={isFirst} onClick={onPrevious}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
        <Button variant="outline" disabled={isLast} onClick={onNext}>Next reading<ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
};

export default ModuleLearningContent;
