/**
 * LiveClassControls — Faculty/admin-only Start/End Live Class controls.
 * Truthfully surfaces session state, lecturer bot status, delivery mode,
 * and the last bootstrap reason. Never fakes a live state.
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, StopCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useClassroomSession } from '@/hooks/useClassroomSession';

interface LiveClassControlsProps {
  courseId: string;
  courseTitle?: string;
}

export function LiveClassControls({ courseId, courseTitle }: LiveClassControlsProps) {
  const { isFaculty, isAdmin, loading: rolesLoading } = useUserRoles();
  const { session } = useClassroomSession(courseId);
  const [busy, setBusy] = useState<'start' | 'end' | null>(null);

  if (rolesLoading) return null;
  if (!isFaculty && !isAdmin) return null;

  const isLive = session?.status === 'live';

  const handleStart = async () => {
    setBusy('start');
    try {
      const { data, error } = await supabase.functions.invoke('classroom-session-control', {
        body: { action: 'start', courseId, lectureTitle: courseTitle },
      });
      if (error) throw error;
      console.log('[LiveClassControls] start ->', data);
      toast.success('Live class started');
    } catch (e) {
      console.error('[LiveClassControls] start failed', e);
      toast.error(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setBusy(null);
    }
  };

  const handleEnd = async () => {
    setBusy('end');
    try {
      const { data, error } = await supabase.functions.invoke('classroom-session-control', {
        body: { action: 'end', courseId },
      });
      if (error) throw error;
      console.log('[LiveClassControls] end ->', data);
      toast.success('Live class ended');
    } catch (e) {
      console.error('[LiveClassControls] end failed', e);
      toast.error(e instanceof Error ? e.message : 'Failed to end');
    } finally {
      setBusy(null);
    }
  };

  const handleRebootstrap = async () => {
    if (!session) return;
    setBusy('start');
    try {
      const { data, error } = await supabase.functions.invoke('lecturer-bootstrap', {
        body: { sessionId: session.id },
      });
      if (error) throw error;
      console.log('[LiveClassControls] rebootstrap ->', data);
      toast.message('Lecturer bootstrap re-triggered');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bootstrap failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-burgundy/30">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-playfair text-burgundy">Live Class Controls</h3>
          <p className="text-xs text-muted-foreground">Faculty/Admin only</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? 'default' : 'outline'} className={isLive ? 'bg-burgundy' : ''}>
            {isLive ? 'LIVE' : session?.status ?? 'idle'}
          </Badge>
          {session?.lecturer_bot_status && (
            <Badge variant="outline">bot: {session.lecturer_bot_status}</Badge>
          )}
          {session?.delivery_mode && (
            <Badge variant="outline">mode: {session.delivery_mode}</Badge>
          )}
        </div>
      </div>

      {session?.last_bootstrap_reason && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Last bootstrap: {session.last_bootstrap_reason}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!isLive ? (
          <Button onClick={handleStart} disabled={busy !== null} className="bg-burgundy text-ivory hover:bg-burgundy/90">
            {busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Start Live Class
          </Button>
        ) : (
          <>
            <Button onClick={handleEnd} disabled={busy !== null} variant="destructive">
              {busy === 'end' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <StopCircle className="h-4 w-4 mr-2" />}
              End Live Class
            </Button>
            <Button onClick={handleRebootstrap} disabled={busy !== null} variant="outline">
              Re-trigger lecturer
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export default LiveClassControls;
