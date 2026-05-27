/**
 * useClassroomSession — Live classroom session state for a course.
 * Subscribes to realtime updates so faculty actions (start/end) and
 * lecturer-bootstrap outcomes propagate to all participants instantly.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClassroomSessionRow {
  id: string;
  room_name: string;
  course_id: string | null;
  faculty_id: string | null;
  lecture_title: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  lecturer_bot_status: 'idle' | 'joining' | 'live' | 'ended' | 'error';
  delivery_mode: 'awaiting-publisher' | 'avatar' | 'audio' | 'text' | 'offline';
  lecturer_identity: string | null;
  last_bootstrap_reason: string | null;
  started_at: string | null;
  ended_at: string | null;
}

export function useClassroomSession(courseId?: string | null) {
  const [session, setSession] = useState<ClassroomSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      setSession(null);
      return;
    }
    let cancelled = false;
    const roomName = `course-${courseId}`;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('*')
        .eq('room_name', roomName)
        .maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      setSession((data as ClassroomSessionRow) ?? null);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`classroom-session-${roomName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classroom_sessions', filter: `room_name=eq.${roomName}` },
        (payload) => {
          console.debug('[useClassroomSession] realtime', payload.eventType, payload.new);
          if (payload.eventType === 'DELETE') {
            setSession(null);
          } else {
            setSession(payload.new as ClassroomSessionRow);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  return { session, loading, error };
}
