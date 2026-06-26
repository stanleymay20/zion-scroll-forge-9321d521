import { supabase } from '@/integrations/supabase/client';
import { underChrist } from '@/lib/lordship';
import type {
  Course,
  CourseModule,
  Lecture,
  Assessment,
  Assignment,
  CourseProgress,
  StudentSubmission,
  CourseCompletion,
  CourseFilters,
  CourseSortOptions,
  CourseDetailResponse,
  ModuleContentResponse,
  Enrollment
} from '@/types/course';

// ============================================================================
// COMPREHENSIVE COURSE MANAGEMENT SERVICE
// Following ScrollUniversity standards for complete course structure
// ============================================================================

/**
 * List courses with comprehensive filtering and search
 */
export const listCourses = underChrist(async (
  filters: CourseFilters = {},
  sort: CourseSortOptions = { field: 'created_at', direction: 'desc' },
  page: number = 1,
  limit: number = 12
) => {
  let query = supabase
    .from('courses')
    .select(`
      *,
      faculties(name),
      enrollments(count)
    `);

  // Apply filters
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.faculty && filters.faculty !== 'All Faculties') {
    query = query.eq('faculty', filters.faculty);
  }

  if (filters.level && filters.level !== 'All Levels') {
    query = query.eq('level', filters.level);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters.xr_enabled !== undefined) {
    query = query.eq('xr_enabled', filters.xr_enabled);
  }

  if (filters.price_range) {
    query = query.gte('price_cents', filters.price_range[0] * 100)
                 .lte('price_cents', filters.price_range[1] * 100);
  }

  if (filters.rating_min) {
    query = query.gte('rating', filters.rating_min);
  }

  // Apply sorting
  query = query.order(sort.field, { ascending: sort.direction === 'asc' });

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    courses: data as Course[],
    total: count || 0,
    page,
    limit
  };
});

/**
 * Get comprehensive course details with all modules and content
 */
export const getCourseDetail = underChrist(async (courseId: string, userId?: string): Promise<CourseDetailResponse> => {
  // Get course basic info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError) throw courseError;

  // Get course modules with content
  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index');

  if (modulesError) throw modulesError;

  // Get user enrollment if userId provided
  let enrollment: any = undefined;
  if (userId) {
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .maybeSingle();
    
    enrollment = enrollmentData;
  }

  return {
    course: course as any,
    modules: (modules || []).map(m => ({
      ...m,
      content: typeof m.content === 'string' ? JSON.parse(m.content) : m.content
    })) as any[],
    enrollment,
    progress: []
  };
});

// Module content fetching simplified - using existing schema only

/**
 * Enroll user in course with spiritual alignment validation
 */
export const enrollInCourse = underChrist(async (userId: string, courseId: string) => {
  // Hard prerequisite enforcement (RPC + audit log) before any insert.
  const { data: prereq, error: prereqErr } = await (supabase as any).rpc('check_prerequisites', {
    p_student_id: userId,
    p_course_id: courseId,
  });
  if (prereqErr) throw prereqErr;
  if (prereq && prereq.eligible === false) {
    try {
      await (supabase as any).from('prerequisite_check_logs').insert({
        student_id: userId,
        course_id: courseId,
        eligible: false,
        missing_prerequisites: prereq.missing_prerequisites ?? [],
        completed_prerequisites: prereq.completed_prerequisites ?? [],
        source_page: 'services/courses.enrollInCourse',
      });
    } catch (e) { console.warn('[prereq] audit log failed', e); }
    const titles = (prereq.missing_prerequisites ?? [])
      .map((p: any) => p.title || p.course_id).join(', ');
    const err: any = new Error(
      `You must complete the following prerequisite course(s) before starting this course: ${titles || 'see course details'}.`
    );
    err.code = 'PREREQUISITES_NOT_MET';
    err.missing_prerequisites = prereq.missing_prerequisites;
    throw err;
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (existingEnrollment) {
    throw new Error('Already enrolled in this course');
  }


  // Get user's current institution
  const { data: profile }: any = await supabase
    .from('profiles' as any)
    .select('current_institution_id')
    .eq('id', userId)
    .single();

  // Create enrollment
  const { error } = await supabase
    .from('enrollments' as any)
    .insert({ 
      user_id: userId, 
      course_id: courseId, 
      progress: 0,
      institution_id: profile?.current_institution_id,
      enrolled_at: new Date().toISOString()
    });

  if (error) throw error;

  // Initialize spiritual assessment for the course
  await initializeSpiritualAssessment(userId, courseId);

  return { success: true };
});

// Progress tracking simplified

// Assessment submission simplified

// Assignment submission simplified

/**
 * Get user enrollments with comprehensive progress data
 */
export const getUserEnrollments = underChrist(async (userId: string) => {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      courses(*),
      course_progress(*)
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return data;
});

// Course completion simplified

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize spiritual assessment for new enrollment
 */
const initializeSpiritualAssessment = async (userId: string, courseId: string) => {
  const { error } = await supabase
    .from('spiritual_assessments')
    .insert({
      user_id: userId,
      assessment_type: 'course_enrollment',
      calling_insights: {},
      spiritual_gifts: [],
      growth_areas: [],
      scripture_references: [],
      confidence_score: 0.0
    });

  if (error) console.error('Failed to initialize spiritual assessment:', error);
};

// Helper functions removed - using simplified schema

/**
 * Calculate final course score
 */
const calculateFinalScore = async (userId: string, courseId: string): Promise<number> => {
  // Simplified - return mock score
  return 85;
};

/**
 * Calculate ministry readiness score
 */
const calculateMinistryReadiness = async (userId: string, courseId: string): Promise<number> => {
  // This would analyze spiritual growth, practical application, and character development
  // Placeholder implementation
  return 0.85;
};

/**
 * Generate spiritual growth summary
 */
const generateSpiritualGrowthSummary = async (userId: string, courseId: string): Promise<string> => {
  // This would analyze all spiritual reflections and growth notes
  // Placeholder implementation
  return "Demonstrated significant spiritual growth through consistent prayer, scripture study, and practical ministry application.";
};

/**
 * Generate course completion certificate
 */
const generateCertificate = async (completionId: string) => {
  // This would generate a PDF certificate
  // Placeholder implementation
  console.log('Generating certificate for completion:', completionId);
};

/**
 * Mint ScrollBadge NFT for course completion
 */
const mintScrollBadgeNFT = async (completionId: string) => {
  // This would mint an NFT on the blockchain
  // Placeholder implementation
  console.log('Minting ScrollBadge NFT for completion:', completionId);
};
