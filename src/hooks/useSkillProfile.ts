import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SkillProfileRow {
  user_id: string;
  skill_id: string;
  skill_name: string;
  category: string;
  skill_version: string;
  evidence_kind: 'demonstrated' | 'inferred';
  weighted_mastery: number | null;
  avg_current_confidence: number | null;
  avg_original_confidence: number | null;
  evidence_count: number;
  last_evidence_at: string | null;
}

export function useSkillProfile(studentId: string | undefined, kind?: 'demonstrated' | 'inferred') {
  return useQuery({
    queryKey: ['skill-profile', studentId, kind ?? 'all'],
    enabled: !!studentId,
    queryFn: async (): Promise<SkillProfileRow[]> => {
      const { data, error } = await supabase.rpc('get_student_skill_profile', {
        _student: studentId!,
        _kind: kind ?? null,
      } as never);
      if (error) throw error;
      return (data as SkillProfileRow[]) ?? [];
    },
  });
}
