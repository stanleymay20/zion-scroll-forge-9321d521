import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
  ConnectionState,
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
import { useClassroomSession } from '@/hooks/useClassroomSession';

export type LiveClassroomRole = 'student' | 'faculty' | 'observer';

interface LiveClassroomProps {
  /** Course id — the room is derived as `course-<id>` to match the session. */
  courseId: string;
  role?: LiveClassroomRole;
  lectureTitle?: string;
  onLeave?: () => void;
  /** Truthful fallback UI shown when no remote video track has arrived yet. */
  fallback?: React.ReactNode;
}

type ConnectionStatus =
  | 'idle'
  | 'no-session'                // session row does not exist / not live
  | 'requesting-token'
  | 'connecting'
  | 'waiting-for-lecturer'      // joined room, no lecturer participant yet
  | 'lecturer-joined-no-media'  // lecturer present, no track subscribed
  | 'connected'                 // remote media tracks attached — truly LIVE
  | 'error'
  | 'disconnected';

function isLecturerIdentity(id: string) {
  return (
    id.startsWith('lecturer:') ||
    id.startsWith('lecturer-') ||
    id.startsWith('faculty:') ||
    id.startsWith('bot:')
  );
}

export function LiveClassroom({
  courseId,
  role = 'student',
  lectureTitle,
  onLeave,
  fallback,
}: LiveClassroomProps) {
  const roomName = `course-${courseId}`;
  const { session } = useClassroomSession(courseId);

  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  // Reflect the canonical server-side session lifecycle.
  useEffect(() => {
    if (!session || session.status !== 'live') {
      // Tear down any local connection if the session ended.
      if (roomRef.current) {
        console.log('[LiveClassroom] session not live — disconnecting');
        roomRef.current.disconnect();
        roomRef.current = null;
        setHasVideo(false);
        setHasAudio(false);
        setParticipants([]);
      }
      setStatus('no-session');
    } else if (status === 'no-session' || status === 'idle') {
      setStatus('idle');
    }
  }, [session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      track.attach(videoRef.current);
      setHasVideo(true);
    } else if (track.kind === Track.Kind.Audio && audioRef.current) {
      track.attach(audioRef.current);
      setHasAudio(true);
    }
  }, []);

  const recomputeStatus = useCallback((room: Room) => {
    const remote = Array.from(room.remoteParticipants.values());
    const lecturer = remote.find((p) => isLecturerIdentity(p.identity));
    if (!lecturer) {
      setStatus('waiting-for-lecturer');
      return;
    }
    const hasTracks = lecturer.trackPublications.size > 0 &&
      Array.from(lecturer.trackPublications.values()).some((p) => p.isSubscribed && p.track);
    setStatus(hasTracks ? 'connected' : 'lecturer-joined-no-media');
  }, []);

  const connect = useCallback(async () => {
    setErrorMsg(null);
    setStatus('requesting-token');
    try {
      console.log('[LiveClassroom] requesting token', { roomName, role });
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, role },
      });
      if (error) throw error;
      if (!data?.token || !data?.url) throw new Error('Invalid token response');

      setStatus('connecting');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          participant: RemoteParticipant,
        ) => {
          console.log('[LiveClassroom] track subscribed', {
            kind: track.kind,
            identity: participant.identity,
          });
          if (isLecturerIdentity(participant.identity)) {
            attachTrack(track);
            recomputeStatus(room);
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
          if (track.kind === Track.Kind.Video) setHasVideo(false);
          if (track.kind === Track.Kind.Audio) setHasAudio(false);
          if (roomRef.current) recomputeStatus(roomRef.current);
        })
        .on(RoomEvent.ParticipantConnected, (p) => {
          console.log('[LiveClassroom] participant connected', p.identity);
          setParticipants(Array.from(room.remoteParticipants.values()));
          recomputeStatus(room);
        })
        .on(RoomEvent.ParticipantDisconnected, (p) => {
          console.log('[LiveClassroom] participant disconnected', p.identity);
          setParticipants(Array.from(room.remoteParticipants.values()));
          recomputeStatus(room);
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log('[LiveClassroom] connection state', state);
          if (state === ConnectionState.Disconnected) setStatus('disconnected');
        });

      await room.connect(data.url, data.token);
      console.log('[LiveClassroom] room connected', { localId: room.localParticipant.identity });
      setParticipants(Array.from(room.remoteParticipants.values()));
      recomputeStatus(room);

      // Watchdog: if no lecturer media within 25s, log it.
      setTimeout(() => {
        if (roomRef.current === room) {
          const remote = Array.from(room.remoteParticipants.values());
          if (!remote.some(isLecturerIdentityP)) {
            console.warn('[LiveClassroom] media timeout — no lecturer joined within 25s');
          }
        }
      }, 25000);
    } catch (err) {
      console.error('[LiveClassroom] connect failed', err);
      const message = err instanceof Error ? err.message : 'Failed to join classroom';
      setErrorMsg(message);
      setStatus('error');
      toast.error(message);
    }
  }, [roomName, role, attachTrack, recomputeStatus]);

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setHasVideo(false);
    setHasAudio(false);
    setParticipants([]);
    setStatus('disconnected');
    onLeave?.();
  }, [onLeave]);

  useEffect(() => () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  const isTrulyLive = status === 'connected' && hasVideo;

  const statusBadge = () => {
    if (isTrulyLive) return <Badge className="bg-burgundy text-ivory">🎥 LIVE</Badge>;
    switch (status) {
      case 'no-session':
        return <Badge variant="outline">No active session</Badge>;
      case 'waiting-for-lecturer':
        return <Badge variant="secondary">Waiting for lecturer</Badge>;
      case 'lecturer-joined-no-media':
        return <Badge variant="secondary">Lecturer joined — no media yet</Badge>;
      case 'connected':
        // Audio-only or text-only: never claim LIVE without video
        return <Badge variant="secondary">{hasAudio ? 'Audio only' : 'Connected'}</Badge>;
      case 'connecting':
      case 'requesting-token':
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Connecting
          </Badge>
        );
      case 'error':
        return <Badge variant="destructive">Connection error</Badge>;
      case 'disconnected':
        return <Badge variant="outline">Disconnected</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  const deliveryHint = session
    ? `bot: ${session.lecturer_bot_status} · mode: ${session.delivery_mode}${
        session.last_bootstrap_reason ? ` · ${session.last_bootstrap_reason}` : ''
      }`
    : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <h3 className="font-playfair text-lg text-burgundy">
            {lectureTitle ?? session?.lecture_title ?? 'Live AI Classroom'}
          </h3>
          <p className="text-xs text-muted-foreground">Room: {roomName}</p>
          {deliveryHint && (
            <p className="text-[10px] text-muted-foreground font-mono">{deliveryHint}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusBadge()}
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" /> {participants.length}
          </Badge>
        </div>
      </div>

      <div className="relative aspect-video bg-foreground/90 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted={role === 'faculty'}
        />
        <audio ref={audioRef} autoPlay />

        {!isTrulyLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/80 text-background p-6 text-center">
            {status === 'no-session' && (
              <>
                <VideoOff className="h-8 w-8 text-muted-foreground" />
                <p className="font-dm-sans">No live class is currently running for this course.</p>
                {fallback && <div className="mt-4 w-full max-w-md">{fallback}</div>}
              </>
            )}
            {(status === 'waiting-for-lecturer' || status === 'lecturer-joined-no-media') && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="font-dm-sans">
                  {status === 'waiting-for-lecturer'
                    ? 'Connected. Waiting for the AI lecturer to join…'
                    : 'Lecturer joined — waiting for media tracks…'}
                </p>
                {fallback && <div className="mt-4 w-full max-w-md">{fallback}</div>}
              </>
            )}
            {(status === 'requesting-token' || status === 'connecting') && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="font-dm-sans">Joining classroom…</p>
              </>
            )}
            {status === 'connected' && !hasVideo && (
              <>
                <Mic className="h-8 w-8 text-gold" />
                <p className="font-dm-sans">Audio-only delivery — no video track is being published.</p>
                {fallback && <div className="mt-4 w-full max-w-md">{fallback}</div>}
              </>
            )}
            {status === 'error' && (
              <>
                <VideoOff className="h-8 w-8 text-destructive" />
                <p className="font-dm-sans">{errorMsg ?? 'Unable to connect'}</p>
                {fallback && <div className="mt-4 w-full max-w-md">{fallback}</div>}
              </>
            )}
            {status === 'idle' && (
              <>
                <Video className="h-8 w-8 text-gold" />
                <p className="font-dm-sans">Ready to join the live classroom.</p>
              </>
            )}
            {status === 'disconnected' && (
              <>
                <VideoOff className="h-8 w-8 text-muted-foreground" />
                <p className="font-dm-sans">You have left the classroom.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {(status === 'idle' || status === 'disconnected' || status === 'error') &&
          session?.status === 'live' && (
            <Button onClick={connect} className="bg-burgundy text-ivory hover:bg-burgundy/90">
              <Video className="h-4 w-4 mr-2" />
              Join classroom
            </Button>
          )}
        {(status === 'connecting' ||
          status === 'requesting-token' ||
          status === 'waiting-for-lecturer' ||
          status === 'lecturer-joined-no-media' ||
          status === 'connected') && (
          <Button variant="outline" onClick={disconnect}>
            <MicOff className="h-4 w-4 mr-2" />
            Leave
          </Button>
        )}
      </div>
    </Card>
  );
}

// Helper used inside watchdog setTimeout to keep TS narrow.
function isLecturerIdentityP(p: RemoteParticipant) {
  return isLecturerIdentity(p.identity);
}

export default LiveClassroom;
