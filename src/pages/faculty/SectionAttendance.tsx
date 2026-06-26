import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getSection, getSectionRoster, profilesByIds,
  listAttendanceSessions, createAttendanceSession,
  listAttendanceRecords, markAttendance, attendanceSummary,
  type AttendanceStatus,
} from '@/services/facultyPortal';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

export default function SectionAttendance() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [summary, setSummary] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState('');

  const reload = async () => {
    if (!sectionId) return;
    const [sec, ros, sess, sum] = await Promise.all([
      getSection(sectionId), getSectionRoster(sectionId),
      listAttendanceSessions(sectionId), attendanceSummary(sectionId),
    ]);
    setSection(sec); setRoster(ros); setSessions(sess); setSummary(sum as any[]);
    setProfiles(await profilesByIds(ros.map((r: any) => r.student_user_id)));
    if (sess.length && !activeSession) setActiveSession(sess[0].id);
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [sectionId]);

  useEffect(() => {
    (async () => {
      if (!activeSession) { setRecords({}); return; }
      const recs = await listAttendanceRecords(activeSession);
      const map: Record<string, AttendanceStatus> = {};
      for (const r of recs) map[r.student_user_id] = r.status as AttendanceStatus;
      setRecords(map);
    })();
  }, [activeSession]);

  const createSession = async () => {
    if (!sectionId) return;
    try {
      const s = await createAttendanceSession({ sectionId, date, topic: topic || undefined });
      toast.success('Session created');
      setTopic('');
      setActiveSession(s.id);
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const mark = async (studentId: string, status: AttendanceStatus) => {
    if (!activeSession || !sectionId) return;
    try {
      await markAttendance({ sessionId: activeSession, sectionId, studentId, status });
      setRecords(r => ({ ...r, [studentId]: status }));
    } catch (e: any) { toast.error(e.message); }
  };

  const exportCsv = () => {
    const headers = ['Student', 'Email', 'Sessions', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %'];
    const rows = summary.map((s: any) => {
      const p = profiles[s.student_user_id] || {};
      return [p.display_name || s.student_user_id.slice(0, 8), p.email || '', s.total_sessions, s.present, s.absent, s.late, s.excused, s.attendance_pct ?? ''];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `attendance-${sectionId}.csv`; a.click();
  };

  return (
    <PageTemplate
      title={section ? `Attendance — ${section.section_code}` : 'Attendance'}
      description={section ? `${section.course_code} • ${section.course_title}` : ''}
      actions={<>
        <Button onClick={exportCsv} variant="outline">Export CSV</Button>
        <Button asChild variant="outline"><Link to="/faculty/portal">← Portal</Link></Button>
      </>}
    >
      <Card>
        <CardHeader><CardTitle>New Class Session</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="flex-1 min-w-[200px]"><Label>Topic</Label><Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Module 3 — Kingdom Economics" /></div>
            <Button onClick={createSession}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No sessions yet.</p> : (
            <div className="flex flex-wrap gap-2">
              {sessions.map(s => (
                <Button key={s.id} size="sm" variant={activeSession === s.id ? 'default' : 'outline'} onClick={() => setActiveSession(s.id)}>
                  {s.session_date}{s.topic ? ` — ${s.topic}` : ''}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeSession && (
        <Card>
          <CardHeader><CardTitle>Mark Attendance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Student</th>
                  {STATUSES.map(s => <th key={s} className="p-2 text-center capitalize">{s}</th>)}
                </tr></thead>
                <tbody>
                  {roster.map(r => {
                    const cur = records[r.student_user_id];
                    const p = profiles[r.student_user_id] || {};
                    return (
                      <tr key={r.id} className="border-b">
                        <td className="p-2">{p.display_name || r.student_user_id.slice(0, 8)}</td>
                        {STATUSES.map(s => (
                          <td key={s} className="p-2 text-center">
                            <Button size="sm" variant={cur === s ? 'default' : 'ghost'} onClick={() => mark(r.student_user_id, s)}>
                              {cur === s ? '✓' : '·'}
                            </Button>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Attendance Summary</CardTitle></CardHeader>
        <CardContent>
          {summary.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Student</th><th className="p-2 text-center">Sessions</th>
                  <th className="p-2 text-center">P</th><th className="p-2 text-center">A</th>
                  <th className="p-2 text-center">L</th><th className="p-2 text-center">E</th>
                  <th className="p-2 text-center">%</th><th className="p-2 text-center">Risk</th>
                </tr></thead>
                <tbody>
                  {summary.map((s: any) => {
                    const p = profiles[s.student_user_id] || {};
                    const pct = s.attendance_pct;
                    const risk = pct != null && pct < 70;
                    return (
                      <tr key={s.student_user_id} className="border-b">
                        <td className="p-2">{p.display_name || s.student_user_id.slice(0, 8)}</td>
                        <td className="p-2 text-center">{s.total_sessions}</td>
                        <td className="p-2 text-center">{s.present}</td>
                        <td className="p-2 text-center">{s.absent}</td>
                        <td className="p-2 text-center">{s.late}</td>
                        <td className="p-2 text-center">{s.excused}</td>
                        <td className="p-2 text-center font-semibold">{pct != null ? `${pct}%` : '—'}</td>
                        <td className="p-2 text-center">{risk ? <Badge variant="destructive">At risk</Badge> : <Badge variant="outline">OK</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
