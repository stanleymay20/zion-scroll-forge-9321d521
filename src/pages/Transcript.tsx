import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Award, Coins, GraduationCap, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PLOAttainmentMatrix } from '@/components/transcript/PLOAttainmentMatrix';

export default function Transcript() {
  const { user } = useAuth();

  const { data: transcript, isLoading } = useQuery({
    queryKey: ['transcript', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch ALL enrollments (active + archived/transferred) with course details + transfer status
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses ( id, title, faculty, level ),
          transferred_from:degree_programs!enrollments_transferred_from_program_id_fkey ( title )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (enrollError) throw enrollError;

      // Fetch certificates
      const { data: certificates, error: certError } = await supabase
        .from('course_certificates')
        .select('*')
        .eq('user_id', user.id);

      if (certError) throw certError;

      // Fetch user stats
      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      // Fetch wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;

      // Fetch academic identity (program, year, term, cohort, student id)
      const { data: identity } = await supabase
        .from('students')
        .select('student_id_code, institutional_email, current_year, current_term, cohort_number, degree_program:degree_programs!students_degree_program_id_fkey(title, level)')
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        enrollments: enrollments || [],
        certificates: certificates || [],
        stats: stats || { total_xp: 0, courses_completed: 0 },
        scrollcoins: wallet?.balance || 0,
        identity: identity as any,
      };
    },
    enabled: !!user?.id,
  });

  const handleExportPDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-transcript', {
        body: { userId: user?.id },
      });

      if (error) throw error;

      if (data?.html) {
        const win = window.open();
        if (win) {
          win.document.write(data.html);
          toast.success('Transcript opened in new window');
        }
      }
    } catch (error) {
      console.error('Error generating transcript:', error);
      toast.error('Failed to generate transcript');
    }
  };

  if (isLoading) {
    return (
      <PageTemplate title="Academic Transcript" description="Your learning journey">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Academic Transcript"
      description="Your complete learning record at ScrollUniversity"
      actions={
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export to PDF
        </Button>
      }
    >
      {/* Academic Identity */}
      {transcript?.identity && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Academic Identity</CardTitle>
            <CardDescription>Locked academic record — changes require a Program Transfer Request.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Field label="Student ID" value={transcript.identity.student_id_code ?? '—'} mono />
            <Field label="Institutional Email" value={transcript.identity.institutional_email ?? '—'} mono />
            <Field label="Degree Program" value={transcript.identity.degree_program?.title ?? '—'} />
            <Field label="Level" value={transcript.identity.degree_program?.level ?? '—'} />
            <Field label="Year" value={transcript.identity.current_year ?? '—'} />
            <Field label="Term" value={transcript.identity.current_term ?? '—'} />
            <Field label="Cohort" value={transcript.identity.cohort_number ?? '—'} />
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Courses Completed</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {(transcript?.enrollments ?? []).filter((e: any) => Number(e.progress) >= 100).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total XP Earned</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{transcript?.stats.total_xp || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">ScrollGold Balance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{transcript?.scrollcoins || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Certificates Earned</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{transcript?.certificates.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PR3 — Program Learning Outcome attainment from graded attempts */}
      <PLOAttainmentMatrix userId={user?.id ?? null} />

      {/* Enrolled & Completed Courses */}
      <Card>
        <CardHeader>
          <CardTitle>Course Record</CardTitle>
          <CardDescription>All enrollments with progress and transfer status.</CardDescription>
        </CardHeader>
        <CardContent>
          {transcript?.enrollments && transcript.enrollments.length > 0 ? (
            <div className="space-y-4">
              {transcript.enrollments.map((enrollment: any) => {
                const completed = Number(enrollment.progress) >= 100;
                const status = enrollment.transfer_status as string | undefined;
                const archived = status && status !== 'active';
                return (
                  <div key={enrollment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{enrollment.courses?.title ?? 'Untitled course'}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(enrollment.updated_at).toLocaleDateString()}
                        </span>
                        {enrollment.courses?.faculty && <Badge variant="outline">{enrollment.courses.faculty}</Badge>}
                        {enrollment.courses?.level && <Badge variant="outline">{enrollment.courses.level}</Badge>}
                        {status && status !== 'active' && (
                          <Badge variant={status === 'transferred' ? 'secondary' : status === 'archived' ? 'outline' : 'destructive'} className="capitalize">
                            {status.replace('_', ' ')}
                          </Badge>
                        )}
                        {enrollment.transferred_from?.title && (
                          <span className="italic">from {enrollment.transferred_from.title}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold ${completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {Number(enrollment.progress ?? 0).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {completed ? (archived ? 'Completed · ' + (status ?? '') : 'Completed') : 'In progress'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No enrollments yet</p>
              <p className="text-sm mt-2">Start learning to build your transcript!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-medium ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
    </div>
  );
}
