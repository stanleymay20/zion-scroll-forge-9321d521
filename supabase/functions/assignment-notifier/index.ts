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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: assignments, error } = await supabaseClient
      .from('assignments')
      .select('id,title,due_at,course_id,courses(title,enrollments(user_id))')
      .gte('due_at', new Date().toISOString())
      .lte('due_at', tomorrow.toISOString())
      .eq('published', true);
    if (error) throw error;

    let notificationsSent = 0;
    for (const assignment of assignments ?? []) {
      const enrollments = (assignment as any).courses?.enrollments ?? [];
      for (const enrollment of enrollments) {
        const { error: notifyError } = await supabaseClient.rpc('create_notification', {
          p_user_id: enrollment.user_id,
          p_title: 'Assignment Due Soon',
          p_body: `${assignment.title} is due within 24 hours`,
          p_type: 'assignment',
          p_related_id: assignment.id,
          p_related_type: 'assignment'
        });
        if (notifyError) throw notifyError;
        notificationsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, notificationsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Assignment notifier error:', error);
    return new Response(JSON.stringify({ error: 'Assignment notifier failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
