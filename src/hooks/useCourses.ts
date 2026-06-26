import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';
import { underChrist } from '@/lib/lordship';
import { logError } from '@/lib/errors';
import { runPrerequisiteCheck } from './usePrerequisiteCheck';

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
      console.info('✝️ Jesus Christ is Lord over this operation');
      const { data, error }: any = await supabase
        .from('enrollments' as any)
        .select(`
          *,
          courses (
            id,
            title,
            faculty,
            description
          )
        `)
        .eq('user_id', user!.id)
        .eq('institution_id', activeInstitution!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!activeInstitution,
  });
};

export const useEnrollInCourse = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      console.info('✝️ Jesus Christ is Lord over this operation');

      // Hard prerequisite enforcement (RPC + audit log). Block before any insert.
      const prereq = await runPrerequisiteCheck(user!.id, courseId, 'useEnrollInCourse');
      if (!prereq.eligible) {
        const titles = (prereq.missing_prerequisites ?? [])
          .map((p) => p.title || p.course_id)
          .join(', ');
        const err: any = new Error(
          `You must complete the following prerequisite course(s) before starting this course: ${titles || 'see course details'}.`
        );
        err.code = 'PREREQUISITES_NOT_MET';
        err.missing_prerequisites = prereq.missing_prerequisites;
        throw err;
      }


      const promoteIfMatriculated = async () => {
        const { data: matriculationRecord } = await supabase
          .from('matriculation_records' as any)
          .select('user_id')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (!matriculationRecord) return false;

        const { error: transitionError } = await supabase.rpc('transition_student_status', {
          p_user_id: user!.id,
          p_new_status: 'enrolled',
          p_reason: 'Recovered stale lifecycle status from completed matriculation during course enrollment',
        } as any);

        return !transitionError;
      };
      
      // Get user's current institution
      const { data: profile }: any = await supabase
        .from('profiles' as any)
        .select('current_institution_id,lifecycle_status')
        .eq('id', user!.id)
        .single();
      
      let institutionId = profile?.current_institution_id;

      if (profile?.lifecycle_status === 'admitted') {
        await promoteIfMatriculated();
      }

      // If user has no institution, get the default ScrollUniversity institution
      if (!institutionId) {
        const { data: defaultInst } = await supabase
          .from('institutions')
          .select('id')
          .eq('slug', 'scrolluniversity')
          .single();
        
        institutionId = defaultInst?.id;

        // Update profile with default institution
        if (institutionId) {
          await supabase
            .from('profiles' as any)
            .update({ current_institution_id: institutionId } as any)
            .eq('id', user!.id);
        }
      }

      if (!institutionId) {
        throw new Error('No institution available for enrollment');
      }

      // Check existing enrollment to provide a friendly UX (avoids duplicate-key error)
      const { data: existing } = await supabase
        .from('enrollments' as any)
        .select('id')
        .eq('user_id', user!.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        return { success: true, alreadyEnrolled: true };
      }

      const { error } = await supabase
        .from('enrollments' as any)
        .insert({
          user_id: user!.id,
          course_id: courseId,
          progress: 0,
          institution_id: institutionId
        });

      if (error) {
        // Postgres unique-violation – treat as already enrolled
        if ((error as any).code === '23505') {
          return { success: true, alreadyEnrolled: true };
        }

        const rawMsg = (error as any)?.message || '';
        if (/matriculation/i.test(rawMsg) && await promoteIfMatriculated()) {
          const { error: retryError } = await supabase
            .from('enrollments' as any)
            .insert({
              user_id: user!.id,
              course_id: courseId,
              progress: 0,
              institution_id: institutionId
            });

          if (!retryError || (retryError as any)?.code === '23505') {
            return { success: true, alreadyEnrolled: (retryError as any)?.code === '23505' };
          }

          throw retryError;
        }

        throw error;
      }
      return { success: true };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: result?.alreadyEnrolled ? '✓ Already Enrolled' : '✝️ Enrolled Successfully',
        description: result?.alreadyEnrolled
          ? 'You are already enrolled in this course. Continue your journey from My Courses.'
          : 'You have been enrolled in the course. Christ leads your learning journey.',
      });
    },
    onError: (error: unknown) => {
      const rawMsg = (error as any)?.message || "";
      // Surface matriculation gate clearly with CTA
      if (/matriculation/i.test(rawMsg)) {
        toast({
          title: "Matriculation required",
          description: "Please complete matriculation before enrolling. Opening matriculation now…",
          variant: "default",
        });
        if (typeof window !== "undefined") {
          setTimeout(() => { window.location.href = "/matriculation"; }, 800);
        }
        return;
      }
      const parsed = logError(error, { context: "enroll_course", action: "enrollInCourse" });
      toast({
        title: parsed.severity === "info" ? "Already enrolled" : "Enrollment Failed",
        description: parsed.severity === "info" ? parsed.userMessage : (rawMsg || parsed.userMessage),
        variant: parsed.severity === "info" ? "default" : "destructive",
      });
    },
  });
};

// Fetch single course
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

// Fetch modules by course
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

// Fetch single module with materials and quiz
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

// Fetch quiz by id
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

// Complete module mutation
export const useCompleteModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { courseId: string; moduleId: string }) => {
      const { error } = await (supabase as any)
        .from('module_progress')
        .upsert({
          user_id: user!.id,
          course_id: args.courseId,
          module_id: args.moduleId,
          completed: true,
          completed_at: new Date().toISOString()
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });
};

// Submit quiz mutation
export const useSubmitQuiz = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { courseId: string; moduleId: string; score: number }) => {
      const { error } = await (supabase as any)
        .from('quiz_submissions')
        .insert({
          user_id: user!.id,
          course_id: args.courseId,
          module_id: args.moduleId,
          score: args.score
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });
};
