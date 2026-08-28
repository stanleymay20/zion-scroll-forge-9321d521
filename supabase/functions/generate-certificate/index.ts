import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CHANCELLOR_SIGNATURE_DATA_URI } from './signature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function certificateHtml(args: {
  studentName: string;
  courseTitle: string;
  faculty: string;
  completionDate: string;
  outcomes: Array<{ code: string | null; statement: string }>;
}) {
  const date = new Date(args.completionDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const outcomes = args.outcomes.slice(0, 8).map((o) =>
    `<li>${o.code ? `<strong>${esc(o.code)}</strong> — ` : ''}${esc(o.statement)}</li>`
  ).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Course Certificate — Scroll University</title>
  <style>
    @page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;background:#172554;width:297mm;height:210mm;display:flex;align-items:center;justify-content:center}.c{width:280mm;min-height:190mm;background:white;border:12px solid #1e3a8a;padding:28px 42px;text-align:center}.uni{font-size:28px;font-weight:700;color:#1e3a8a;letter-spacing:2px}.sub{color:#64748b;margin-top:4px}.title{font-size:38px;color:#1e3a8a;margin:22px 0}.name{font-size:38px;font-weight:700;border-bottom:2px solid #1e3a8a;display:inline-block;padding:0 30px 7px}.course{font-size:25px;font-weight:700;color:#1e3a8a;margin-top:14px}.faculty{color:#475569;margin-top:6px}.evidence{text-align:left;margin:22px auto 0;max-width:850px;background:#f8fafc;border-left:4px solid #1e3a8a;padding:12px 18px}.evidence h3{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#1e3a8a;margin:0 0 8px}.evidence ul{font-size:12px;color:#334155;line-height:1.5;margin:0;padding-left:20px}.footer{display:flex;justify-content:space-between;align-items:end;margin-top:28px;border-top:1px solid #cbd5e1;padding-top:16px}.sig{text-align:center;width:240px;font-size:12px;color:#64748b}.sig img{height:44px;object-fit:contain}.line{border-top:1px solid #334155;margin-top:5px;padding-top:5px}.date{font-size:13px;color:#475569}.cross{margin-top:12px;color:#1e3a8a}
  </style></head><body><main class="c"><div class="uni">SCROLL UNIVERSITY</div><div class="sub">Verified Academic Evidence</div><div class="title">Certificate of Completion</div><div>This certifies that</div><div class="name">${esc(args.studentName)}</div><div>has satisfied the verified completion requirements for</div><div class="course">${esc(args.courseTitle)}</div>${args.faculty ? `<div class="faculty">${esc(args.faculty)}</div>` : ''}<div class="date">Completed ${esc(date)}</div>${outcomes ? `<section class="evidence"><h3>Demonstrated learning outcomes</h3><ul>${outcomes}</ul></section>` : ''}<div class="footer"><div class="sig"><div class="line">Office of the Registrar</div></div><div class="sig"><img src="${CHANCELLOR_SIGNATURE_DATA_URI}" alt="Chancellor signature"><div class="line">Founder & Chancellor</div></div></div><div class="cross">✝️ Jesus Christ is Lord</div></main></body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request' }, 400);

    const type = body.type ?? 'course';
    const targetUserId = body.userId ?? user.id;
    if (typeof targetUserId !== 'string') return json({ error: 'Invalid userId' }, 400);

    if (targetUserId !== user.id) {
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const allowed = new Set(['admin', 'superadmin', 'registrar']);
      if (!(roles ?? []).some((r: any) => allowed.has(r.role))) return json({ error: 'Forbidden' }, 403);
    }

    if (type === 'graduation') {
      return json({
        error: 'Degree credential issuance is not enabled until the canonical programme audit is authoritative.',
        code: 'degree_credential_authority_not_ready',
      }, 409);
    }
    if (type !== 'course') return json({ error: 'Unsupported certificate type' }, 400);

    const courseId = body.courseId;
    if (typeof courseId !== 'string' || !courseId) return json({ error: 'courseId is required' }, 400);

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (!enrollment) return json({ error: 'No course enrollment found' }, 403);

    const { data: modules, error: moduleError } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId);
    if (moduleError) throw moduleError;
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    if (moduleIds.length === 0) return json({ error: 'Course has no authored modules' }, 409);

    const { data: progressRows, error: progressError } = await supabase
      .from('student_module_progress')
      .select('module_id,status,mastery_level,completed_at')
      .eq('user_id', targetUserId)
      .in('module_id', moduleIds);
    if (progressError) throw progressError;

    const verified = new Set((progressRows ?? [])
      .filter((p: any) => p.status === 'completed' && Number(p.mastery_level ?? 0) >= 70)
      .map((p: any) => p.module_id));
    if (verified.size !== moduleIds.length) {
      return json({
        error: 'Verified course completion has not been established',
        verified_modules: verified.size,
        total_modules: moduleIds.length,
      }, 409);
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title,faculty')
      .eq('id', courseId)
      .single();
    if (courseError || !course) return json({ error: 'Course not found' }, 404);

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', targetUserId).maybeSingle();
    let fallbackEmail = '';
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      fallbackEmail = authUser?.user?.email ?? '';
    } catch (_) { /* display fallback only */ }
    const studentName = profile?.full_name || fallbackEmail.split('@')[0] || 'Scholar';

    const { data: masteryRows } = await supabase
      .from('student_outcome_mastery')
      .select('learning_objective_id,score_pct,course_learning_outcomes(code,statement)')
      .eq('user_id', targetUserId)
      .eq('course_id', courseId)
      .gte('score_pct', 70);

    const seen = new Set<string>();
    const outcomes: Array<{ code: string | null; statement: string }> = [];
    for (const row of (masteryRows ?? []) as any[]) {
      if (!row.learning_objective_id || seen.has(row.learning_objective_id)) continue;
      seen.add(row.learning_objective_id);
      if (row.course_learning_outcomes?.statement) outcomes.push({
        code: row.course_learning_outcomes.code ?? null,
        statement: row.course_learning_outcomes.statement,
      });
    }

    const completionDate = (progressRows ?? [])
      .map((p: any) => p.completed_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? new Date().toISOString();

    const { data: certificate, error: certError } = await supabase
      .from('course_certificates')
      .upsert({
        user_id: targetUserId,
        course_id: courseId,
        certificate_url: `scrolluniversity://cert/${courseId}/${targetUserId}`,
        scroll_badge_earned: false,
        completion_date: completionDate,
      }, { onConflict: 'user_id,course_id' })
      .select()
      .single();
    if (certError) throw certError;

    return json({
      success: true,
      certificate,
      studentName,
      authority: 'verified_module_mastery',
      policy_version: 'course-certificate.v2',
      html: certificateHtml({
        studentName,
        courseTitle: course.title,
        faculty: course.faculty ?? '',
        completionDate,
        outcomes,
      }),
    });
  } catch (error) {
    console.error('generate-certificate error', error);
    return json({ error: 'Certificate generation failed' }, 500);
  }
});
