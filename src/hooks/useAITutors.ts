import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logSpiritualEvent } from "@/lib/scrollGovernance";
import { getUserFriendlyError } from "@/lib/errors";

console.info("✝️ AI Tutors — Christ-guided learning");

// Types
export interface AITutor {
  id: string;
  name: string;
  faculty_id?: string;
  avatar_image_url?: string;
  description?: string;
  specialty?: string;
  personality_prompt?: string;
  is_online?: boolean;
  created_at: string;
}

export interface TutorSession {
  id: string;
  user_id: string;
  tutor_id: string;
  module_id?: string;
  institution_id: string;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  started_at?: string;
  ended_at?: string;
  total_messages?: number;
  tutor?: AITutor;
}

export interface TutorMessage {
  id: string;
  session_id: string;
  sender_type: 'student' | 'tutor' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// Fetchers
export async function getAITutors() {
  const { data, error } = await (supabase as any)
    .from("ai_tutors")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as AITutor[];
}

export async function getAITutor(id: string) {
  const { data, error } = await (supabase as any)
    .from("ai_tutors")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as AITutor;
}

export async function getTutorSessions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await (supabase as any)
    .from("ai_tutor_sessions")
    .select(`
      *,
      tutor:ai_tutors(*),
      course:courses(*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as TutorSession[];
}

export async function getTutorSession(id: string) {
  const { data, error } = await (supabase as any)
    .from("ai_tutor_sessions")
    .select(`
      *,
      tutor:ai_tutors(*),
      course:courses(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as TutorSession;
}

export async function getSessionMessages(sessionId: string) {
  const { data, error } = await (supabase as any)
    .from("ai_tutor_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as TutorMessage[];
}

export async function createTutorSession(params: {
  tutor_id: string;
  course_id?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await (supabase as any)
    .from("ai_tutor_sessions")
    .insert({
      user_id: user.id,
      tutor_id: params.tutor_id,
      course_id: params.course_id,
      status: "active"
    })
    .select()
    .single();

  if (error) throw error;

  await logSpiritualEvent({
    scope: 'ai_tutor',
    action: 'session_created',
    details: { session_id: data.id, tutor_id: params.tutor_id },
    severity: 'info'
  });

  return data as TutorSession;
}

export async function sendTutorMessage(params: {
  session_id: string;
  message: string;
}) {
  const response = await supabase.functions.invoke('ai-tutor-chat', {
    body: {
      session_id: params.session_id,
      message: params.message
    }
  });

  if (response.error) throw response.error;
  return response.data;
}

export async function closeTutorSession(sessionId: string) {
  const { data, error } = await (supabase as any)
    .from("ai_tutor_sessions")
    .update({
      status: "closed",
      closed_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as TutorSession;
}

// Hooks
export const useAITutors = () =>
  useQuery({ queryKey: ["ai-tutors"], queryFn: getAITutors });

export const useAITutor = (id: string) =>
  useQuery({
    queryKey: ["ai-tutor", id],
    queryFn: () => getAITutor(id),
    enabled: !!id
  });

export const useTutorSessions = () =>
  useQuery({ queryKey: ["tutor-sessions"], queryFn: getTutorSessions });

export const useTutorSession = (id: string) =>
  useQuery({
    queryKey: ["tutor-session", id],
    queryFn: () => getTutorSession(id),
    enabled: !!id
  });

export const useSessionMessages = (sessionId: string) =>
  useQuery({
    queryKey: ["session-messages", sessionId],
    queryFn: () => getSessionMessages(sessionId),
    enabled: !!sessionId,
    refetchInterval: 2000 // Auto-refresh every 2 seconds
  });

export const useCreateTutorSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTutorSession,
    onSuccess: () => {
      toast({ title: "✝️ Tutor session started — Seek wisdom in Christ" });
      qc.invalidateQueries({ queryKey: ["tutor-sessions"] });
    },
    onError: (e: any) => toast({
      title: "Failed to start session",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};

export const useSendTutorMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendTutorMessage,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["session-messages", variables.session_id] });
    },
    onError: (e: any) => toast({
      title: "Failed to send message",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};

export const useCloseTutorSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: closeTutorSession,
    onSuccess: () => {
      toast({ title: "Session closed" });
      qc.invalidateQueries({ queryKey: ["tutor-sessions"] });
    },
    onError: (e: any) => toast({
      title: "Failed to close session",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};
