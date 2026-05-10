import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logError, getUserFriendlyError } from "@/lib/errors";

console.info("✝️ ScrollUniversity Degrees — Christ forms scholars for His Kingdom");

// Types - Updated to match actual database schema
export interface DegreeProgram {
  id: string;
  title: string;
  description?: string;
  level?: string;
  faculty?: string;
  duration?: string;
  scroll_level?: string;
  total_credits?: number;
  min_gpa?: number;
  is_active?: boolean;
  courses?: any[];
  created_at?: string;
}

export interface DegreeEnrollment {
  id: string;
  user_id: string;
  degree_id: string;
  status: string;
  enrolled_at?: string;
  expected_graduation?: string;
  actual_graduation?: string;
  credits_completed?: number;
  credits_required?: number;
  gpa?: number;
  degree?: DegreeProgram;
}

// Fetchers
export async function getDegreePrograms() {
  // Public catalog: only active, public, and external-facing (Exousia honorifics excluded)
  const { data, error } = await supabase
    .from("degree_programs")
    .select("*")
    .eq("is_active", true)
    .eq("program_status", "active_public")
    .eq("is_external_facing", true)
    .order("faculty")
    .order("scroll_level");

  if (error) throw error;
  
  // Return simplified data without expensive nested queries
  return (data || []).map(program => ({
    ...program,
    total_credits: program.total_credits || 120,
    courses: []
  }));
}

export async function getDegreeProgram(id: string) {
  const { data, error } = await supabase
    .from("degree_programs")
    .select(`
      *,
      degree_course_requirements(
        id,
        is_required,
        credits,
        semester_recommended,
        courses!degree_course_requirements_course_id_fkey(id, title, description, level, duration, faculty, course_modules(id))
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  
  // Transform courses
  return {
    ...data,
    title: data?.title,
    total_credits: (data?.degree_course_requirements as any[])?.reduce(
      (sum: number, r: any) => sum + (r.credits || 3), 0
    ) || 120,
    courses: (data?.degree_course_requirements as any[])?.map((r: any) => ({
      ...r.courses,
      is_required: r.is_required,
      credits: r.credits,
      semester: r.semester_recommended,
      module_count: r.courses?.course_modules?.length || 0
    })) || []
  };
}

export async function getUserDegreeEnrollments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("student_degree_enrollments")
    .select(`
      *,
      degree_programs(
        id,
        title,
        description,
        level,
        faculty,
        duration
      )
    `)
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;
  
  return (data || []).map(enrollment => ({
    ...enrollment,
    degree: enrollment.degree_programs
  })) as DegreeEnrollment[];
}

export async function enrollInDegree(degreeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Idempotent: if already enrolled, return existing record instead of erroring.
  const { data: existing } = await supabase
    .from("student_degree_enrollments")
    .select(`*, degree_programs(id, title, faculty, level)`)
    .eq("user_id", user.id)
    .eq("degree_id", degreeId)
    .maybeSingle();

  if (existing) {
    return {
      ...existing,
      degree: (existing as any).degree_programs,
      alreadyEnrolled: true,
    } as DegreeEnrollment & { alreadyEnrolled?: boolean };
  }

  // Get degree details to calculate expected completion
  const { data: degree } = await supabase
    .from("degree_programs")
    .select("duration")
    .eq("id", degreeId)
    .maybeSingle();

  // Parse duration (e.g., "2 years" -> 24 months)
  const durationStr = degree?.duration || '2 years';
  const years = parseInt(durationStr) || 2;
  const months = years * 12;

  const expectedCompletion = new Date();
  expectedCompletion.setMonth(expectedCompletion.getMonth() + months);

  const { data, error } = await supabase
    .from("student_degree_enrollments")
    .insert({
      user_id: user.id,
      degree_id: degreeId,
      status: "active",
      expected_graduation: expectedCompletion.toISOString()
    })
    .select(`
      *,
      degree_programs(
        id,
        title,
        faculty,
        level
      )
    `)
    .single();

  if (error) throw error;
  return {
    ...data,
    degree: data.degree_programs
  } as DegreeEnrollment;
}

export async function updateDegreeEnrollment(enrollmentId: string, updates: Partial<DegreeEnrollment>) {
  const { data, error } = await supabase
    .from("student_degree_enrollments")
    .update(updates)
    .eq("id", enrollmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DegreeEnrollment;
}

export async function getDegreeProgress(degreeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get all courses for this degree
  const { data: degreeCourses } = await supabase
    .from("degree_course_requirements")
    .select("course_id, credits, is_required")
    .eq("degree_id", degreeId);

  if (!degreeCourses || degreeCourses.length === 0) {
    return {
      totalCredits: 0,
      completedCredits: 0,
      totalCourses: 0,
      completedCourses: 0,
      progressPercentage: 0
    };
  }

  // Get user's completed courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id, progress")
    .eq("user_id", user.id)
    .in("course_id", degreeCourses.map((dc: any) => dc.course_id));

  const totalCredits = degreeCourses.reduce((sum: number, dc: any) => sum + (dc.credits || 3), 0);
  const completedCredits = degreeCourses.reduce((sum: number, dc: any) => {
    const enrollment = enrollments?.find(e => e.course_id === dc.course_id);
    return enrollment && enrollment.progress >= 100 ? sum + (dc.credits || 3) : sum;
  }, 0);

  const completedCourses = enrollments?.filter(e => e.progress >= 100).length || 0;
  const totalCourses = degreeCourses.length;

  return {
    totalCredits,
    completedCredits,
    totalCourses,
    completedCourses,
    progressPercentage: totalCredits > 0 ? (completedCredits / totalCredits) * 100 : 0
  };
}

// Hooks
export const useDegreePrograms = () =>
  useQuery({ queryKey: ["degree-programs"], queryFn: getDegreePrograms });

export const useDegreeProgram = (id: string) =>
  useQuery({
    queryKey: ["degree-program", id],
    queryFn: () => getDegreeProgram(id),
    enabled: !!id
  });

export const useUserDegreeEnrollments = () =>
  useQuery({ queryKey: ["user-degree-enrollments"], queryFn: getUserDegreeEnrollments });

export const useEnrollInDegree = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrollInDegree,
    onSuccess: (result: any) => {
      if (result?.alreadyEnrolled) {
        toast({ title: "You are already enrolled in this program." });
      } else {
        toast({ title: "✝️ Enrolled in degree program — May Christ guide your studies" });
      }
      qc.invalidateQueries({ queryKey: ["user-degree-enrollments"] });
    },
    onError: (e: unknown) => {
      const parsed = logError(e, { context: "enroll_degree", action: "enrollInDegree" });
      toast({
        title: parsed.severity === "info" ? "Already enrolled" : "Couldn't enroll",
        description: parsed.userMessage,
        variant: parsed.severity === "info" ? "default" : "destructive",
      });
    },
  });
};

export const useUpdateDegreeEnrollment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DegreeEnrollment> }) =>
      updateDegreeEnrollment(id, updates),
    onSuccess: () => {
      toast({ title: "✅ Degree enrollment updated" });
      qc.invalidateQueries({ queryKey: ["user-degree-enrollments"] });
    },
    onError: (e: any) => toast({
      title: "Failed to update enrollment",
      description: getUserFriendlyError(e),
      variant: "destructive"
    })
  });
};

export const useDegreeProgress = (degreeId: string) =>
  useQuery({
    queryKey: ["degree-progress", degreeId],
    queryFn: () => getDegreeProgress(degreeId),
    enabled: !!degreeId
  });
