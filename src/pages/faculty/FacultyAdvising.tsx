import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  listMyAdvisingNotes, addAdvisingNote,
  listAdvisingFlags, raiseAdvisingFlag, updateFlagStatus,
  type AdvisingVisibility, type FlagType, type FlagSeverity,
} from '@/services/facultyPortal';

export default function FacultyAdvising() {
  const [notes, setNotes] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [visibility, setVisibility] = useState<AdvisingVisibility>('faculty_only');
  const [flagStudent, setFlagStudent] = useState('');
  const [flagType, setFlagType] = useState<FlagType>('at_risk');
  const [severity, setSeverity] = useState<FlagSeverity>('medium');
  const [flagReason, setFlagReason] = useState('');
  const [flagAction, setFlagAction] = useState('');
  const [filter, setFilter] = useState<'open' | 'in_progress' | 'resolved' | 'all'>('open');

  const reload = async () => {
    const [n, f] = await Promise.all([listMyAdvisingNotes(), listAdvisingFlags(filter)]);
    setNotes(n); setFlags(f);
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [filter]);

  const submitNote = async () => {
    if (!studentId || !noteText) return toast.error('Student ID and note required');
    try {
      await addAdvisingNote({ studentId, note: noteText, visibility });
      toast.success('Note saved'); setNoteText(''); setStudentId(''); await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const submitFlag = async () => {
    if (!flagStudent) return toast.error('Student ID required');
    try {
      await raiseAdvisingFlag({ studentId: flagStudent, flagType, severity, reason: flagReason, recommendedAction: flagAction });
      toast.success('Flag raised'); setFlagStudent(''); setFlagReason(''); setFlagAction(''); await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageTemplate title="Advising" description="Notes, at-risk flags, and support recommendations.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add Advising Note</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Student ID (UUID)</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="student user uuid" /></div>
            <div><Label>Note</Label><Textarea rows={4} value={noteText} onChange={e => setNoteText(e.target.value)} /></div>
            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v: AdvisingVisibility) => setVisibility(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty_only">Faculty only (private)</SelectItem>
                  <SelectItem value="registrar_visible">Registrar visible</SelectItem>
                  <SelectItem value="student_visible">Student visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submitNote}>Save Note</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Raise At-Risk Flag</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Student ID</Label><Input value={flagStudent} onChange={e => setFlagStudent(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Type</Label>
                <Select value={flagType} onValueChange={(v: FlagType) => setFlagType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['at_risk','needs_support','academic_warning','attendance','outcome_gap','other'] as FlagType[]).map(t =>
                      <SelectItem key={t} value={t}>{t.replace('_',' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={severity} onValueChange={(v: FlagSeverity) => setSeverity(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low','medium','high','critical'] as FlagSeverity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reason</Label><Textarea rows={2} value={flagReason} onChange={e => setFlagReason(e.target.value)} /></div>
            <div><Label>Recommended Action</Label><Textarea rows={2} value={flagAction} onChange={e => setFlagAction(e.target.value)} /></div>
            <Button onClick={submitFlag}>Raise Flag</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Flags</CardTitle>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? <p className="text-sm text-muted-foreground">No flags.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Student</th><th className="p-2">Type</th><th className="p-2">Severity</th>
                  <th className="p-2">Reason</th><th className="p-2">Status</th><th className="p-2">Update</th>
                </tr></thead>
                <tbody>
                  {flags.map((f: any) => (
                    <tr key={f.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{f.student_user_id.slice(0,8)}</td>
                      <td className="p-2">{f.flag_type}</td>
                      <td className="p-2"><Badge variant={f.severity === 'critical' || f.severity === 'high' ? 'destructive' : 'outline'}>{f.severity}</Badge></td>
                      <td className="p-2 max-w-xs truncate">{f.reason}</td>
                      <td className="p-2"><Badge>{f.status}</Badge></td>
                      <td className="p-2">
                        <Select value={f.status} onValueChange={async (v: any) => { await updateFlagStatus(f.id, v); await reload(); toast.success('Updated'); }}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My Recent Notes</CardTitle></CardHeader>
        <CardContent>
          {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : (
            <ul className="space-y-3">
              {notes.map((n: any) => (
                <li key={n.id} className="border-l-2 border-primary/30 pl-3">
                  <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()} • {n.visibility} • <span className="font-mono">{n.student_user_id.slice(0,8)}</span></div>
                  <p className="text-sm">{n.note}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
