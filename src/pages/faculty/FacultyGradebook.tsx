/**
 * Sprint D3.4 — Faculty Gradebook & Assessment Workspace (spine)
 *
 * Replaces SectionGradebook's per-student-dialog workflow with an
 * inline grid. All grade writes route through submit_course_grade
 * (single grading engine), either directly via submitCourseGrade or
 * batched via gradebookPublishGrades (which is a thin server-side
 * wrapper). No client-side grading logic.
 *
 * Components (this file):
 *   GradeGrid          — roster × percentage column, inline editing,
 *                        keyboard navigation, per-row pending/saved/error state
 *   BulkActionsBar     — "Publish all pending" / "Provisional save all"
 *   PublishDialog      — confirm bulk publish + show server result summary
 *   FeedbackDrawer     — per-student notes editor (writes via the same RPC)
 *   AssessmentEditor   — scaffold: lists assessments for the section
 *                        (full editor lands in D3.4.2; tracked in sprint log)
 *   RubricPanel        — scaffold: read-only display of rubric scaffold
 *                        tables (full criterion editor lands in D3.4.2)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getSection, getSectionRoster, getSectionGrades, profilesByIds,
  submitCourseGrade, gradebookPublishGrades,
  type BulkPublishMode, type BulkPublishResult,
} from '@/services/facultyPortal';
import { supabase } from '@/integrations/supabase/client';
import { Check, AlertCircle, Loader2, MessageSquare, Lock, FileText, BookOpen, Download } from 'lucide-react';

type RowState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type RowDraft = {
  studentId: string;
  percentage: string;       // string while editing
  serverPercentage: number | null;
  notes: string;
  serverNotes: string;
  state: RowState;
  errorMessage?: string;
  isFinal: boolean;
};

const FacultyGradebook = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [feedbackStudent, setFeedbackStudent] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<BulkPublishMode>('publish');
  const [publishResult, setPublishResult] = useState<BulkPublishResult | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const sectionQ = useQuery({
    queryKey: ['gradebook', 'section', sectionId],
    enabled: !!sectionId,
    queryFn: () => getSection(sectionId!),
  });
  const rosterQ = useQuery({
    queryKey: ['gradebook', 'roster', sectionId],
    enabled: !!sectionId,
    queryFn: () => getSectionRoster(sectionId!),
  });
  const gradesQ = useQuery({
    queryKey: ['gradebook', 'grades', sectionId],
    enabled: !!sectionId,
    queryFn: () => getSectionGrades(sectionId!),
  });
  const profilesQ = useQuery({
    queryKey: ['gradebook', 'profiles', rosterQ.data?.map((r: any) => r.student_user_id).join(',')],
    enabled: !!(rosterQ.data && rosterQ.data.length > 0),
    queryFn: () => profilesByIds((rosterQ.data ?? []).map((r: any) => r.student_user_id)),
  });

  // Seed drafts from server grades once both load.
  useEffect(() => {
    if (!rosterQ.data || !gradesQ.data) return;
    const latest: Record<string, any> = {};
    for (const g of gradesQ.data) {
      if (!latest[g.student_id] || new Date(g.posted_at) > new Date(latest[g.student_id].posted_at)) {
        latest[g.student_id] = g;
      }
    }
    setDrafts((prev) => {
      const next: Record<string, RowDraft> = {};
      for (const r of rosterQ.data as any[]) {
        const sid = r.student_user_id;
        const existing = prev[sid];
        if (existing && existing.state === 'dirty') {
          next[sid] = existing;
          continue;
        }
        const g = latest[sid];
        next[sid] = {
          studentId: sid,
          percentage: g?.percentage != null ? String(g.percentage) : '',
          serverPercentage: g?.percentage ?? null,
          notes: g?.notes ?? '',
          serverNotes: g?.notes ?? '',
          state: g ? 'saved' : 'idle',
          isFinal: !!g?.is_final,
        };
      }
      return next;
    });
  }, [rosterQ.data, gradesQ.data]);

  const orderedRoster = useMemo(() => {
    const list = (rosterQ.data ?? []) as any[];
    return list.slice().sort((a, b) => {
      const an = profilesQ.data?.[a.student_user_id]?.display_name ?? a.student_user_id;
      const bn = profilesQ.data?.[b.student_user_id]?.display_name ?? b.student_user_id;
      return String(an).localeCompare(String(bn));
    });
  }, [rosterQ.data, profilesQ.data]);

  const setCell = (sid: string, percentage: string) => {
    setDrafts((p) => {
      const cur = p[sid];
      if (!cur || cur.isFinal) return p;
      return { ...p, [sid]: { ...cur, percentage, state: 'dirty' } };
    });
  };

  const setNotes = (sid: string, notes: string) => {
    setDrafts((p) => {
      const cur = p[sid];
      if (!cur || cur.isFinal) return p;
      return { ...p, [sid]: { ...cur, notes, state: 'dirty' } };
    });
  };

  const saveOne = async (sid: string, finalize = false) => {
    const d = drafts[sid];
    if (!d || d.isFinal) return;
    const pct = Number(d.percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setDrafts((p) => ({ ...p, [sid]: { ...p[sid], state: 'error', errorMessage: '0-100 only' } }));
      return;
    }
    setDrafts((p) => ({ ...p, [sid]: { ...p[sid], state: 'saving', errorMessage: undefined } }));
    try {
      await submitCourseGrade({
        studentId: sid,
        sectionId: sectionId!,
        percentage: pct,
        notes: d.notes || undefined,
        finalize,
      });
      setDrafts((p) => ({
        ...p,
        [sid]: { ...p[sid], state: 'saved', serverPercentage: pct, serverNotes: d.notes,
                 isFinal: finalize ? true : p[sid].isFinal },
      }));
      qc.invalidateQueries({ queryKey: ['gradebook', 'grades', sectionId] });
    } catch (e: any) {
      setDrafts((p) => ({ ...p, [sid]: { ...p[sid], state: 'error', errorMessage: e.message } }));
      toast.error(`Save failed for ${sid.slice(0, 8)}: ${e.message}`);
    }
  };

  const dirtyRows = useMemo(
    () => Object.values(drafts).filter((d) => d.state === 'dirty' && !d.isFinal),
    [drafts],
  );

  const publish = useMutation({
    mutationFn: async () => {
      const rows = dirtyRows
        .map((d) => ({
          studentId: d.studentId,
          percentage: Number(d.percentage),
          notes: d.notes || undefined,
        }))
        .filter((r) => Number.isFinite(r.percentage) && r.percentage >= 0 && r.percentage <= 100);
      return await gradebookPublishGrades({
        sectionId: sectionId!,
        rows,
        mode: publishMode,
      });
    },
    onSuccess: (result) => {
      setPublishResult(result);
      // Mark every published row as saved
      setDrafts((p) => {
        const next = { ...p };
        for (const r of result.rows) {
          const sid = r.student_id;
          if (next[sid]) {
            next[sid] = {
              ...next[sid],
              state: 'saved',
              serverPercentage: Number(next[sid].percentage),
              serverNotes: next[sid].notes,
              isFinal: r.finalize ? true : next[sid].isFinal,
            };
          }
        }
        return next;
      });
      qc.invalidateQueries({ queryKey: ['gradebook', 'grades', sectionId] });
      toast.success(`${result.published} of ${result.total} grades ${publishMode === 'finalize' ? 'finalized' : 'published'}`);
    },
    onError: (e: any) => {
      toast.error(`Bulk publish failed (entire batch rolled back): ${e.message}`);
    },
  });

  const handleKeyDown = (sid: string, idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveOne(sid, e.shiftKey);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const nextSid = orderedRoster[idx + dir]?.student_user_id;
      if (nextSid) inputRefs.current[nextSid]?.focus();
    }
  };

  const loading = sectionQ.isLoading || rosterQ.isLoading || gradesQ.isLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Gradebook
          </h1>
          <p className="text-muted-foreground mt-1">
            {sectionQ.data
              ? `${sectionQ.data.course_code} · ${sectionQ.data.section_code} · ${sectionQ.data.term_label}`
              : `Section ${sectionId?.slice(0, 8)}…`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            All grades route through{' '}
            <code>submit_course_grade()</code> · bulk via{' '}
            <code>gradebook_publish_grades()</code> (single transaction, audited).
          </p>
        </div>
        <BulkActionsBar
          dirtyCount={dirtyRows.length}
          onPublish={() => { setPublishMode('publish'); setPublishOpen(true); }}
          onProvisional={() => { setPublishMode('provisional'); setPublishOpen(true); }}
          onFinalize={() => { setPublishMode('finalize'); setPublishOpen(true); }}
        />
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Grade grid</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="rubric">Rubric</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roster · {orderedRoster.length} student(s)</CardTitle>
              <CardDescription>
                Edit a cell, then press <kbd className="border rounded px-1">Enter</kbd> to save,
                <kbd className="border rounded px-1 ml-1">Shift</kbd>+
                <kbd className="border rounded px-1">Enter</kbd> to save &amp; finalize, or use
                arrow keys to navigate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading…</p>
                : orderedRoster.length === 0 ? <p className="text-muted-foreground">No roster.</p>
                : <GradeGrid
                    roster={orderedRoster}
                    profiles={profilesQ.data ?? {}}
                    drafts={drafts}
                    inputRefs={inputRefs}
                    onCellChange={setCell}
                    onCellKeyDown={handleKeyDown}
                    onCellBlur={(sid) => void saveOne(sid, false)}
                    onOpenFeedback={setFeedbackStudent}
                  />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <AssessmentEditor sectionId={sectionId} />
        </TabsContent>

        <TabsContent value="rubric">
          <RubricPanel sectionId={sectionId} />
        </TabsContent>
      </Tabs>

      <FeedbackDrawer
        open={!!feedbackStudent}
        student={feedbackStudent}
        draft={feedbackStudent ? drafts[feedbackStudent] : null}
        onNotesChange={(notes) => feedbackStudent && setNotes(feedbackStudent, notes)}
        onClose={() => setFeedbackStudent(null)}
        onSave={async () => {
          if (!feedbackStudent) return;
          await saveOne(feedbackStudent, false);
          setFeedbackStudent(null);
        }}
      />

      <PublishDialog
        open={publishOpen}
        mode={publishMode}
        dirtyCount={dirtyRows.length}
        result={publishResult}
        isPending={publish.isPending}
        onConfirm={() => {
          setPublishResult(null);
          publish.mutate();
        }}
        onClose={() => { setPublishOpen(false); setPublishResult(null); }}
      />
    </div>
  );
};

// ============================================================================
// Components — co-located so the spine fits in one reviewable file
// ============================================================================

const stateIcon = (s: RowState) => {
  if (s === 'saving') return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (s === 'saved') return <Check className="h-3 w-3 text-emerald-600" />;
  if (s === 'error') return <AlertCircle className="h-3 w-3 text-destructive" />;
  if (s === 'dirty') return <span className="text-xs text-amber-600">●</span>;
  return null;
};

const GradeGrid = ({
  roster, profiles, drafts, inputRefs, onCellChange, onCellKeyDown, onCellBlur, onOpenFeedback,
}: {
  roster: any[];
  profiles: Record<string, any>;
  drafts: Record<string, RowDraft>;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onCellChange: (sid: string, value: string) => void;
  onCellKeyDown: (sid: string, idx: number) => React.KeyboardEventHandler<HTMLInputElement>;
  onCellBlur: (sid: string) => void;
  onOpenFeedback: (sid: string) => void;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-2 pr-4 font-medium">Student</th>
          <th className="py-2 pr-4 font-medium w-32">Percentage</th>
          <th className="py-2 pr-4 font-medium w-24">Status</th>
          <th className="py-2 pr-4 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {roster.map((r, idx) => {
          const sid = r.student_user_id;
          const d = drafts[sid];
          const prof = profiles[sid];
          if (!d) return null;
          return (
            <tr key={sid} className="border-b last:border-0">
              <td className="py-2 pr-4">
                <div className="font-medium">{prof?.display_name ?? sid.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{prof?.email ?? '—'}</div>
              </td>
              <td className="py-2 pr-4">
                <div className="flex items-center gap-1">
                  <Input
                    ref={(el) => { inputRefs.current[sid] = el; }}
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={d.percentage}
                    disabled={d.isFinal || d.state === 'saving'}
                    onChange={(e) => onCellChange(sid, e.target.value)}
                    onKeyDown={onCellKeyDown(sid, idx)}
                    onBlur={() => d.state === 'dirty' && onCellBlur(sid)}
                    className="h-8 w-20"
                    aria-label={`Grade for ${prof?.display_name ?? sid}`}
                  />
                  {stateIcon(d.state)}
                </div>
                {d.errorMessage && (
                  <div className="text-xs text-destructive mt-1">{d.errorMessage}</div>
                )}
              </td>
              <td className="py-2 pr-4">
                {d.isFinal ? (
                  <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />final</Badge>
                ) : d.serverPercentage != null ? (
                  <Badge variant="outline">posted</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2 pr-4">
                <Button size="sm" variant="ghost" onClick={() => onOpenFeedback(sid)}>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {d.notes ? 'Edit notes' : 'Add notes'}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const BulkActionsBar = ({
  dirtyCount, onPublish, onProvisional, onFinalize,
}: {
  dirtyCount: number;
  onPublish: () => void;
  onProvisional: () => void;
  onFinalize: () => void;
}) => (
  <div className="flex flex-col items-end gap-2">
    <Badge variant={dirtyCount > 0 ? 'default' : 'outline'}>
      {dirtyCount} unsaved row(s)
    </Badge>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={dirtyCount === 0} onClick={onProvisional}>
        Provisional save all
      </Button>
      <Button size="sm" disabled={dirtyCount === 0} onClick={onPublish}>
        Publish all pending
      </Button>
      <Button size="sm" variant="destructive" disabled={dirtyCount === 0} onClick={onFinalize}>
        <Lock className="h-3 w-3 mr-1" />Finalize
      </Button>
    </div>
  </div>
);

const PublishDialog = ({
  open, mode, dirtyCount, result, isPending, onConfirm, onClose,
}: {
  open: boolean;
  mode: BulkPublishMode;
  dirtyCount: number;
  result: BulkPublishResult | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {mode === 'finalize' ? 'Finalize grades' : mode === 'provisional' ? 'Provisional save' : 'Publish grades'}
        </DialogTitle>
        <DialogDescription>
          {result
            ? `Server result: ${result.published}/${result.total} rows in correlation_id ${result.correlation_id.slice(0,8)}…`
            : mode === 'finalize'
            ? `${dirtyCount} grade(s) will be finalized and become immutable. This action cannot be undone.`
            : mode === 'provisional'
            ? `${dirtyCount} grade(s) will be saved as provisional (status='posted', not final).`
            : `${dirtyCount} grade(s) will be published. The entire batch is atomic — if any single row fails, all roll back.`}
        </DialogDescription>
      </DialogHeader>
      {result && (
        <div className="text-sm space-y-1">
          <div>Mode: <code>{result.publish_mode}</code></div>
          <div>Section: <code>{result.section_id.slice(0,8)}…</code></div>
          <div>Correlation ID: <code>{result.correlation_id}</code></div>
          <div className="text-xs text-muted-foreground">
            Every row's audit row is queryable in <code>ops_log</code> by this correlation_id.
          </div>
        </div>
      )}
      <DialogFooter>
        {!result && (
          <Button disabled={isPending} onClick={onConfirm} variant={mode === 'finalize' ? 'destructive' : 'default'}>
            {isPending ? 'Submitting…' : `Confirm ${mode}`}
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const FeedbackDrawer = ({
  open, student, draft, onNotesChange, onClose, onSave,
}: {
  open: boolean;
  student: string | null;
  draft: RowDraft | null;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Lecturer feedback</DialogTitle>
        <DialogDescription>
          Notes saved alongside the grade row via the same{' '}
          <code>submit_course_grade</code> call.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Student</Label>
          <div className="text-sm"><code>{student?.slice(0, 8)}…</code></div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={draft?.notes ?? ''}
            disabled={draft?.isFinal}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="What worked, what to improve, references for the next attempt…"
            rows={6}
          />
        </div>
        {draft?.isFinal && (
          <p className="text-xs text-muted-foreground">
            Grade is finalized — notes are immutable. Open a registrar grade-change request to revise.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button onClick={() => void onSave()} disabled={draft?.isFinal || draft?.state === 'saving'}>
          Save notes
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// --- Scaffold panels — full editors land in D3.4.2 -------------------

const AssessmentEditor = ({ sectionId }: { sectionId?: string }) => {
  const q = useQuery({
    queryKey: ['gradebook', 'assessments', sectionId],
    enabled: !!sectionId,
    queryFn: async () => {
      // assignments table has multiple competing definitions across migrations;
      // a real editor needs D4 schema unification. For now: best-effort list.
      const { data, error } = await (supabase as any)
        .from('assignments')
        .select('id, title, max_points, due_date')
        .limit(50);
      if (error) return [];
      return (data ?? []) as { id: string; title: string; max_points: number | null; due_date: string | null }[];
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessments</CardTitle>
        <CardDescription>
          Read-only list. Create/edit/archive/weight/lock editor lands in
          <strong> D3.4.2</strong> alongside the rubric editor — both depend on
          <code> assignments</code> schema unification (currently 3 competing
          definitions across migrations).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-muted-foreground">Loading…</p>
          : (q.data ?? []).length === 0 ? <p className="text-muted-foreground">No assessments visible.</p>
          : <ul className="text-sm space-y-1">
              {q.data!.map((a) => (
                <li key={a.id} className="flex items-center justify-between border rounded-md p-2">
                  <span>{a.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.max_points ?? '—'} pts · due {a.due_date ?? '—'}
                  </span>
                </li>
              ))}
            </ul>}
      </CardContent>
    </Card>
  );
};

const RubricPanel = ({ sectionId }: { sectionId?: string }) => {
  const q = useQuery({
    queryKey: ['gradebook', 'rubric', sectionId],
    enabled: !!sectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('grade_rubrics')
        .select('id, title, description, total_weight, grade_rubric_criteria(id, criterion, weight, max_score, ordinal)')
        .eq('section_id', sectionId);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle><BookOpen className="h-4 w-4 inline mr-1" />Rubrics</CardTitle>
        <CardDescription>
          Scaffold tables live (<code>grade_rubrics</code>, <code>grade_rubric_criteria</code>,
          <code> grade_rubric_scores</code>). Editor + total-to-grade RPC ship in
          <strong> D3.4.2</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <p className="text-muted-foreground">Loading…</p>
          : (q.data ?? []).length === 0 ? <p className="text-muted-foreground">No rubrics configured for this section.</p>
          : <div className="space-y-2">
              {q.data!.map((r: any) => (
                <div key={r.id} className="border rounded-md p-2">
                  <div className="font-medium">{r.title}</div>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  <ul className="text-sm mt-2 space-y-1">
                    {(r.grade_rubric_criteria ?? []).map((c: any) => (
                      <li key={c.id} className="flex justify-between">
                        <span>{c.criterion}</span>
                        <span className="text-xs text-muted-foreground">
                          weight {c.weight} · max {c.max_score}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>}
      </CardContent>
    </Card>
  );
};

export default FacultyGradebook;
