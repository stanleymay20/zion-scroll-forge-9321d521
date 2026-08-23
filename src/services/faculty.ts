import { supabase } from '@/integrations/supabase/client';
import { underChrist } from '@/lib/lordship';

const SAFE_QUIZ_COLUMNS = [
  'id',
  'assignment_id',
  'kind',
  'prompt',
  'options',
  'points',
  'order_index',
  'module_id',
  'course_id',
  'learning_objective_id',
  'bloom_level',
  'difficulty_rating',
].join(',');

export const listTeachingCourses = underChrist(async () => {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('teaching_assignments')
    .select('course_id, courses(*)')
    .eq('faculty_user_id', user.user?.id);
  
  if (error) throw error;
  return data;
});

export const getGradingQueue = underChrist(async (courseId?: string) => {
  let query = supabase.from('v_grading_queue').select('*');
  if (courseId) query = query.eq('course_id', courseId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
});

export const createAssignment = underChrist(async (payload: any) => {
  const { data, error } = await supabase
    .from('assignments')
    .insert(payload)
    .select()
    .single();
  
  if (error) throw error;
  return data;
});

export const addQuizQuestion = underChrist(async (payload: any) => {
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert(payload)
    .select(SAFE_QUIZ_COLUMNS)
    .single();
  
  if (error) throw error;
  return data;
});

export const publishAssignment = underChrist(async (assignmentId: string, published: boolean) => {
  const { error } = await supabase
    .from('assignments')
    .update({ published })
    .eq('id', assignmentId);
  
  if (error) throw error;
  return { success: true };
});

export const submitQuiz = underChrist(async ({ 
  assignmentId, 
  answers 
}: { 
  assignmentId: string; 
  answers: any 
}) => {
  const { data: user } = await supabase.auth.getUser();
  
  const { data: sub, error } = await supabase
    .from('submissions')
    .insert({
      assignment_id: assignmentId,
      user_id: user.user!.id,
      answers
    })
    .select()
    .single();
  
  if (error) throw error;

  // Legacy assignment quiz path. The grading boundary validates ownership server-side.
  await supabase.functions.invoke('grade-quiz', { 
    body: { submissionId: sub.id } 
  });

  return sub;
});

export const getAssignments = underChrist(async (courseId: string) => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`*, quiz_questions(${SAFE_QUIZ_COLUMNS})`)
    .eq('course_id', courseId)
    .eq('published', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
});

export const getLearningMaterials = underChrist(async (moduleId: string) => {
  const { data, error } = await supabase
    .from('learning_materials')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at');
  
  if (error) throw error;
  return data;
});

export const addLearningMaterial = underChrist(async (payload: any) => {
  const { data, error } = await supabase
    .from('learning_materials')
    .insert(payload)
    .select()
    .single();
  
  if (error) throw error;
  return data;
});

export const getGradebook = underChrist(async (courseId: string) => {
  const { data, error } = await supabase
    .from('v_course_gradebook')
    .select('*')
    .eq('course_id', courseId);
  
  if (error) throw error;
  return data;
});

export const gradeSubmission = underChrist(async (submissionId: string, score: number, feedback: string) => {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('grades')
    .insert({
      submission_id: submissionId,
      grader_user_id: user.user!.id,
      score,
      feedback
    })
    .select()
    .single();
  
  if (error) throw error;

  await supabase
    .from('submissions')
    .update({ status: 'graded' })
    .eq('id', submissionId);

  return data;
});
