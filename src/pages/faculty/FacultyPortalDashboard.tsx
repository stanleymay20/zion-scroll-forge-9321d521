import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listMySections, listAdvisingFlags, listInterventions } from '@/services/facultyPortal';
import { BookOpen, ClipboardCheck, AlertTriangle, Target, Users, GraduationCap } from 'lucide-react';

type Section = Awaited<ReturnType<typeof listMySections>>[number];

export default function FacultyPortalDashboard() {
  const [sections, setSections] = useState<Section[]>([]);
  const [openFlags, setOpenFlags] = useState(0);
  const [openInterventions, setOpenInterventions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [secs, flags, ints] = await Promise.all([
          listMySections(),
          listAdvisingFlags('open'),
          listInterventions(),
        ]);
        setSections(secs);
        setOpenFlags(flags.length);
        setOpenInterventions((ints as any[]).filter(i => i.status === 'open').length);
      } finally { setLoading(false); }
    })();
  }, []);

  const totalStudents = sections.reduce((a, s) => a + (s.enrolled_count ?? 0), 0);

  return (
    <PageTemplate title="Faculty Portal" description="Manage sections, grading, attendance, advising, and outcomes.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Assigned Sections" value={sections.length} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Enrolled Students" value={totalStudents} />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Open Flags" value={openFlags} />
        <StatCard icon={<Target className="h-4 w-4" />} label="Open Interventions" value={openInterventions} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/faculty/advising"><ClipboardCheck className="h-4 w-4 mr-2" />Advising</Link></Button>
        <Button asChild variant="outline"><Link to="/faculty/interventions"><Target className="h-4 w-4 mr-2" />Interventions</Link></Button>
        <Button asChild variant="outline"><Link to="/faculty"><GraduationCap className="h-4 w-4 mr-2" />Classic Dashboard</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>My Sections</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections currently assigned to you.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Section</th><th className="p-2">Course</th><th className="p-2">Term</th>
                    <th className="p-2 text-center">Enrolled</th><th className="p-2 text-center">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map(s => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{s.section_code}</td>
                      <td className="p-2">{s.course_code} — {s.course_title}</td>
                      <td className="p-2">{s.term_label}</td>
                      <td className="p-2 text-center">{s.enrolled_count}/{s.seat_capacity}</td>
                      <td className="p-2 text-center"><Badge variant="outline">{s.section_status}</Badge></td>
                      <td className="p-2 space-x-2 whitespace-nowrap">
                        <Link className="underline text-primary" to={`/faculty/section/${s.id}/gradebook`}>Gradebook</Link>
                        <Link className="underline text-primary" to={`/faculty/section/${s.id}/attendance`}>Attendance</Link>
                        <Link className="underline text-primary" to={`/faculty/section/${s.id}/outcomes`}>Outcomes</Link>
                      </td>
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">{icon}{label}</span>
          <span className="text-2xl font-serif font-bold">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
