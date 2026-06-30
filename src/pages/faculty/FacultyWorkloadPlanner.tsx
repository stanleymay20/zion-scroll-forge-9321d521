/**
 * Sprint D3.5 — Faculty Workload Planner
 *
 * Six-dimensional load view + append-only proposal staging. Read and plan
 * only — no academic-engine writes. Promotion of accepted proposals into
 * faculty_teaching_assignments lands in D4 (Registrar).
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CalendarClock, GraduationCap, Users, Bot, AlertTriangle, Pencil, Send, FileText,
} from 'lucide-react';

type LoadRow = {
  faculty_user_id: string;
  term_label: string;
  section_count: number;
  credit_hours: number;
  distinct_preps: number;
  weekly_grading_minutes: number;
  weekly_office_hours_minutes: number;
  advisee_count: number;
  weekly_support_minutes: number;
  ai_avatar_sessions_supervised: number;
  conflict_count: number;
};

type Policy = {
  policy_code: string;
  max_sections: number;
  max_credit_hours: number;
  max_distinct_preps: number;
  max_advisees: number;
  max_weekly_grading_minutes: number;
  max_weekly_office_hours_minutes: number;
  max_weekly_support_minutes: number;
  max_ai_avatar_sessions_supervised: number;
};

type Proposal = {
  id: string;
  section_id: string | null;
  role: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  notes: string | null;
  created_at: string;
  term_id: string | null;
};

const fmtMin = (m: number) => `${Math.round(m)} min/wk`;

export default function FacultyWorkloadPlanner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [proposeOpen, setProposeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pickedSection, setPickedSection] = useState<string | null>(null);
  const [role, setRole] = useState<'primary' | 'co_instructor' | 'ta'>('primary');
  const [notes, setNotes] = useState('');

  const policyQ = useQuery({
    queryKey: ['workload', 'policy'],
    queryFn: async (): Promise<Policy | null> => {
      const { data } = await (supabase as any)
        .from('faculty_workload_policies')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
      return data ?? null;
    },
  });

  const loadQ = useQuery({
    queryKey: ['workload', 'self', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LoadRow[]> => {
      const { data, error } = await (supabase as any)
        .from('vw_faculty_workload_term')
        .select('*')
        .eq('faculty_user_id', user!.id)
        .order('term_label', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LoadRow[];
    },
  });

  const conflictsQ = useQuery({
    queryKey: ['workload', 'conflicts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('vw_faculty_workload_conflicts')
        .select('*')
        .eq('faculty_user_id', user!.id);
      return (data ?? []) as any[];
    },
  });

  const proposalsQ = useQuery({
    queryKey: ['workload', 'proposals', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Proposal[]> => {
      const { data, error } = await (supabase as any)
        .from('faculty_workload_proposals')
        .select('id, section_id, role, status, notes, created_at, term_id')
        .eq('faculty_user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Proposal[];
    },
  });

  const sectionSearchQ = useQuery({
    queryKey: ['workload', 'section-search', search],
    enabled: proposeOpen,
    queryFn: async () => {
      let q = (supabase as any)
        .from('course_sections')
        .select('id, course_code, section_code, term_label, credit_hours')
        .eq('active', true)
        .limit(20);
      if (search.trim()) q = q.ilike('course_code', `%${search.trim()}%`);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  const propose = useMutation({
    mutationFn: async () => {
      if (!pickedSection) throw new Error('Pick a section');
      const { data, error } = await (supabase as any)
        .rpc('workload_propose_assignment', {
          _section_id: pickedSection,
          _role: role,
          _notes: notes || null,
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Proposal saved as draft');
      setProposeOpen(false); setPickedSection(null); setNotes('');
      qc.invalidateQueries({ queryKey: ['workload', 'proposals'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save proposal'),
  });

  const submitAll = useMutation({
    mutationFn: async (termId: string) => {
      const { data, error } = await (supabase as any)
        .rpc('workload_submit_proposals', { _term_id: termId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${n} proposal(s) submitted for review`);
      qc.invalidateQueries({ queryKey: ['workload', 'proposals'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Submission failed'),
  });

  const currentTerm = loadQ.data?.[0];
  const policy = policyQ.data;

  const draftTermIds = useMemo(() => {
    const s = new Set<string>();
    (proposalsQ.data ?? []).forEach((p) => p.status === 'draft' && p.term_id && s.add(p.term_id));
    return Array.from(s);
  }, [proposalsQ.data]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarClock className="h-7 w-7" /> Workload Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Six-dimensional view of your term load: teaching, grading, office hours,
            student support, AI avatar oversight, and schedule conflicts.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Caps are <strong>advisory</strong>. Going over flags for dean review — it
            does not block submission.
          </p>
        </div>
        <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
          <DialogTrigger asChild>
            <Button><Pencil className="h-4 w-4 mr-1" /> Propose to teach</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Propose a teaching assignment</DialogTitle>
              <DialogDescription>
                Saved as a <strong>draft</strong>. Submit drafts as a batch from the
                Proposals tab. Acceptance lands in D4 Registrar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Search sections by course code</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="THEO101" />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded">
                {(sectionSearchQ.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPickedSection(s.id)}
                    className={`block w-full text-left text-sm px-2 py-1.5 hover:bg-muted ${
                      pickedSection === s.id ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {s.course_code} · {s.section_code} · {s.term_label} · {s.credit_hours}cr
                  </button>
                ))}
                {sectionSearchQ.isFetched && (sectionSearchQ.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No matching sections.</p>
                )}
              </div>
              <div>
                <Label>Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full border rounded h-9 px-2 text-sm bg-background"
                >
                  <option value="primary">Primary instructor</option>
                  <option value="co_instructor">Co-instructor</option>
                  <option value="ta">Teaching assistant</option>
                </select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProposeOpen(false)}>Cancel</Button>
              <Button disabled={!pickedSection || propose.isPending} onClick={() => propose.mutate()}>
                {propose.isPending ? 'Saving…' : 'Save draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Term summary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts ({conflictsQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="proposals">Proposals ({proposalsQ.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {!currentTerm ? (
            <Card><CardContent className="py-8 text-muted-foreground text-sm">
              No teaching assignments found for any term yet.
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                icon={<GraduationCap className="h-5 w-5" />}
                title="Teaching"
                lines={[
                  bar('Sections', currentTerm.section_count, policy?.max_sections ?? 4),
                  bar('Credit hours', Number(currentTerm.credit_hours), Number(policy?.max_credit_hours ?? 12)),
                  bar('Distinct preps', currentTerm.distinct_preps, policy?.max_distinct_preps ?? 3),
                ]}
              />
              <MetricCard
                icon={<FileText className="h-5 w-5" />}
                title="Grading load"
                lines={[
                  bar(fmtMin(currentTerm.weekly_grading_minutes),
                      currentTerm.weekly_grading_minutes,
                      policy?.max_weekly_grading_minutes ?? 600),
                ]}
                footnote="Estimate: roster × per-assignment minutes ÷ 14-week term."
              />
              <MetricCard
                icon={<CalendarClock className="h-5 w-5" />}
                title="Office hours"
                lines={[
                  bar(fmtMin(currentTerm.weekly_office_hours_minutes),
                      currentTerm.weekly_office_hours_minutes,
                      policy?.max_weekly_office_hours_minutes ?? 240),
                ]}
                footnote="Will populate once the office-hours substrate exposes a faculty link."
              />
              <MetricCard
                icon={<Users className="h-5 w-5" />}
                title="Student support"
                lines={[
                  bar('Advisees', currentTerm.advisee_count, policy?.max_advisees ?? 25),
                  bar(fmtMin(currentTerm.weekly_support_minutes),
                      currentTerm.weekly_support_minutes,
                      policy?.max_weekly_support_minutes ?? 300),
                ]}
                footnote="Support minutes estimated from open advising flags."
              />
              <MetricCard
                icon={<Bot className="h-5 w-5" />}
                title="AI avatar oversight"
                lines={[
                  bar('Sessions + open reviews',
                      currentTerm.ai_avatar_sessions_supervised,
                      policy?.max_ai_avatar_sessions_supervised ?? 20),
                ]}
                footnote="Hosted lecture sessions (last 90d) + open human-review requests."
              />
              <MetricCard
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Conflicts"
                lines={[
                  bar('Detected', currentTerm.conflict_count, 0),
                ]}
                footnote="Advisory: same meeting-time string within the term."
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Term-by-term load</CardTitle>
              <CardDescription>Read-only history of all aggregated dimensions.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadQ.isLoading ? <p className="text-muted-foreground">Loading…</p>
                : (loadQ.data ?? []).length === 0 ? <p className="text-muted-foreground">No data.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left">
                        <tr>
                          <th className="py-2 pr-4">Term</th>
                          <th className="py-2 pr-4">Sect.</th>
                          <th className="py-2 pr-4">Cr.hrs</th>
                          <th className="py-2 pr-4">Preps</th>
                          <th className="py-2 pr-4">Grading/wk</th>
                          <th className="py-2 pr-4">Office/wk</th>
                          <th className="py-2 pr-4">Advisees</th>
                          <th className="py-2 pr-4">Support/wk</th>
                          <th className="py-2 pr-4">AI overs.</th>
                          <th className="py-2 pr-4">Conf.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(loadQ.data ?? []).map((r) => (
                          <tr key={r.term_label} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{r.term_label}</td>
                            <td className="py-2 pr-4">{r.section_count}</td>
                            <td className="py-2 pr-4">{Number(r.credit_hours).toFixed(1)}</td>
                            <td className="py-2 pr-4">{r.distinct_preps}</td>
                            <td className="py-2 pr-4">{r.weekly_grading_minutes}</td>
                            <td className="py-2 pr-4">{r.weekly_office_hours_minutes}</td>
                            <td className="py-2 pr-4">{r.advisee_count}</td>
                            <td className="py-2 pr-4">{r.weekly_support_minutes}</td>
                            <td className="py-2 pr-4">{r.ai_avatar_sessions_supervised}</td>
                            <td className="py-2 pr-4">{r.conflict_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle>Schedule conflicts</CardTitle>
              <CardDescription>
                Advisory pairs (same meeting string). Interval-overlap detection lands
                in D4 once structured meeting patterns are captured.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(conflictsQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No conflicts detected.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {(conflictsQ.data ?? []).map((c, i) => (
                    <li key={i} className="border rounded p-2">
                      <span className="font-medium">{c.term_label}</span> · {c.course_a}/{c.section_code_a}
                      {' '}↔ {c.course_b}/{c.section_code_b}
                      <div className="text-xs text-muted-foreground">{c.meeting_info}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals">
          <Card>
            <CardHeader>
              <CardTitle>My proposals</CardTitle>
              <CardDescription>
                Drafts stay private until you submit them as a batch per term.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {draftTermIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draftTermIds.map((tid) => (
                    <Button key={tid} size="sm" variant="default"
                            disabled={submitAll.isPending}
                            onClick={() => submitAll.mutate(tid)}>
                      <Send className="h-3 w-3 mr-1" /> Submit drafts for term {tid.slice(0, 8)}
                    </Button>
                  ))}
                </div>
              )}
              {(proposalsQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No proposals yet.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {(proposalsQ.data ?? []).map((p) => (
                    <li key={p.id} className="border rounded p-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs">{p.section_id?.slice(0, 8)}…</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString()} · role: {p.role}
                        </div>
                        {p.notes && <div className="text-xs mt-1">{p.notes}</div>}
                      </div>
                      <Badge variant={
                        p.status === 'accepted' ? 'default'
                        : p.status === 'rejected' ? 'destructive'
                        : p.status === 'submitted' ? 'secondary'
                        : 'outline'
                      }>{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- helpers ----------------------------------------------------------

function bar(label: string, value: number, cap: number) {
  const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : value > 0 ? 100 : 0;
  const over = cap > 0 && value > cap;
  return { label, value, cap, pct, over };
}

function MetricCard({
  icon, title, lines, footnote,
}: {
  icon: React.ReactNode;
  title: string;
  lines: { label: string; value: number; cap: number; pct: number; over: boolean }[];
  footnote?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.map((l, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span>{l.label}</span>
              <span className={l.over ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {l.value}{l.cap > 0 ? ` / ${l.cap}` : ''}{l.over ? ' (over cap)' : ''}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${l.over ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${l.pct}%` }}
              />
            </div>
          </div>
        ))}
        {footnote && <p className="text-[11px] text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}
