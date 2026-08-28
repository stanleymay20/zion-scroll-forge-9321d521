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

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const { data: dueSoon, error: assignmentError } = await supabase
      .from('assignments')
      .select('id,title,course_id,due_at,submissions(user_id)')
      .eq('published', true)
      .lt('due_at', tomorrow.toISOString())
      .gt('due_at', now.toISOString());
    if (assignmentError) throw assignmentError;

    let assignmentNotifications = 0;
    for (const assignment of dueSoon ?? []) {
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments').select('user_id').eq('course_id', assignment.course_id);
      if (enrollmentError) throw enrollmentError;
      const submitted = new Set((assignment as any).submissions?.map((s: any) => s.user_id) ?? []);
      for (const enrollment of (enrollments ?? []).filter((e: any) => !submitted.has(e.user_id))) {
        const { error } = await supabase.rpc('create_notification', {
          p_user_id: enrollment.user_id,
          p_title: 'Assignment Due Soon',
          p_body: `${assignment.title} is due within 24 hours`,
          p_type: 'assignment',
          p_related_id: assignment.id,
          p_related_type: 'assignment',
        });
        if (error) throw error;
        assignmentNotifications++;
      }
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: metrics, error: metricError } = await supabase
      .from('spiritual_metrics')
      .select('id,user_id,prayer_streak,updated_at')
      .gte('prayer_streak', 30)
      .gt('updated_at', fiveMinutesAgo);
    if (metricError) throw metricError;

    let milestoneNotifications = 0;
    for (const metric of metrics ?? []) {
      const { error } = await supabase.rpc('create_notification', {
        p_user_id: metric.user_id,
        p_title: '30-Day Prayer Streak',
        p_body: "You've maintained a 30-day prayer streak. Keep going!",
        p_type: 'achievement',
        p_related_id: metric.id,
        p_related_type: 'spiritual_metric',
      });
      if (error) throw error;
      milestoneNotifications++;
    }

    return new Response(JSON.stringify({
      success: true,
      assignmentNotifications,
      milestoneNotifications,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Notification worker error:', error);
    return new Response(JSON.stringify({ error: 'Notification worker failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
