/**
 * useLiveClassContext — single source of truth for live-class context.
 * Resolves: authenticated user → student record → degree_program →
 *           course (from moduleId) → faculty → matched AI tutor.
 *
 * Returns truthful status; never invents a fallback course/tutor.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LiveClassContext {
  ready: boolean;
  blocked: boolean;
  blockedReason?: string;
  userId: string | null;
  studentName: string | null;
  programTitle: string | null;
  programId: string | null;
  facultyName: string | null;
  facultyId: string | null;
  courseId: string | null;
  courseTitle: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  moduleContent: string | null;
  learningObjectives: string[];
  tutor: {
    id: string;
    name: string;
    specialty: string;
    avatar_image_url: string | null;
  } | null;
}

export function useLiveClassContext(moduleId?: string) {
  return useQuery<LiveClassContext>({
    queryKey: ['live-class-context', moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const empty: LiveClassContext = {
        ready: false, blocked: true, blockedReason: 'No module selected.',
        userId: null,
        studentName: null, programTitle: null, programId: null,
        facultyName: null, facultyId: null, courseId: null, courseTitle: null,
        moduleId: moduleId ?? null, moduleTitle: null, moduleContent: null,
        learningObjectives: [], tutor: null,
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ...empty, blockedReason: 'Sign in to join the live class.' };

      // Module → course
      const { data: mod } = await supabase
        .from('course_modules')
        .select('id,title,content_md,course_id')
        .eq('id', moduleId!)
        .maybeSingle();
      if (!mod?.course_id) return { ...empty, blockedReason: 'Module is not linked to a course.' };

      const { data: course } = await supabase
        .from('courses')
        .select('id,title,faculty,faculty_id,learning_outcomes')
        .eq('id', mod.course_id)
        .maybeSingle();
      if (!course) return { ...empty, blockedReason: 'Course for this module is unavailable.' };

      // Student → program (best-effort; non-blocking)
      const { data: student } = await supabase
        .from('students')
        .select('full_name,degree_program_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let programTitle: string | null = null;
      let programFacultyName: string | null = null;
      if (student?.degree_program_id) {
        const { data: prog } = await supabase
          .from('degree_programs')
          .select('title,faculty')
          .eq('id', student.degree_program_id)
          .maybeSingle();
        programTitle = prog?.title ?? null;
        programFacultyName = prog?.faculty ?? null;
      }

      // Match an AI tutor by faculty (no global fallback)
      let tutor: LiveClassContext['tutor'] = null;
      if (course.faculty_id) {
        const { data } = await supabase
          .from('ai_tutors')
          .select('id,name,specialty,avatar_image_url')
          .eq('faculty_id', course.faculty_id)
          .limit(1)
          .maybeSingle();
        if (data) tutor = data as any;
      }
      // Fallback A: resolve faculty name → faculties.id → tutor
      if (!tutor && course.faculty) {
        const { data: fac } = await supabase
          .from('faculties')
          .select('id')
          .ilike('name', course.faculty)
          .limit(1)
          .maybeSingle();
        if (fac?.id) {
          const { data } = await supabase
            .from('ai_tutors')
            .select('id,name,specialty,avatar_image_url')
            .eq('faculty_id', fac.id)
            .limit(1)
            .maybeSingle();
          if (data) tutor = data as any;
        }
      }
      // Fallback B: specialty substring match
      if (!tutor && course.faculty) {
        const { data } = await supabase
          .from('ai_tutors')
          .select('id,name,specialty,avatar_image_url')
          .ilike('specialty', `%${course.faculty}%`)
          .limit(1)
          .maybeSingle();
        if (data) tutor = data as any;
      }

      const objectives: string[] = Array.isArray((course as any).learning_outcomes)
        ? (course as any).learning_outcomes
        : [];

      return {
        ready: true,
        blocked: false,
        userId: user.id,
        studentName: student?.full_name ?? user.email ?? null,
        programTitle,
        programId: student?.degree_program_id ?? null,
        facultyName: course.faculty ?? programFacultyName ?? null,
        facultyId: course.faculty_id ?? null,
        courseId: course.id,
        courseTitle: course.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
        moduleContent: mod.content_md ?? null,
        learningObjectives: objectives,
        tutor,
      };
    },
  });
}
