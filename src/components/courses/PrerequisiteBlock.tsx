/**
 * Visual block for unmet prerequisites. Used on course detail and
 * learning pages alongside the hard enforcement in `useEnrollInCourse`.
 */
import { AlertCircle, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PrerequisiteResult } from '@/hooks/usePrerequisiteCheck';

interface Props {
  result: PrerequisiteResult;
  onRetry?: () => void;
  variant?: 'card' | 'inline';
}

export function PrerequisiteBlock({ result, onRetry, variant = 'card' }: Props) {
  const missing = result.missing_prerequisites ?? [];
  const body = (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        You must complete the following prerequisite course
        {missing.length === 1 ? '' : 's'} before starting this course:
      </p>
      <ul className="space-y-2">
        {missing.map((p) => (
          <li
            key={p.course_id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3"
          >
            <span className="text-sm font-medium text-foreground">
              {p.title || 'Prerequisite course'}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to={`/courses/${p.course_id}`}>Go to course</Link>
            </Button>
          </li>
        ))}
      </ul>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Re-check eligibility
        </Button>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 p-4 dark:bg-amber-950/20">
        <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-semibold">Prerequisites required</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-5 w-5" /> Prerequisites required
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
