/**
 * Hard prerequisite enforcement for course enrollment and learning access.
 * Calls the `check_prerequisites` RPC and writes an audit row to
 * `prerequisite_check_logs`. Use the result to gate enroll/start buttons.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PrereqItem = { course_id: string; title: string };

export interface PrerequisiteResult {
  eligible: boolean;
  missing_prerequisites: PrereqItem[];
  completed_prerequisites: PrereqItem[];
  message: string;
}

const SAFE_BLOCK: PrerequisiteResult = {
  eligible: false,
  missing_prerequisites: [],
  completed_prerequisites: [],
  message: 'Unable to verify prerequisites. Please retry.',
};

export async function runPrerequisiteCheck(
  studentId: string,
  courseId: string,
  sourcePage: string
): Promise<PrerequisiteResult> {
  const { data, error } = await (supabase as any).rpc('check_prerequisites', {
    p_student_id: studentId,
    p_course_id: courseId,
  });

  if (error || !data) {
    console.error('[prereq] RPC failed', error);
    throw error ?? new Error('Prerequisite check failed');
  }

  const result = data as PrerequisiteResult;

  // Best-effort audit log; never block on logging failures.
  try {
    await (supabase as any).from('prerequisite_check_logs').insert({
      student_id: studentId,
      course_id: courseId,
      eligible: result.eligible,
      missing_prerequisites: result.missing_prerequisites ?? [],
      completed_prerequisites: result.completed_prerequisites ?? [],
      source_page: sourcePage,
    });
  } catch (e) {
    console.warn('[prereq] audit log failed', e);
  }

  return result;
}

export function usePrerequisiteCheck(
  courseId: string | undefined,
  sourcePage: string
) {
  const { user } = useAuth();
  return useQuery<PrerequisiteResult>({
    queryKey: ['prerequisite-check', user?.id, courseId, sourcePage],
    queryFn: async () => {
      try {
        return await runPrerequisiteCheck(user!.id, courseId!, sourcePage);
      } catch {
        return SAFE_BLOCK;
      }
    },
    enabled: !!user?.id && !!courseId,
    staleTime: 30_000,
  });
}
