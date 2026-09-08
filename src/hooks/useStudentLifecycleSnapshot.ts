import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStudentLifecycleStatus, type StudentLifecycleSnapshot } from "@/lib/studentLifecycle";

export function useStudentLifecycleSnapshot() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["student-lifecycle-snapshot", user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async (): Promise<StudentLifecycleSnapshot> => {
      const userId = user!.id;
      const [profileRes, orientationRes, matriculationRes, learningProfileRes, enrollmentRes] = await Promise.all([
        supabase.from("profiles").select("lifecycle_status").eq("id", userId).maybeSingle(),
        supabase.from("orientation_progress").select("step", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("matriculation_records").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("student_learning_profiles").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("section_enrollments" as any).select("id", { count: "exact", head: true }).eq("student_user_id", userId).eq("status", "enrolled"),
      ]);
      const error = profileRes.error || orientationRes.error || matriculationRes.error || learningProfileRes.error || (enrollmentRes as any).error;
      if (error) throw error;
      return {
        authenticated: true,
        lifecycleStatus: normalizeStudentLifecycleStatus(profileRes.data?.lifecycle_status),
        orientationStepsCompleted: orientationRes.count ?? 0,
        matriculated: !!matriculationRes.data,
        learningProfileComplete: !!learningProfileRes.data,
        enrollmentCount: (enrollmentRes as any).count ?? 0,
      };
    },
  });
  return { ...query, authLoading, authenticated: !!user };
}
