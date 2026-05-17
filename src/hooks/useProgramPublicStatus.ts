import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgramTier =
  | "accreditation_track"
  | "pilot"
  | "experimental"
  | "internal_distinction"
  | "research_innovation"
  | "curriculum_pending"
  | "archived"
  | "unknown";

export interface ProgramPublicStatus {
  program_id: string;
  tier: ProgramTier;
  enrollable: boolean;
  trust_score: number;
  verified: {
    accreditation: boolean;
    curriculum: boolean;
    faculty: boolean;
    outcomes: boolean;
    practicum: boolean;
    ai_tutor: boolean;
    thesis: boolean;
  };
  disclosures: string[];
  computed_at: string;
}

export function useProgramPublicStatus(programId?: string) {
  return useQuery({
    queryKey: ["program-public-status", programId],
    enabled: !!programId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProgramPublicStatus | null> => {
      if (!programId) return null;
      const { data, error } = await supabase.rpc(
        "compute_program_public_status" as any,
        { p_program_id: programId }
      );
      if (error) throw error;
      return data as unknown as ProgramPublicStatus;
    },
  });
}
