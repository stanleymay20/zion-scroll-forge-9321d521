import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Sparkles, Video, Mic, MicOff, VideoOff, Circle, Square, Star, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { ReadyPlayerMeAvatar } from '@/components/ReadyPlayerMeAvatar';
import { CollaborativeWhiteboard } from '@/components/CollaborativeWhiteboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserFriendlyError } from "@/lib/errors";
import { resolveTutorAvatarUrl } from '@/lib/tutorAvatar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITutorAvatarProps {
  tutorId?: string;
  tutorName: string;
  tutorSpecialty: string;
  tutorAvatar?: string;
  moduleId?: string;
  moduleContent?: string;
}

export const AITutorAvatar = ({
  tutorId,
  tutorName,
  tutorSpecialty,
  tutorAvatar,
  moduleId,
  moduleContent
}: AITutorAvatarProps) => {
  const resolvedTutorAvatar = resolveTutorAvatarUrl(tutorAvatar);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [satisfaction, setSatisfaction] = useState<number>(0);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.functions.invoke('ai-tutor-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          tutorId,
          moduleId,
          moduleContent: moduleContent?.substring(0, 3000),
          userId,
          withVoice: !isMuted
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Play audio with lip-sync animation
      if (data.audioContent && !isMuted && isVideoMode) {
        playAudioWithLipSync(data.audioContent);
      }

      // Show satisfaction rating after response
      setShowSatisfaction(true);
      setTimeout(() => setShowSatisfaction(false), 10000);

    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: getUserFriendlyError(error),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const playAudioWithLipSync = (base64Audio: string) => {
    setIsSpeaking(true);
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audioRef.current = audio;

    audio.onended = () => {
      setIsSpeaking(false);
    };

    audio.onerror = () => {
      setIsSpeaking(false);
      console.error('Audio playback error');
    };

    audio.play().catch(err => {
      console.error('Audio play error:', err);
      setIsSpeaking(false);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await uploadRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: 'Recording Started',
        description: 'Your personalized explanation is being recorded'
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Recording Failed',
        description: 'Could not start screen recording',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadRecording = async (blob: Blob) => {
    try {
      const fileName = `${tutorId}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ai-tutor-videos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ai-tutor-videos')
        .getPublicUrl(fileName);

      await supabase.from('ai_tutor_videos' as any).insert({
        tutor_id: tutorId,
        module_id: moduleId,
        title: `Explanation - ${new Date().toLocaleString()}`,
        description: 'AI Tutor personalized explanation',
        video_url: publicUrl
      });

      toast({
        title: 'Recording Saved',
        description: 'Your explanation video has been saved successfully'
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Could not save the recording',
        variant: 'destructive'
      });
    }
  };

  const submitSatisfaction = async (rating: number) => {
    setSatisfaction(rating);
    setShowSatisfaction(false);

    if (messages.length >= 2) {
      const lastInteraction = messages[messages.length - 2];
      const userId = await getCurrentUserId();
      
      if (userId) {
        await supabase
          .from('ai_tutor_interactions' as any)
          .update({ satisfaction_rating: rating })
          .eq('user_id', userId)
          .eq('question', lastInteraction.content)
          .order('created_at', { ascending: false })
          .limit(1);
      }
    }

    toast({
      title: 'Thank you!',
      description: 'Your feedback helps us improve'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={`h-12 w-12 border-2 border-primary ${isSpeaking ? 'animate-pulse ring-4 ring-primary/50' : ''}`}>
              <AvatarImage src={resolvedTutorAvatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {tutorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center gap-2">
                {tutorName}
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Tutor
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{tutorSpecialty}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isVideoMode ? "default" : "outline"}
              onClick={() => setIsVideoMode(!isVideoMode)}
            >
              {isVideoMode ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant={isMuted ? "outline" : "default"}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        <Tabs value={showWhiteboard ? "whiteboard" : "avatar"} onValueChange={(v) => setShowWhiteboard(v === "whiteboard")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar">
              <Video className="h-4 w-4 mr-2" />
              Avatar View
            </TabsTrigger>
            <TabsTrigger value="whiteboard">
              <Edit3 className="h-4 w-4 mr-2" />
              Whiteboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatar" className="mt-4">
            {/* 3D Avatar Video Preview with Lip-Sync */}
            {isVideoMode && (
              <div className="relative aspect-video bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-lg overflow-hidden border-2 border-primary/20">
                <ReadyPlayerMeAvatar
                  avatarUrl={tutorAvatar}
                  isSpeaking={isSpeaking}
                  isThinking={isLoading}
                  audioElement={audioRef.current}
                />
                
                {isLoading && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1 rounded-full z-10">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-primary/80 backdrop-blur px-3 py-1 rounded-full z-10">
                    <div className="flex gap-1">
                      <div className="h-2 w-1 bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-1 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-1 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-white">Speaking...</span>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse flex items-center gap-2 z-10">
                    <Circle className="h-3 w-3 fill-white" />
                    RECORDING
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
                  <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="whiteboard" className="mt-4">
            <CollaborativeWhiteboard sessionId={`tutor-${tutorId}-${moduleId}`} />
          </TabsContent>
        </Tabs>

        {/* Satisfaction Rating */}
        {showSatisfaction && (
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg animate-fade-in">
            <span className="text-sm font-medium">Rate this response:</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                size="sm"
                variant={satisfaction === rating ? "default" : "outline"}
                onClick={() => submitSatisfaction(rating)}
                className="h-8 w-8 p-0"
              >
                <Star className={`h-4 w-4 ${satisfaction >= rating ? 'fill-current' : ''}`} />
              </Button>
            ))}
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea className="h-[300px]" ref={scrollRef}>
          <div className="space-y-4 pr-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">✝️ Christ is Lord over this learning session</p>
                <p className="text-xs mt-2">
                  Ask me anything about the module content. I'm here to help with realistic voice responses!
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border border-primary/20">
                    <AvatarImage src={tutorAvatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {tutorName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <div className="flex gap-2 w-full">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your AI tutor anything..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};