import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';

const useOptionalInstitution = () => {
  try {
    return useInstitution();
  } catch {
    return { activeInstitution: null };
  }
};

export const useUserEnrollments = () => {
  const { user } = useAuth();
  const { activeInstitution } = useOptionalInstitution();

  return useQuery({
    queryKey: ['enrollments', user?.id, activeInstitution?.id],
    queryFn: async () => {
      const { data, error }: any = await supabase
        .from('enrollments' as any)
        .select(`*, courses (id, title, faculty, description)`)
        .eq('user_id', user!.id)
        .eq('institution_id', activeInstitution!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!activeInstitution,
  });
};

/**
 * Legacy course CTAs now route to the canonical registrar workflow.
 * Existing legacy enrollment rows remain readable for backwards compatibility,
 * but this hook never creates a new public.enrollments row.
 */
export const useEnrollInCourse = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) throw new Error('Authentication required');
      const { data: existing, error } = await supabase
        .from('enrollments' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      if (error) throw error;
      if (existing) return { success: true, alreadyEnrolled: true, courseId };
      return { success: false, canonicalRegistrationRequired: true, courseId };
    },
    onSuccess: (result: any) => {
      if (result?.alreadyEnrolled) {
        toast({ title: '✓ Already Enrolled', description: 'This historical enrollment remains available in your course area.' });
        return;
      }
      if (result?.canonicalRegistrationRequired) {
        toast({ title: 'Registrar registration required', description: 'Opening the governed section-registration workflow.' });
        if (typeof window !== 'undefined') {
          window.location.assign(`/register?course=${encodeURIComponent(result.courseId)}`);
        }
      }
    },
  });
};

export const useCourse = (courseId: string) => {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, course_modules(id,title,order_index)')
        .eq('id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId
  });
};

export const useModules = (courseId: string) => {
  return useQuery({
    queryKey: ['modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('id, course_id, title, order_index, content_md')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId
  });
};

export const useModule = (moduleId: string) => {
  return useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('course_modules')
        .select('*, learning_materials(*), quizzes(id,title,questions)')
        .eq('id', moduleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId
  });
};

export const useQuiz = (quizId: string) => {
  return useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quizId
  });
};

export const useCompleteModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { courseId: string; moduleId: string }) => {
      const { error } = await (supabase as any)
        .from('module_progress')
        .upsert({ user_id: user!.id, course_id: args.courseId, module_id: args.moduleId, completed: true, completed_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });
};

export const useSubmitQuiz = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { courseId: string; moduleId: string; score: number }) => {
      const { error } = await (supabase as any)
        .from('quiz_submissions')
        .insert({ user_id: user!.id, course_id: args.courseId, module_id: args.moduleId, score: args.score });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); }
  });
};
