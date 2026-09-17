import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all module progress grouped by faculty
    const { data: progress } = await supabase
      .from('student_module_progress')
      .select('mastery_level, course_modules(title, courses(faculty, title))')
      .eq('user_id', userId);

    // Aggregate by faculty
    const facultyStats: any = {};
    progress?.forEach((p: any) => {
      const faculty = p.course_modules?.courses?.faculty || 'Unknown';
      if (!facultyStats[faculty]) {
        facultyStats[faculty] = { total: 0, count: 0, modules: [] };
      }
      facultyStats[faculty].total += p.mastery_level;
      facultyStats[faculty].count += 1;
      facultyStats[faculty].modules.push({
        title: p.course_modules?.title,
        mastery: p.mastery_level
      });
    });

    // Calculate averages and sort
    const skillsData = Object.entries(facultyStats).map(([faculty, stats]: [string, any]) => ({
      faculty,
      avgMastery: Math.round(stats.total / stats.count),
      modulesCompleted: stats.count,
      topModules: stats.modules.sort((a: any, b: any) => b.mastery - a.mastery).slice(0, 3)
    })).sort((a, b) => b.avgMastery - a.avgMastery);

    const strengths = skillsData.slice(0, 3);
    const weaknesses = skillsData.slice(-3).reverse();

    return new Response(
      JSON.stringify({ 
        strengths,
        weaknesses,
        overall: {
          totalModules: progress?.length || 0,
          avgMastery: Math.round(progress?.reduce((sum: number, p: any) => sum + p.mastery_level, 0) / (progress?.length || 1))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
