import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AuditResult {
  student_record: any | null;
  degree_program: { id?: string; title?: string; level?: string } | null;
  authority_status: string;
  is_eligible_for_graduation: boolean;
  credential_issuance_allowed: boolean;
  total_credits_required: number | null;
  total_credits_earned: number | null;
  gpa: number | null;
  percent_complete: number | null;
  message: string;
}

export default function DegreeAudit() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<AuditResult>({
    queryKey: ['degree-audit-authoritative', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('degree-audit', {
        body: { student_user_id: user!.id },
      });
      if (error) throw error;
      return data as AuditResult;
    },
  });

  return (
    <PageTemplate title="Degree Audit" description="Registrar-controlled programme completion evidence">
      <div className="max-w-5xl mx-auto space-y-5">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Academic truth standard
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Degree progress is shown only when it can be derived from authoritative programme requirements, verified credits, assessed competencies, required placements or research, academic standing, and registrar-approved exceptions. Missing evidence is never replaced with sample data.
          </CardContent>
        </Card>

        {isLoading && <Card><CardContent className="py-10 text-center text-muted-foreground">Loading official academic record…</CardContent></Card>}

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="py-8 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div><p className="font-medium">Degree audit is unavailable</p><p className="text-sm text-muted-foreground">No graduation eligibility has been asserted.</p></div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Programme</CardTitle></CardHeader><CardContent><p className="font-semibold">{data.degree_program?.title ?? 'Not assigned'}</p><p className="text-xs text-muted-foreground">{data.degree_program?.level ?? '—'}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Student status</CardTitle></CardHeader><CardContent><p className="font-semibold">{data.student_record ? 'Academic record found' : 'Record unavailable'}</p><p className="text-xs text-muted-foreground">Year {data.student_record?.current_year ?? '—'} · Term {data.student_record?.current_term ?? '—'}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Graduation eligibility</CardTitle></CardHeader><CardContent><Badge variant="outline">Not asserted</Badge><p className="text-xs text-muted-foreground mt-2">Credential issuance disabled until the audit is authoritative.</p></CardContent></Card>
            </div>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Programme requirements are being authority-bound</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{data.message}</p>
                <div className="grid sm:grid-cols-2 gap-3 text-muted-foreground">
                  <div className="rounded-lg border bg-background p-3"><BookOpen className="h-4 w-4 mb-2" /><strong className="text-foreground">No invented credits</strong><p className="text-xs mt-1">Required and earned credits remain unknown until the registrar-controlled curriculum graph supplies them.</p></div>
                  <div className="rounded-lg border bg-background p-3"><ShieldCheck className="h-4 w-4 mb-2" /><strong className="text-foreground">No inferred degree</strong><p className="text-xs mt-1">Course count, XP, engagement, or generic progress cannot confer a qualification.</p></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
