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

export type LiveClassroomRole = 'student' | 'faculty' | 'observer';

interface LiveClassroomProps {
  roomName: string;
  role?: LiveClassroomRole;
  lectureTitle?: string;
  onLeave?: () => void;
  fallback?: React.ReactNode;
}

interface RemoteMedia {
  participantIdentity: string;
  participantName: string;
  videoTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
}

type ConnectionStatus =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'connected'
  | 'waiting-for-lecturer'
  | 'error'
  | 'disconnected';

export function LiveClassroom({
  roomName,
  role = 'student',
  lectureTitle,
  onLeave,
  fallback,
}: LiveClassroomProps) {
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [lecturerMedia, setLecturerMedia] = useState<RemoteMedia | null>(null);

  const attachTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      track.attach(videoRef.current);
    } else if (track.kind === Track.Kind.Audio && audioRef.current) {
      track.attach(audioRef.current);
    }
  }, []);

  const connect = useCallback(async () => {
    setErrorMsg(null);
    setStatus('requesting-token');
    try {
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, role },
      });
      if (error) throw error;
      if (!data?.token || !data?.url) {
        throw new Error('Invalid token response');
      }

      setStatus('connecting');
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          participant: RemoteParticipant,
        ) => {
          const isLecturerBot =
            participant.identity.startsWith('faculty:') ||
            participant.identity.startsWith('bot:') ||
            participant.identity.startsWith('lecturer:');
          if (isLecturerBot) {
            setLecturerMedia((prev) => ({
              participantIdentity: participant.identity,
              participantName: participant.name || participant.identity,
              videoTrack: track.kind === Track.Kind.Video ? track : prev?.videoTrack,
              audioTrack: track.kind === Track.Kind.Audio ? track : prev?.audioTrack,
            }));
            attachTrack(track);
            setStatus('connected');
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach();
        })
        .on(RoomEvent.ParticipantConnected, () => {
          setParticipants(Array.from(room.remoteParticipants.values()));
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          setParticipants(Array.from(room.remoteParticipants.values()));
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (state === ConnectionState.Disconnected) {
            setStatus('disconnected');
          }
        });

      await room.connect(data.url, data.token);
      setParticipants(Array.from(room.remoteParticipants.values()));

      const hasLecturer = Array.from(room.remoteParticipants.values()).some(
        (p) =>
          p.identity.startsWith('faculty:') ||
          p.identity.startsWith('bot:') ||
          p.identity.startsWith('lecturer:'),
      );
      setStatus(hasLecturer ? 'connected' : 'waiting-for-lecturer');
    } catch (err) {
      console.error('[LiveClassroom] connect failed', err);
      const message = err instanceof Error ? err.message : 'Failed to join classroom';
      setErrorMsg(message);
      setStatus('error');
      toast.error(message);
    }
  }, [roomName, role, attachTrack]);

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setLecturerMedia(null);
    setParticipants([]);
    setStatus('disconnected');
    onLeave?.();
  }, [onLeave]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const statusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-burgundy">🎥 Live</Badge>;
      case 'waiting-for-lecturer':
        return <Badge variant="secondary">Waiting for lecturer</Badge>;
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

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <h3 className="font-playfair text-lg text-burgundy">
            {lectureTitle ?? 'Live AI Classroom'}
          </h3>
          <p className="text-xs text-muted-foreground">Room: {roomName}</p>
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
          muted={role !== 'faculty' ? false : true}
        />
        <audio ref={audioRef} autoPlay />

        {(status === 'idle' ||
          status === 'requesting-token' ||
          status === 'connecting' ||
          status === 'waiting-for-lecturer' ||
          status === 'error' ||
          status === 'disconnected') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/80 text-background p-6 text-center">
            {status === 'waiting-for-lecturer' && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="font-dm-sans">
                  Connected. Waiting for the AI lecturer to publish video…
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

        {lecturerMedia && status === 'connected' && (
          <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs flex items-center gap-1">
            <Mic className="h-3 w-3" />
            {lecturerMedia.participantName}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {status === 'idle' || status === 'disconnected' || status === 'error' ? (
          <Button onClick={connect} className="bg-burgundy text-ivory hover:bg-burgundy/90">
            <Video className="h-4 w-4 mr-2" />
            Join classroom
          </Button>
        ) : (
          <Button variant="outline" onClick={disconnect}>
            <MicOff className="h-4 w-4 mr-2" />
            Leave
          </Button>
        )}
      </div>
    </Card>
  );
}

export default LiveClassroom;
