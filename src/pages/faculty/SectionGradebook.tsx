import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getSection, getSectionRoster, getSectionGrades,
  submitCourseGrade, profilesByIds,
} from '@/services/facultyPortal';

export default function SectionGradebook() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ studentId: string } | null>(null);
  const [pct, setPct] = useState('');
  const [notes, setNotes] = useState('');
  const [finalize, setFinalize] = useState(false);

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const [sec, ros, grds] = await Promise.all([
        getSection(sectionId), getSectionRoster(sectionId), getSectionGrades(sectionId),
      ]);
      setSection(sec); setRoster(ros); setGrades(grds);
      const ids = Array.from(new Set(ros.map((r: any) => r.student_user_id)));
      setProfiles(await profilesByIds(ids));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [sectionId]);

  const latestByStudent = useMemo(() => {
    const m: Record<string, any> = {};
    for (const g of grades) if (!m[g.student_id]) m[g.student_id] = g;
    return m;
  }, [grades]);

  const submit = async () => {
    if (!active || !sectionId) return;
    const n = Number(pct);
    if (Number.isNaN(n) || n < 0 || n > 100) return toast.error('Percentage must be 0–100');
    try {
      await submitCourseGrade({
        studentId: active.studentId, sectionId,
        percentage: n, notes: notes || undefined, finalize,
      });
      toast.success(finalize ? 'Grade finalized' : 'Grade saved');
      setActive(null); setPct(''); setNotes(''); setFinalize(false);
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageTemplate
      title={section ? `Gradebook — ${section.section_code}` : 'Section Gradebook'}
      description={section ? `${section.course_code} • ${section.course_title} • ${section.term_label}` : ''}
      actions={<Button asChild variant="outline"><Link to="/faculty/portal">← Portal</Link></Button>}
    >
      <Card>
        <CardHeader><CardTitle>Roster ({roster.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Student</th><th className="p-2">Email</th>
                  <th className="p-2 text-center">Current %</th>
                  <th className="p-2 text-center">Letter</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2">Action</th>
                </tr></thead>
                <tbody>
                  {roster.map(r => {
                    const g = latestByStudent[r.student_user_id];
                    const p = profiles[r.student_user_id] || {};
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">{p.display_name || r.student_user_id.slice(0, 8)}</td>
                        <td className="p-2 text-muted-foreground">{p.email || '—'}</td>
                        <td className="p-2 text-center">{g?.percentage != null ? `${g.percentage}%` : '—'}</td>
                        <td className="p-2 text-center font-semibold">{g?.letter_grade || '—'}</td>
                        <td className="p-2 text-center">
                          {g?.is_final ? <Badge>Final</Badge> : g ? <Badge variant="secondary">Draft</Badge> : <Badge variant="outline">Ungraded</Badge>}
                        </td>
                        <td className="p-2">
                          <Dialog open={active?.studentId === r.student_user_id} onOpenChange={(o) => !o && setActive(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => { setActive({ studentId: r.student_user_id }); setPct(g?.percentage?.toString() ?? ''); setNotes(g?.notes ?? ''); }}>
                                {g ? 'Update' : 'Grade'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>{g ? 'Update Grade' : 'Submit Grade'}</DialogTitle></DialogHeader>
                              <div className="space-y-3">
                                <div>
                                  <Label>Percentage (0–100)</Label>
                                  <Input type="number" min={0} max={100} step="0.1" value={pct} onChange={e => setPct(e.target.value)} />
                                </div>
                                <div>
                                  <Label>Notes</Label>
                                  <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" checked={finalize} onChange={e => setFinalize(e.target.checked)} />
                                  Finalize (locks grade except for registrar/admin override)
                                </label>
                                <p className="text-xs text-muted-foreground">Submitting recalculates GPA, standing, and PLO mastery automatically.</p>
                              </div>
                              <DialogFooter>
                                <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
                                <Button onClick={submit}>{finalize ? 'Finalize' : 'Save'}</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grade History</CardTitle></CardHeader>
        <CardContent>
          {grades.length === 0 ? <p className="text-sm text-muted-foreground">No grades posted yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Posted</th><th className="p-2">Student</th>
                  <th className="p-2 text-center">%</th><th className="p-2 text-center">Letter</th>
                  <th className="p-2">Notes</th><th className="p-2">Status</th>
                </tr></thead>
                <tbody>
                  {grades.map(g => (
                    <tr key={g.id} className="border-b">
                      <td className="p-2 text-muted-foreground">{new Date(g.posted_at).toLocaleString()}</td>
                      <td className="p-2 font-mono text-xs">{g.student_id.slice(0, 8)}</td>
                      <td className="p-2 text-center">{g.percentage}</td>
                      <td className="p-2 text-center font-semibold">{g.letter_grade}</td>
                      <td className="p-2 max-w-xs truncate">{g.notes}</td>
                      <td className="p-2"><Badge variant={g.is_final ? 'default' : 'secondary'}>{g.is_final ? 'Final' : g.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
