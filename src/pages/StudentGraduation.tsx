import { useQuery, useMutation } from '@tanstack/react-query';
import { Award, Eye, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function StudentGraduation() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['graduation-center-truth', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: certificates }, { data: student }] = await Promise.all([
        supabase.from('course_certificates').select('id,course_id,completion_date,courses:course_id(title,faculty)').eq('user_id', user!.id),
        supabase.from('students').select('id,student_id_code,current_year,current_term,degree_program:degree_programs!students_degree_program_id_fkey(id,title,level)').eq('user_id', user!.id).maybeSingle(),
      ]);
      return { certificates: certificates ?? [], student };
    },
  });

  const viewCertificate = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { userId: user!.id, courseId, type: 'course' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      if (result?.html) {
        const win = window.open();
        if (win) win.document.write(result.html);
      }
    },
    onError: () => toast.error('Certificate cannot be regenerated until verified completion is confirmed.'),
  });

  return (
    <PageTemplate title="Graduation & Credentials" description="Verified credentials and registrar-controlled graduation">
      <div className="max-w-5xl mx-auto space-y-5">
        <Card className="border-primary/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Credential authority</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Course certificates are available only after verified module mastery. Degree conferral is intentionally unavailable until the programme requirement graph and registrar-controlled degree audit can prove every applicable requirement. XP and course counts never confer degrees.
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Programme</CardTitle></CardHeader><CardContent><p className="font-semibold">{(data?.student as any)?.degree_program?.title ?? 'Not assigned'}</p><p className="text-xs text-muted-foreground">{(data?.student as any)?.degree_program?.level ?? '—'}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Course certificates</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data?.certificates.length ?? 0}</p><p className="text-xs text-muted-foreground">Verified completion records</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Degree conferral</CardTitle></CardHeader><CardContent><Badge variant="outline">Not yet authority-enabled</Badge></CardContent></Card>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Graduation readiness</CardTitle></CardHeader>
          <CardContent className="text-sm">
            No degree has been declared ready from engagement points, arbitrary course counts, or sample requirements. The official Degree Audit will become actionable only when programme-specific requirements are fully governed.
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Course certificates</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading credentials…</div>
            ) : data?.certificates.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {data.certificates.map((cert: any) => (
                  <div key={cert.id} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                    <div><p className="font-medium">{cert.courses?.title ?? 'Course Certificate'}</p><p className="text-xs text-muted-foreground">{cert.courses?.faculty ?? 'Scroll University'} · {cert.completion_date ? new Date(cert.completion_date).toLocaleDateString() : 'Date unavailable'}</p></div>
                    <Button variant="outline" size="sm" onClick={() => viewCertificate.mutate(cert.course_id)} disabled={viewCertificate.isPending}><Eye className="h-4 w-4 mr-1" />View</Button>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-sm text-muted-foreground">No verified course certificates have been issued yet.</p>}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
