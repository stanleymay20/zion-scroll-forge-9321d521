/**
 * useLiveClassContext — single source of truth for live-class context.
 * Resolves: authenticated user → student record → degree_program →
 *           enrolled course (from moduleId) → faculty → matched AI tutor.
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

      const dbg = (...args: unknown[]) => console.debug('[useLiveClassContext]', ...args);

      const { data: { user } } = await supabase.auth.getUser();
      dbg('auth.user', user?.id ?? null);
      if (!user) return { ...empty, blockedReason: 'Sign in to join the live class.' };

      // Module → course
      const { data: mod, error: modErr } = await supabase
        .from('course_modules')
        .select('id,title,content_md,course_id,learning_objectives')
        .eq('id', moduleId!)
        .maybeSingle();
      dbg('module', { moduleId, found: !!mod, err: modErr?.message });
      if (modErr) return { ...empty, blockedReason: `Module lookup failed: ${modErr.message}` };
      if (!mod) return { ...empty, blockedReason: `Module ${moduleId} not found.` };
      if (!mod.course_id) return { ...empty, blockedReason: `Invalid course mapping: module ${mod.id} has no course_id.` };

      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .select('id,title,faculty,faculty_id,learning_outcomes')
        .eq('id', mod.course_id)
        .maybeSingle();
      dbg('course', { courseId: mod.course_id, found: !!course, faculty_id: course?.faculty_id, err: courseErr?.message });
      if (courseErr) return { ...empty, blockedReason: `Course lookup failed: ${courseErr.message}` };
      if (!course) return { ...empty, blockedReason: `Invalid course mapping: course ${mod.course_id} not found.` };

      // Student → program.
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('full_name,degree_program_id')
        .eq('user_id', user.id)
        .maybeSingle();
      dbg('student', { userId: user.id, found: !!student, hasProgram: !!student?.degree_program_id, err: studentErr?.message });
      if (studentErr) return { ...empty, userId: user.id, blockedReason: `Student profile lookup failed: ${studentErr.message}` };
      if (!student) return { ...empty, userId: user.id, blockedReason: `Auth mismatch: no student profile linked to auth user ${user.id}.` };

      if (!student.degree_program_id) {
        return {
          ...empty,
          userId: user.id,
          studentName: user.email ?? null,
          courseId: course.id,
          courseTitle: course.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleContent: mod.content_md ?? null,
          blockedReason: 'No accepted degree program is assigned to your student record.',
        };
      }

      // Hard enrollment guard. NOTE: `enrollments` has no `status` column —
      // previously selecting it caused PostgREST 42703 and silently produced
      // "Not enrolled" for every user. Select only existing columns.
      const { data: enrollment, error: enrollmentErr } = await supabase
        .from('enrollments')
        .select('id,course_id,user_id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();
      dbg('enrollment', { userId: user.id, courseId: course.id, found: !!enrollment, err: enrollmentErr?.message });

      if (enrollmentErr) {
        return {
          ...empty,
          userId: user.id,
          studentName: student.full_name ?? user.email ?? null,
          programId: student.degree_program_id,
          courseId: course.id,
          courseTitle: course.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleContent: mod.content_md ?? null,
          blockedReason: `Enrollment query failed: ${enrollmentErr.message}`,
        };
      }

      if (!enrollment) {
        return {
          ...empty,
          userId: user.id,
          studentName: student.full_name ?? user.email ?? null,
          programId: student.degree_program_id,
          courseId: course.id,
          courseTitle: course.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleContent: mod.content_md ?? null,
          blockedReason: `Missing enrollment: user ${user.id} is not enrolled in course ${course.id} (${course.title}).`,
        };
      }

      let programTitle: string | null = null;
      let programFacultyName: string | null = null;
      const { data: prog } = await supabase
        .from('degree_programs')
        .select('title,faculty')
        .eq('id', student.degree_program_id)
        .maybeSingle();
      programTitle = prog?.title ?? null;
      programFacultyName = prog?.faculty ?? null;

      // Match an AI tutor by canonical faculty assignment only. No global tutor and
      // no loose specialty substring fallback are allowed for live lectures.
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

      // Resolve faculty name → faculties.id → tutor only when the course has no
      // faculty_id. This is still faculty-scoped and avoids generic fallback tutors.
      if (!tutor && !course.faculty_id && course.faculty) {
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

      if (!tutor) {
        return {
          ...empty,
          ready: false,
          blocked: true,
          userId: user.id,
          studentName: student.full_name ?? user.email ?? null,
          programTitle,
          programId: student.degree_program_id,
          facultyName: course.faculty ?? programFacultyName ?? null,
          facultyId: course.faculty_id ?? null,
          courseId: course.id,
          courseTitle: course.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleContent: mod.content_md ?? null,
          blockedReason: `Missing tutor: no AI lecturer assigned to faculty "${course.faculty ?? programFacultyName ?? '(unknown)'}" (faculty_id=${course.faculty_id ?? 'null'}).`,
        };
      }

      // Prefer module-level objectives (specific to this lecture), fallback to course-level outcomes.
      const moduleObjectives = Array.isArray((mod as any).learning_objectives) ? (mod as any).learning_objectives as string[] : [];
      const courseOutcomes = Array.isArray((course as any).learning_outcomes) ? (course as any).learning_outcomes as string[] : [];
      const objectives: string[] = moduleObjectives.length > 0 ? moduleObjectives : courseOutcomes;

      return {
        ready: true,
        blocked: false,
        userId: user.id,
        studentName: student.full_name ?? user.email ?? null,
        programTitle,
        programId: student.degree_program_id,
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
