import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  student_user_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(), // backwards-compatible: historically this was the auth user id
  degree_program_id: z.string().uuid().optional(),
}).refine((v) => !!(v.student_user_id || v.student_id), {
  message: 'student_user_id is required',
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return response({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return response({ error: 'Unauthorized' }, 401);

    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return response({ error: 'Invalid request', details: parsed.error.flatten() }, 400);

    const targetUserId = parsed.data.student_user_id ?? parsed.data.student_id!;

    if (targetUserId !== user.id) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const allowed = new Set(['admin', 'superadmin', 'registrar', 'faculty']);
      if (!(roles ?? []).some((r: any) => allowed.has(r.role))) {
        return response({ error: 'Forbidden' }, 403);
      }
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,user_id,degree_program_id,current_year,current_term,student_id_code,degree_program:degree_programs!students_degree_program_id_fkey(id,title,level)')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (studentError) throw studentError;

    // Launch truth floor: the repository does not yet contain a canonical, generic
    // programme-requirements graph capable of proving credits, substitutions,
    // placements, capstone/dissertation, holds, and competency thresholds for every
    // programme. Never manufacture a Bachelor of Theology audit or infer eligibility.
    return response({
      student_user_id: targetUserId,
      student_record: student ?? null,
      degree_program: (student as any)?.degree_program ?? null,
      requested_degree_program_id: parsed.data.degree_program_id ?? null,
      authority_status: 'requirements_not_authoritatively_configured',
      is_eligible_for_graduation: false,
      credential_issuance_allowed: false,
      requirements: null,
      total_credits_required: null,
      total_credits_earned: null,
      gpa: null,
      percent_complete: null,
      policy_version: 'degree-audit.truth-floor.v1',
      message: 'Official degree eligibility is withheld until the programme requirement graph and registrar-controlled audit are authoritative.',
    });
  } catch (error) {
    console.error('degree-audit error', error);
    return response({ error: 'Degree audit unavailable' }, 500);
  }
});
