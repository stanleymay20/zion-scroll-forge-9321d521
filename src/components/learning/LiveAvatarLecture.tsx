/**
 * LiveAvatarLecture — Real-time AI avatar lecture with:
 *  - Optional co-lecturer panel (host + co-host)
 *  - Persistent transcripts (lecture_sessions / lecture_transcripts)
 *  - Browser recording (MediaRecorder → lecture-recordings bucket)
 *  - Live Q&A queue with raise-hand (lecture_questions + Realtime)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2, Send, Sparkles, Video, Mic, MicOff,
  VideoOff, Phone, PhoneOff, Volume2, VolumeX,
  Hand, CheckCircle2, Circle, Download, Users, Disc
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { CompanionResources } from './CompanionResources';
import { getUserFriendlyError } from "@/lib/errors";

type SpeakerRole = 'user' | 'host' | 'cohost' | 'system';

interface Message {
  role: SpeakerRole;
  speakerName?: string;
  content: string;
  timestamp: Date;
}

interface QueuedQuestion {
  id: string;
  user_id: string;
  asker_name: string | null;
  question: string;
  status: 'pending' | 'answered' | 'dismissed';
  position: number;
  created_at: string;
}

interface LiveAvatarLectureProps {
  tutorName: string;
  tutorSpecialty: string;
  tutorAvatar?: string | null;
  tutorId?: string;
  cohostName?: string;
  cohostSpecialty?: string;
  cohostAvatar?: string | null;
  cohostId?: string;
  moduleId?: string;
  moduleContent?: string;
  moduleTitle?: string;
  // Real course context (no fallbacks).
  courseId?: string;
  courseTitle?: string;
  programTitle?: string;
  facultyName?: string;
  studentName?: string;
  learningObjectives?: string[];
}

export function LiveAvatarLecture({
  tutorName,
  tutorSpecialty,
  tutorAvatar,
  tutorId,
  cohostName,
  cohostSpecialty,
  cohostAvatar,
  cohostId,
  moduleId,
  moduleContent,
  moduleTitle,
  courseId,
  courseTitle,
  programTitle,
  facultyName,
  studentName,
  learningObjectives,
}: LiveAvatarLectureProps) {
  const hasCohost = Boolean(cohostName);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<'host' | 'cohost' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QueuedQuestion[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'no-device' | 'in-use' | 'unsupported'>('idle');
  const [micLevel, setMicLevel] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const sessionStreamRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const sequenceRef = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => { disconnectStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription for Q&A queue
  useEffect(() => {
    if (!sessionId) return;
    loadQuestions(sessionId);
    const channel = supabase
      .channel(`lecture-q-${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lecture_questions', filter: `session_id=eq.${sessionId}` },
        () => loadQuestions(sessionId)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const loadQuestions = async (sid: string) => {
    const { data } = await supabase
      .from('lecture_questions')
      .select('*')
      .eq('session_id', sid)
      .order('position', { ascending: true });
    if (data) setQuestions(data as QueuedQuestion[]);
  };

  const persistTranscript = async (
    sid: string,
    role: SpeakerRole,
    content: string,
    speakerName?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    sequenceRef.current += 1;
    await supabase.from('lecture_transcripts').insert({
      session_id: sid,
      user_id: user.id,
      speaker_role: role,
      speaker_name: speakerName || null,
      content,
      sequence_index: sequenceRef.current,
    });
  };

  const createSession = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('lecture_sessions').insert({
      user_id: user.id,
      module_id: moduleId || null,
      module_title: moduleTitle || null,
      host_tutor_id: tutorId || null,
      host_tutor_name: tutorName,
      cohost_tutor_id: cohostId || null,
      cohost_tutor_name: cohostName || null,
    }).select('id').single();
    if (error) {
      console.error('Create session error:', error);
      return null;
    }
    return data.id;
  };

  const connectStream = useCallback(async () => {
    setIsConnecting(true);
    try {
      const sid = await createSession();
      if (sid) setSessionId(sid);

      const { data, error } = await supabase.functions.invoke('ai-avatar-stream', {
        body: { action: 'create_stream' },
      });
      if (error) throw error;

      streamIdRef.current = data.stream_id;
      sessionStreamRef.current = data.session_id;

      const pc = new RTCPeerConnection({
        iceServers: data.ice_servers || [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && streamIdRef.current && sessionStreamRef.current) {
          await supabase.functions.invoke('ai-avatar-stream', {
            body: {
              action: 'ice_candidate',
              stream_id: streamIdRef.current,
              session_id: sessionStreamRef.current,
              candidate: event.candidate,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setIsConnected(false);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.functions.invoke('ai-avatar-stream', {
        body: {
          action: 'sdp_answer',
          stream_id: data.stream_id,
          session_id: data.session_id,
          answer,
        },
      });

      setIsConnected(true);
      toast.success('🎥 Live lecture started');

      const programLine = programTitle ? ` who is enrolled in ${programTitle}${facultyName ? ` (${facultyName})` : ''}` : '';
      const courseLine = courseTitle ? `${courseTitle}${moduleTitle ? ` — module "${moduleTitle}"` : ''}` : (moduleTitle || 'this module');
      const intro = hasCohost
        ? `Welcome ${studentName || 'the student'}${programLine} to today's lecture on ${courseLine}. Briefly introduce yourself as ${tutorName} (${tutorSpecialty}) and your co-lecturer ${cohostName} (${cohostSpecialty}). Mention students can raise hand to queue questions.`
        : `Welcome ${studentName || 'the student'}${programLine} to today's lecture on ${courseLine}. Briefly introduce yourself as ${tutorName} (${tutorSpecialty}). Mention they can raise hand to queue a question.`;
      await sendToAvatar(intro, 'host', sid || undefined, true);
    } catch (err: any) {
      console.error('Stream connection error:', err);
      toast.error('Failed to connect avatar stream. Using audio-only mode.');
      setShowVideo(false);
      setIsConnected(true);
    } finally {
      setIsConnecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleContent, hasCohost, cohostName, cohostSpecialty, moduleTitle, tutorName]);

  const disconnectStream = useCallback(async () => {
    if (isRecording) await stopRecording();

    if (streamIdRef.current) {
      try {
        await supabase.functions.invoke('ai-avatar-stream', {
          body: {
            action: 'destroy_stream',
            stream_id: streamIdRef.current,
            session_id: sessionStreamRef.current,
          },
        });
      } catch (e) { console.error('Disconnect error:', e); }
    }

    if (sessionId) {
      await supabase.from('lecture_sessions').update({
        ended_at: new Date().toISOString(),
      }).eq('id', sessionId);
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    streamIdRef.current = null;
    sessionStreamRef.current = null;
    setIsConnected(false);

    if (videoRef.current) videoRef.current.srcObject = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isRecording]);

  const sendToAvatar = useCallback(
    async (
      text: string,
      speaker: 'host' | 'cohost' = 'host',
      sid?: string,
      isSystem = false
    ) => {
      const activeSid = sid || sessionId;
      setIsLoading(true);
      setIsSpeaking(false);
      setActiveSpeaker(speaker);

      try {
        const speakerName = speaker === 'cohost' ? cohostName : tutorName;
        const speakerVoiceId = speaker === 'cohost' ? cohostId : tutorId;

        const { data, error } = await supabase.functions.invoke('ai-avatar-stream', {
          body: {
            action: 'talk',
            stream_id: streamIdRef.current,
            session_id: sessionStreamRef.current,
            text: speaker === 'cohost'
              ? `As co-lecturer ${cohostName} (${cohostSpecialty}), respond to: ${text}`
              : text,
            messages: messages.map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: `${m.speakerName ? `[${m.speakerName}] ` : ''}${m.content}`,
            })),
            moduleContent: moduleContent?.substring(0, 3000),
            tutorId: speakerVoiceId,
            tutorName: speakerName,
            tutorSpecialty: speaker === 'cohost' ? cohostSpecialty : tutorSpecialty,
            courseTitle,
            programTitle,
            facultyName,
            moduleTitle,
            studentName,
            learningObjectives,
          },
        });

        if (error) throw error;

        const assistantMsg: Message = {
          role: speaker,
          speakerName,
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (activeSid) {
          await persistTranscript(activeSid, speaker, data.message, speakerName);
        }

        if (data.audio_base64 && !isMuted && audioUnlocked) {
          playAudio(data.audio_base64);
        }
      } catch (err: any) {
        console.error('Avatar talk error:', err);
        toast.error("Failed to get avatar response", { description: getUserFriendlyError(err) });
      } finally {
        setIsLoading(false);
      }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [messages, moduleContent, tutorId, isMuted, sessionId, cohostName, cohostSpecialty, cohostId, tutorName]
  );

  const playAudio = (base64Audio: string) => {
    setIsSpeaking(true);
    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
    audioRef.current = audio;
    audio.onended = () => { setIsSpeaking(false); setActiveSpeaker(null); };
    audio.onerror = () => { setIsSpeaking(false); setActiveSpeaker(null); };
    audio.play().catch((err) => {
      console.error('Audio play error:', err);
      setIsSpeaking(false);
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    if (sessionId) await persistTranscript(sessionId, 'user', text, 'You');
    await sendToAvatar(text, 'host');

    // If cohost present, optionally chime in
    if (hasCohost && Math.random() > 0.5) {
      setTimeout(async () => {
        await sendToAvatar(`Add a brief complementary perspective on: ${text}`, 'cohost');
      }, 1500);
    }
  };

  const raiseHand = async () => {
    if (!input.trim() || !sessionId) {
      toast.error('Type your question first');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('lecture_questions').insert({
      session_id: sessionId,
      user_id: user.id,
      asker_name: 'You',
      question: input.trim(),
      position: questions.length + 1,
    });
    if (error) {
      toast.error('Failed to queue question');
      return;
    }
    setInput('');
    toast.success('🖐️ Question queued');
    setShowQueue(true);
  };

  const answerNextQuestion = async () => {
    const next = questions.find((q) => q.status === 'pending');
    if (!next) {
      toast.info('No pending questions');
      return;
    }
    await supabase.from('lecture_questions').update({
      status: 'answered',
      answered_at: new Date().toISOString(),
    }).eq('id', next.id);
    const userMsg: Message = {
      role: 'user',
      speakerName: next.asker_name || 'Student',
      content: next.question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (sessionId) await persistTranscript(sessionId, 'user', next.question, next.asker_name || 'Student');
    await sendToAvatar(next.question, 'host');
  };

  const startRecording = async () => {
    try {
      const stream = (videoRef.current as any)?.captureStream?.();
      if (!stream) {
        toast.error('Recording not available — start lecture video first');
        return;
      }
      screenChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mr.ondataavailable = (e) => { if (e.data.size > 0) screenChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const path = `${user.id}/${sessionId || Date.now()}.webm`;
        const { error: upErr } = await supabase.storage
          .from('lecture-recordings')
          .upload(path, blob, { upsert: true, contentType: 'video/webm' });
        if (upErr) {
          toast.error('Recording upload failed');
          // Still offer local download
          const url = URL.createObjectURL(blob);
          setRecordingUrl(url);
          return;
        }
        const { data: signed } = await supabase.storage
          .from('lecture-recordings')
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) {
          setRecordingUrl(signed.signedUrl);
          if (sessionId) {
            await supabase.from('lecture_sessions').update({
              recording_url: path,
            }).eq('id', sessionId);
          }
          toast.success('💾 Recording saved');
        }
      };
      mr.start(1000);
      screenRecorderRef.current = mr;
      setIsRecording(true);
      toast.info('🔴 Recording started');
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Recording failed to start');
    }
  };

  const stopRecording = async () => {
    screenRecorderRef.current?.stop();
    screenRecorderRef.current = null;
    setIsRecording(false);
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          if (!base64) return;
          try {
            const { data: voiceData, error } = await supabase.functions.invoke('ai-tutor-voice', {
              body: { session_id: `live-${moduleId}`, audio_base64: base64 },
            });
            if (error || !voiceData?.transcript) {
              toast.error('Voice not recognized. Please type your question.');
              return;
            }
            const userMsg: Message = { role: 'user', content: voiceData.transcript, timestamp: new Date() };
            setMessages((prev) => [...prev, userMsg]);
            if (sessionId) await persistTranscript(sessionId, 'user', voiceData.transcript, 'You');
            await sendToAvatar(voiceData.transcript, 'host');
          } catch (e) {
            console.error('Voice processing error:', e);
            toast.error('Voice processing failed.');
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      setIsRecordingVoice(true);
      toast.info('🎙️ Listening...');
    } catch (err) {
      console.error('Mic error:', err);
      toast.error('Microphone access required');
    }
  };

  const stopVoiceInput = () => {
    mediaRecorderRef.current?.stop();
    setIsRecordingVoice(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Unlock browser audio inside a user gesture (autoplay policy).
  const enableAudio = async () => {
    try {
      const a = new Audio();
      a.muted = true;
      // 1ms silent wav data URI
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
      await a.play().catch(() => {});
      a.pause();
      setAudioUnlocked(true);
      setIsMuted(false);
      toast.success('🔊 Sound enabled');
    } catch {
      setAudioUnlocked(true);
      setIsMuted(false);
    }
  };

  // Test microphone permission + show 3-sec input level meter.
  const testMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('unsupported');
      toast.error('Microphone API not supported in this browser');
      return;
    }
    setMicStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const start = Date.now();
      const loop = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        if (Date.now() - start < 3000) requestAnimationFrame(loop);
        else {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          setMicLevel(0);
          toast.success('🎤 Microphone working');
        }
      };
      loop();
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setMicStatus('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setMicStatus('no-device');
      else if (name === 'NotReadableError') setMicStatus('in-use');
      else setMicStatus('denied');
      toast.error(
        name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your browser settings.'
        : name === 'NotFoundError' ? 'No microphone found.'
        : name === 'NotReadableError' ? 'Microphone in use by another app.'
        : 'Microphone unavailable.'
      );
    }
  };

  const pendingCount = questions.filter((q) => q.status === 'pending').length;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {/* Host avatar */}
            <Avatar
              className={`h-10 w-10 border-2 border-primary ${
                isSpeaking && activeSpeaker === 'host' ? 'animate-pulse ring-4 ring-primary/50' : ''
              }`}
            >
              <AvatarImage src={tutorAvatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {tutorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Co-host avatar */}
            {hasCohost && (
              <Avatar
                className={`h-10 w-10 border-2 border-accent ${
                  isSpeaking && activeSpeaker === 'cohost' ? 'animate-pulse ring-4 ring-accent/50' : ''
                }`}
              >
                <AvatarImage src={cohostAvatar || undefined} />
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {cohostName!.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {tutorName}{hasCohost && ` & ${cohostName}`}
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {hasCohost ? 'Panel' : 'Live Avatar'}
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Disc className="h-3 w-3 animate-pulse" /> REC
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tutorSpecialty}{hasCohost && ` • ${cohostSpecialty}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {!isConnected ? (
              <Button size="sm" onClick={connectStream} disabled={isConnecting} className="gap-1.5">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                {isConnecting ? 'Connecting...' : 'Start Lecture'}
              </Button>
            ) : (
              <>
                <Button
                  size="icon"
                  variant={isRecording ? 'destructive' : 'outline'}
                  className="h-8 w-8"
                  title={isRecording ? 'Stop recording' : 'Record lecture'}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  <Disc className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showQueue ? 'default' : 'outline'}
                  className="h-8 gap-1"
                  onClick={() => setShowQueue((v) => !v)}
                >
                  <Hand className="h-4 w-4" />
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[10px]">{pendingCount}</Badge>
                  )}
                </Button>
                <Button
                  size="icon"
                  variant={showVideo ? 'default' : 'outline'}
                  className="h-8 w-8"
                  onClick={() => setShowVideo(!showVideo)}
                >
                  {showVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant={isMuted ? 'outline' : 'default'}
                  className="h-8 w-8"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={disconnectStream}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Truthful provider/status strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={courseTitle ? 'secondary' : 'destructive'}>
            {courseTitle ? `Course: ${courseTitle}` : 'No course context'}
          </Badge>
          {programTitle && <Badge variant="outline">Program: {programTitle}</Badge>}
          {facultyName && <Badge variant="outline">Faculty: {facultyName}</Badge>}
          <Badge variant={audioUnlocked && !isMuted ? 'secondary' : 'outline'}>
            Audio: {isMuted ? 'muted' : audioUnlocked ? 'on' : 'tap Enable Sound'}
          </Badge>
          <Badge
            variant={
              micStatus === 'granted' ? 'secondary'
              : micStatus === 'denied' || micStatus === 'no-device' || micStatus === 'in-use' || micStatus === 'unsupported' ? 'destructive'
              : 'outline'
            }
          >
            Mic: {micStatus === 'idle' ? 'not tested'
              : micStatus === 'requesting' ? 'requesting…'
              : micStatus === 'granted' ? 'granted'
              : micStatus === 'denied' ? 'blocked'
              : micStatus === 'no-device' ? 'no device'
              : micStatus === 'in-use' ? 'in use'
              : 'unsupported'}
          </Badge>
          {!audioUnlocked && (
            <Button size="sm" variant="outline" className="h-7" onClick={enableAudio}>
              <Volume2 className="h-3 w-3 mr-1" /> Enable Sound
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7" onClick={testMicrophone}>
            <Mic className="h-3 w-3 mr-1" /> Test Microphone
          </Button>
          {micStatus === 'requesting' || micLevel > 0 ? (
            <div className="h-2 w-24 bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${micLevel}%` }} />
            </div>
          ) : null}
          {micStatus === 'denied' && (
            <span className="text-destructive">Allow mic in browser site settings, then retry.</span>
          )}
        </div>

        {/* Avatar Video / Panel Area */}
        {showVideo && (
          <div className={`grid gap-2 ${hasCohost ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
            <div className={`relative aspect-video bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-lg overflow-hidden border border-border ${hasCohost ? 'sm:col-span-2' : ''}`}>
              {isConnected ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={tutorAvatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                        {tutorName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isConnecting && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {isConnecting ? 'Connecting to live avatar...' : 'Press "Start Lecture" to begin'}
                  </p>
                  {moduleTitle && (
                    <p className="text-xs opacity-70 text-center px-4">Today's lecture: {moduleTitle}</p>
                  )}
                </div>
              )}

              {isConnected && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                  <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
              {isSpeaking && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-primary/90 backdrop-blur px-3 py-1 rounded-full">
                  <span className="text-xs text-white font-medium">
                    {activeSpeaker === 'cohost' ? cohostName : tutorName} speaking...
                  </span>
                </div>
              )}
              {isLoading && !isSpeaking && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1 rounded-full">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-xs">Thinking...</span>
                </div>
              )}
            </div>

            {/* Co-host tile */}
            {hasCohost && (
              <div className={`relative aspect-video sm:aspect-auto bg-gradient-to-br from-accent/10 via-accent/5 to-background rounded-lg overflow-hidden border ${activeSpeaker === 'cohost' ? 'border-accent ring-2 ring-accent/40' : 'border-border'} flex flex-col items-center justify-center p-3`}>
                <Avatar className={`h-16 w-16 border-2 border-accent/30 ${activeSpeaker === 'cohost' ? 'animate-pulse' : ''}`}>
                  <AvatarImage src={cohostAvatar || undefined} />
                  <AvatarFallback className="bg-accent/10 text-accent text-xl">
                    {cohostName!.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium mt-2 text-center">{cohostName}</p>
                <p className="text-[10px] opacity-60 text-center">{cohostSpecialty}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">Co-lecturer</Badge>
              </div>
            )}
          </div>
        )}

        {/* Q&A Queue */}
        {showQueue && isConnected && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Hand className="h-4 w-4" /> Question Queue ({pendingCount} pending)
              </p>
              <Button size="sm" variant="outline" onClick={answerNextQuestion} disabled={pendingCount === 0 || isLoading}>
                Answer Next
              </Button>
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {questions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No questions yet. Type below and tap the hand icon to queue one.
                  </p>
                )}
                {questions.map((q) => (
                  <div key={q.id} className="flex items-start gap-2 text-xs p-2 rounded bg-background/60">
                    {q.status === 'answered' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={q.status === 'answered' ? 'line-through opacity-60' : ''}>{q.question}</p>
                      <p className="text-[10px] text-muted-foreground">{q.asker_name || 'Student'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Recording Download */}
        {recordingUrl && (
          <a
            href={recordingUrl}
            download={`lecture-${sessionId || 'recording'}.webm`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download last recording
          </a>
        )}

        {/* Companion external research & library */}
        <CompanionResources topic={moduleTitle} variant="inline" />

        {/* Chat Messages */}
        <ScrollArea className="h-[250px]" ref={scrollRef}>
          <div className="space-y-3 pr-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-6">
                {hasCohost ? <Users className="h-8 w-8 mx-auto mb-2 opacity-40" /> : <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />}
                <p className="text-sm font-medium">{hasCohost ? 'Live Panel Lecture' : 'Live AI Avatar Lecture'}</p>
                <p className="text-xs mt-1 opacity-70">
                  Start the lecture to interact in real-time
                </p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const isCohost = msg.role === 'cohost';
              const name = msg.speakerName || (isCohost ? cohostName : tutorName);
              const avatarSrc = isCohost ? cohostAvatar : tutorAvatar;
              return (
                <div key={i} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <Avatar className={`h-7 w-7 border shrink-0 ${isCohost ? 'border-accent/40' : 'border-primary/20'}`}>
                      <AvatarImage src={avatarSrc || undefined} />
                      <AvatarFallback className={`text-xs ${isCohost ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
                        {name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[85%] ${
                      isUser ? 'bg-primary text-primary-foreground'
                      : isCohost ? 'bg-accent/15 border border-accent/30'
                      : 'bg-muted'
                    }`}
                  >
                    {!isUser && msg.speakerName && (
                      <p className="text-[10px] font-semibold mb-1 opacity-70">{msg.speakerName}</p>
                    )}
                    {!isUser ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className="text-[10px] opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <Avatar className="h-7 w-7 border border-primary/20 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {(activeSpeaker === 'cohost' ? cohostName : tutorName)?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-3 py-2 bg-muted">
                  <div className="flex gap-1">
                    {[0, 200, 400].map((delay) => (
                      <div
                        key={delay}
                        className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t pt-3 pb-3">
        <div className="flex gap-2 w-full">
          <Button
            size="icon"
            variant={isRecordingVoice ? 'destructive' : 'outline'}
            onClick={isRecordingVoice ? stopVoiceInput : startVoiceInput}
            disabled={!isConnected || isLoading}
            className="shrink-0"
            title="Voice input"
          >
            {isRecordingVoice ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isConnected ? 'Ask, or tap hand to queue...' : 'Start lecture first...'}
            disabled={!isConnected || isLoading}
            className="flex-1"
          />

          <Button
            size="icon"
            variant="outline"
            onClick={raiseHand}
            disabled={!isConnected || !input.trim()}
            className="shrink-0"
            title="Raise hand (queue question)"
          >
            <Hand className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isConnected}
            size="icon"
            className="shrink-0"
            title="Ask now"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
