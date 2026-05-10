import { useState } from 'react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  usePendingApplications,
  useApproveApplication,
  useRejectApplication,
  useWaitlistApplication,
  useAIPrescreen,
} from '@/hooks/useStudents';
import { useCohortStatus } from '@/hooks/useLaunchOps';
import { CheckCircle, XCircle, Clock, User, Sparkles, Mail, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { getUserFriendlyError } from "@/lib/errors";
import { PendingProgramAssignmentsAdmin } from "@/components/admissions/PendingProgramAssignment";

export default function AdmissionsReview() {
  const { data: applications } = usePendingApplications();
  const { data: cohort } = useCohortStatus();
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const waitlist = useWaitlistApplication();
  const prescreen = useAIPrescreen();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const setReason = (id: string, v: string) =>
    setReasons((r) => ({ ...r, [id]: v }));

  const handlePrescreen = async (id: string) => {
    try {
      const res = await prescreen.mutateAsync(id);
      toast.success(`AI score: ${res.score}/100 — recommends ${res.recommendation}`);
    } catch (e: any) {
      toast.error("AI pre-screen failed", { description: getUserFriendlyError(e) });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const r: any = await approve.mutateAsync(id);
      if (r?.auto_waitlisted) {
        toast.warning(`Cohort full — auto-waitlisted at #${r.waitlist_position}`);
      } else if (r?.student_id_code) {
        toast.success(`Admitted as ${r.student_id_code} • ${r.institutional_email}`);
      } else {
        toast.success('Application approved');
      }
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleWaitlist = async (id: string) => {
    try {
      const r: any = await waitlist.mutateAsync({ studentId: id, reason: reasons[id] });
      toast.success(`Waitlisted (position #${r?.waitlist_position ?? '—'})`);
    } catch { toast.error('Failed to waitlist'); }
  };

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync({ studentId: id, reason: reasons[id] });
      toast.success('Application rejected');
    } catch { toast.error('Failed to reject'); }
  };

  return (
    <PageTemplate title="Admissions Review" description="Review applications, AI pre-score, and decide">
      <PendingProgramAssignmentsAdmin />
      {cohort && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="py-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{cohort.cohort_label}</span>
              <span className="text-muted-foreground">
                {cohort.admitted} / {cohort.cohort_cap} admitted • {cohort.seats_remaining} seats left
              </span>
            </div>
            <Progress value={Math.round((cohort.admitted / cohort.cohort_cap) * 100)} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {applications && applications.length > 0 ? (
          applications.map((app: any) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {app.full_name}
                    </CardTitle>
                    <CardDescription>{app.email} • {app.country}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge>Pending Review</Badge>
                    {typeof app.ai_review_score === 'number' && (
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" /> AI {app.ai_review_score}/100
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Phone:</span> {app.phone || '—'}</div>
                  <div><span className="text-muted-foreground">DOB:</span> {app.dob ? new Date(app.dob).toLocaleDateString() : '—'}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {app.gender || '—'}</div>
                  <div><span className="text-muted-foreground">Submitted:</span> {new Date(app.created_at).toLocaleDateString()}</div>
                </div>

                {app.motivation_statement && (
                  <div>
                    <div className="text-sm font-semibold mb-1">Motivation Statement</div>
                    <p className="text-sm bg-muted/40 p-3 rounded whitespace-pre-wrap">
                      {app.motivation_statement}
                    </p>
                  </div>
                )}

                {app.ai_review_summary && (
                  <div className="border-l-2 border-primary pl-3">
                    <div className="text-xs font-semibold flex items-center gap-1 text-primary">
                      <Sparkles className="h-3 w-3" /> AI Pre-screen
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{app.ai_review_summary}</p>
                  </div>
                )}

                <Textarea
                  placeholder="Optional reason / note for waitlist or rejection"
                  value={reasons[app.id] ?? ''}
                  onChange={(e) => setReason(app.id, e.target.value)}
                  rows={2}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrescreen(app.id)}
                    disabled={prescreen.isPending || !app.motivation_statement}
                  >
                    <Sparkles className="h-4 w-4 mr-1" /> AI Pre-screen
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(app.id)} disabled={approve.isPending}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleWaitlist(app.id)} disabled={waitlist.isPending}>
                    <Clock className="h-4 w-4 mr-1" /> Waitlist
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} disabled={reject.isPending}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>

                {app.student_id_code && (
                  <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1"><IdCard className="h-3 w-3" /> {app.student_id_code}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {app.institutional_email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending applications.
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
