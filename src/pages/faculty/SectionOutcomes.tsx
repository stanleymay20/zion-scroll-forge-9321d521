import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getSection, getSectionRoster, profilesByIds,
  courseOutcomeAttainment, recomputeCLO, openIntervention,
} from '@/services/facultyPortal';

export default function SectionOutcomes() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [attainment, setAttainment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const sec = await getSection(sectionId);
      setSection(sec);
      const [ros, att] = await Promise.all([
        getSectionRoster(sectionId),
        sec?.course_id ? courseOutcomeAttainment(sec.course_id) : Promise.resolve(null),
      ]);
      setRoster(ros);
      setProfiles(await profilesByIds(ros.map((r: any) => r.student_user_id)));
      setAttainment(att);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [sectionId]);

  const recompute = async (studentId: string) => {
    if (!section?.course_id) return;
    try {
      const n = await recomputeCLO(studentId, section.course_id);
      toast.success(`Recomputed ${n} CLO mastery rows`);
    } catch (e: any) { toast.error(e.message); }
  };

  const flagWeak = async (cloId: string, label: string, current: number) => {
    if (!section?.course_id) return;
    try {
      await openIntervention({
        scope: 'course', scopeId: section.course_id,
        finding: `Weak CLO attainment: ${label} (${current}%)`,
        recommendation: 'Add targeted practice + reflective checkpoint; rerun mastery after 2 weeks.',
        baseline: current, target: 70,
      });
      toast.success('Intervention opened');
    } catch (e: any) { toast.error(e.message); }
  };

  const clos: any[] = (attainment as any)?.clos ?? [];

  return (
    <PageTemplate
      title={section ? `Outcomes — ${section.section_code}` : 'Outcomes'}
      description={section ? `${section.course_code} • ${section.course_title}` : ''}
      actions={<Button asChild variant="outline"><Link to="/faculty/portal">← Portal</Link></Button>}
    >
      <Card>
        <CardHeader><CardTitle>Course Learning Outcomes — Cohort Attainment</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : clos.length === 0 ? <p className="text-sm text-muted-foreground">No CLO attainment data yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b"><tr className="text-left">
                    <th className="p-2">CLO</th>
                    <th className="p-2 text-center">Cohort %</th>
                    <th className="p-2 text-center">Mastered</th>
                    <th className="p-2 text-center">Evidence</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Action</th>
                  </tr></thead>
                  <tbody>
                    {clos.map((c: any) => {
                      const weak = (c.avg_attainment ?? 0) < 70;
                      return (
                        <tr key={c.clo_id ?? c.id} className="border-b">
                          <td className="p-2 max-w-md">{c.description ?? c.code}</td>
                          <td className="p-2 text-center font-semibold">{Math.round(c.avg_attainment ?? 0)}%</td>
                          <td className="p-2 text-center">{c.mastered_count ?? 0}/{c.total_students ?? 0}</td>
                          <td className="p-2 text-center">{c.evidence_count ?? 0}</td>
                          <td className="p-2">{weak ? <Badge variant="destructive">Below threshold</Badge> : <Badge>OK</Badge>}</td>
                          <td className="p-2">{weak && (
                            <Button size="sm" variant="outline" onClick={() => flagWeak(c.clo_id ?? c.id, c.code ?? 'CLO', c.avg_attainment ?? 0)}>
                              Open Intervention
                            </Button>
                          )}</td>
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
        <CardHeader><CardTitle>Student Mastery</CardTitle></CardHeader>
        <CardContent>
          {roster.length === 0 ? <p className="text-sm text-muted-foreground">No enrolled students.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b"><tr className="text-left">
                  <th className="p-2">Student</th><th className="p-2">Email</th><th className="p-2">Action</th>
                </tr></thead>
                <tbody>
                  {roster.map(r => {
                    const p = profiles[r.student_user_id] || {};
                    return (
                      <tr key={r.id} className="border-b">
                        <td className="p-2">{p.display_name || r.student_user_id.slice(0, 8)}</td>
                        <td className="p-2 text-muted-foreground">{p.email || '—'}</td>
                        <td className="p-2"><Button size="sm" variant="outline" onClick={() => recompute(r.student_user_id)}>Recompute CLOs</Button></td>
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
