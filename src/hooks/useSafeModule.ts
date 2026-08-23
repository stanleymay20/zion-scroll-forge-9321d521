import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Student-facing module reader.
 *
 * Deliberately avoids embedded quiz question/answer payloads. Assessment content is
 * delivered only through the trusted module-quiz boundary.
 */
export function useSafeModule(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['safe-module', moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('course_modules')
        .select(`
          *,
          learning_materials(*),
          quizzes(id,title,passing_score)
        `)
        .eq('id', moduleId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
