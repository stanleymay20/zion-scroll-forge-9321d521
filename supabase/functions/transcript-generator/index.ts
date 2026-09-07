import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("Transcript Generator function started");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { institutionId } = await req.json();

    // Get student profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Get all completed courses
    const { data: enrollments, error: enrollError } = await supabaseClient
      .from('enrollments')
      .select(`
        *,
        courses(
          title,
          faculty,
          level
        )
      `)
      .eq('user_id', user.id)
      .eq('institution_id', institutionId)
      .eq('progress', 100);

    if (enrollError) throw enrollError;

    // Get transcripts
    const { data: transcripts, error: transcriptError } = await supabaseClient
      .from('transcripts')
      .select('*')
      .eq('student_id', user.id);

    if (transcriptError) throw transcriptError;

    // Calculate GPA
    const grades = transcripts?.filter(t => t.score !== null) || [];
    const totalPoints = grades.reduce((sum, t) => sum + (t.score || 0), 0);
    const gpa = grades.length > 0 ? (totalPoints / grades.length / 20).toFixed(2) : '0.00';

    const transcript = {
      studentName: profile.email,
      studentId: user.id,
      institutionId,
      generatedAt: new Date().toISOString(),
      gpa,
      totalCredits: enrollments?.length * 3 || 0,
      courses: enrollments?.map(e => ({
        title: e.courses?.title,
        faculty: e.courses?.faculty,
        level: e.courses?.level,
        grade: 'A', // Placeholder
        credits: 3,
        completed: e.updated_at,
      })) || [],
    };

    console.log('Transcript generated successfully');

    return new Response(
      JSON.stringify({ success: true, transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating transcript:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
