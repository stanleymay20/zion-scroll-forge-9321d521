import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-worker-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const expected = Deno.env.get('WORKER_TRIGGER_SECRET') ?? '';
  if (!expected) return new Response(JSON.stringify({ error: 'Worker secret is not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.headers.get('x-worker-secret') !== expected) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const { data: institutions, error: institutionError } = await supabase
      .from('institutions')
      .select('id,name')
      .eq('is_active', true);
    if (institutionError) throw institutionError;

    for (const institution of institutions ?? []) {
      await processInstitutionAnalytics(supabase, institution.id, dateStr);
    }

    return new Response(JSON.stringify({ success: true, institutions: institutions?.length ?? 0, date: dateStr }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Analytics rollup error:', error);
    return new Response(JSON.stringify({ error: 'Analytics rollup failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processInstitutionAnalytics(supabase: any, institutionId: string, dateStr: string) {
  const { data: learningData, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('course_id,user_id,created_at')
    .eq('institution_id', institutionId)
    .gte('created_at', `${dateStr}T00:00:00Z`)
    .lt('created_at', `${dateStr}T23:59:59.999Z`);
  if (enrollmentError) throw enrollmentError;

  const { data: modulesData, error: moduleError } = await supabase
    .from('student_module_progress')
    .select('module_id,user_id,status,completed_at,course_modules!inner(course_id)')
    .eq('status', 'completed')
    .gte('completed_at', `${dateStr}T00:00:00Z`)
    .lt('completed_at', `${dateStr}T23:59:59.999Z`);
  if (moduleError) throw moduleError;

  const learningByCourse = new Map<string, any>();
  for (const enrollment of learningData ?? []) {
    const key = `${enrollment.course_id}-${enrollment.user_id}`;
    if (!learningByCourse.has(key)) learningByCourse.set(key, {
      course_id: enrollment.course_id,
      user_id: enrollment.user_id,
      enrollments_count: 0,
      completed_modules_count: 0,
    });
    learningByCourse.get(key).enrollments_count++;
  }

  for (const row of modulesData ?? []) {
    const courseId = (row as any).course_modules?.course_id;
    if (!courseId) continue;
    const key = `${courseId}-${row.user_id}`;
    if (!learningByCourse.has(key)) learningByCourse.set(key, {
      course_id: courseId,
      user_id: row.user_id,
      enrollments_count: 0,
      completed_modules_count: 0,
    });
    learningByCourse.get(key).completed_modules_count++;
  }

  for (const stats of learningByCourse.values()) {
    const { error } = await supabase.from('learning_analytics_daily').upsert({
      date: dateStr,
      ...stats,
      quiz_attempts: 0,
      avg_score: null,
    }, { onConflict: 'date,course_id,user_id' });
    if (error) throw error;
  }
}
