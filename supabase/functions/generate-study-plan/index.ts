import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logAiOutput } from "../_shared/ai-log.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.info('✝️ Study Plan Generation — Christ is Lord over planning');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('authorization')!;
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');

    const { 
      courseId, 
      targetCompletionDate, 
      weeklyHours,
      preferredDays = ['Monday', 'Wednesday', 'Friday']
    } = await req.json();

    // Get course modules
    const { data: modules } = await supabase
      .from('course_modules')
      .select('id, title, duration_minutes, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (!modules || modules.length === 0) {
      throw new Error('No modules found for this course');
    }

    // Calculate total study time needed
    const totalMinutes = modules.reduce((sum: number, m: any) => sum + (m.duration_minutes || 60), 0);
    const totalHours = totalMinutes / 60;

    // Calculate weeks needed
    const weeksNeeded = Math.ceil(totalHours / weeklyHours);
    
    // Distribute modules across weeks
    const hoursPerDay = weeklyHours / preferredDays.length;
    const minutesPerDay = hoursPerDay * 60;

    const dailySchedule: any = {};
    preferredDays.forEach(day => {
      dailySchedule[day] = {
        startTime: '09:00',
        endTime: `${9 + Math.floor(hoursPerDay)}:${(hoursPerDay % 1 * 60).toFixed(0).padStart(2, '0')}`,
        modules: []
      };
    });

    // Assign modules to days
    let currentDayIndex = 0;
    let currentDayMinutes = 0;

    modules.forEach((module: any) => {
      const moduleDuration = module.duration_minutes || 60;
      
      if (currentDayMinutes + moduleDuration <= minutesPerDay) {
        const day = preferredDays[currentDayIndex];
        dailySchedule[day].modules.push({
          moduleId: module.id,
          title: module.title,
          duration: moduleDuration
        });
        currentDayMinutes += moduleDuration;
      } else {
        // Move to next day
        currentDayIndex = (currentDayIndex + 1) % preferredDays.length;
        const day = preferredDays[currentDayIndex];
        dailySchedule[day].modules.push({
          moduleId: module.id,
          title: module.title,
          duration: moduleDuration
        });
        currentDayMinutes = moduleDuration;
      }
    });

    // Create milestones
    const milestones = modules
      .filter((_: any, idx: number) => idx % Math.ceil(modules.length / 4) === 0)
      .map((m: any, idx: number) => ({
        week: (idx + 1) * Math.ceil(weeksNeeded / 4),
        description: `Complete ${m.title}`,
        moduleId: m.id
      }));

    // Save study plan
    const { data: studyPlan, error } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        course_id: courseId,
        target_completion_date: targetCompletionDate,
        weekly_hours: weeklyHours,
        daily_schedule: dailySchedule,
        milestones: milestones
      })
      .select()
      .single();

    if (error) throw error;

    await logAiOutput({
      user_id: user.id, feature: "study_plan", provider: "deterministic",
      latency_ms: 0, status: "ok",
      output_reference: studyPlan?.id ?? null,
      metadata: { course_id: courseId, weeks: weeksNeeded, modules: modules.length },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        studyPlan,
        summary: {
          totalWeeks: weeksNeeded,
          totalHours,
          modulesCount: modules.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Study plan generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
