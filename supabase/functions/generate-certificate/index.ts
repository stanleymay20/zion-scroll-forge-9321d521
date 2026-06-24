import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CHANCELLOR_SIGNATURE_DATA_URI } from "./signature.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEGREE_LABELS: Record<string, string> = {
  ScrollCertificate: 'Scroll Certificate',
  ScrollDiploma: 'Scroll Diploma',
  ScrollBachelor: 'Scroll Bachelor\'s Degree',
  ScrollMaster: 'Scroll Master\'s Degree',
  ScrollDoctorate: 'Scroll Doctorate',
  ScrollExousia: 'Scroll Exousia Fellowship',
};

function generateCertificateHTML(
  studentName: string,
  title: string,
  faculty: string,
  completionDate: string,
  scrollBadge: boolean,
  type: 'course' | 'graduation' = 'course',
  degreeLevel?: string,
  outcomes: Array<{ code: string | null; statement: string }> = []
): string {
  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isGraduation = type === 'graduation';
  const headingText = isGraduation
    ? (DEGREE_LABELS[degreeLevel || ''] || degreeLevel || 'Degree')
    : 'Certificate of Completion';
  const awardedText = isGraduation
    ? 'has been conferred the'
    : 'for successfully completing the comprehensive course';
  const accentColor = isGraduation ? '#7c3aed' : '#2563eb';
  const gradientFrom = isGraduation ? '#7c3aed' : '#667eea';
  const gradientTo = isGraduation ? '#c084fc' : '#764ba2';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${headingText} — ScrollUniversity</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%);
      width: 297mm; height: 210mm;
      display: flex; justify-content: center; align-items: center;
    }
    .certificate {
      background: white; width: 280mm; height: 195mm; padding: 40px;
      border: 20px solid ${accentColor};
      border-image: linear-gradient(45deg, ${accentColor}, ${gradientTo}) 1;
      box-shadow: 0 20px 60px rgba(0,0,0,.3); position: relative;
    }
    .ornament { position: absolute; font-size: 60px; color: ${accentColor}; opacity: .1; }
    .ornament.tl { top: 20px; left: 20px; }
    .ornament.tr { top: 20px; right: 20px; }
    .ornament.bl { bottom: 20px; left: 20px; }
    .ornament.br { bottom: 20px; right: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: ${accentColor}; }
    .subtitle { font-size: 14px; color: #666; font-style: italic; }
    .title {
      text-align: center; font-size: ${isGraduation ? '36px' : '48px'};
      color: ${accentColor}; margin: 30px 0 15px; font-weight: normal;
      letter-spacing: 4px; text-transform: uppercase;
    }
    .content { text-align: center; margin: 30px 0; }
    .awarded-to { font-size: 18px; color: #666; margin-bottom: 10px; }
    .student-name {
      font-size: 42px; color: #1a1a1a; font-weight: bold;
      margin: 15px 0; border-bottom: 2px solid ${accentColor};
      padding-bottom: 10px; display: inline-block;
    }
    .completion-text { font-size: 16px; color: #666; margin: 20px 0 10px; line-height: 1.8; }
    .course-title { font-size: 28px; color: ${accentColor}; font-weight: bold; margin: 10px 0; }
    .faculty { font-size: 18px; color: #7c3aed; font-style: italic; margin-bottom: 20px; }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      color: #1a1a1a; padding: 10px 30px; border-radius: 50px;
      font-size: 16px; font-weight: bold; margin: 15px 0;
      box-shadow: 0 4px 15px rgba(255,215,0,.3);
    }
    .footer {
      display: flex; justify-content: space-between;
      margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb;
    }
    .signature-block { text-align: center; }
    .signature-line { width: 200px; border-top: 2px solid ${accentColor}; margin: 30px auto 10px; }
    .signature-title { font-size: 12px; color: #666; }
    .date { text-align: center; margin-top: 25px; font-size: 14px; color: #666; }
    .cross { text-align: center; font-size: 18px; color: ${accentColor}; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="ornament tl">✦</div>
    <div class="ornament tr">✦</div>
    <div class="ornament bl">✦</div>
    <div class="ornament br">✦</div>
    <div class="header">
      <div class="logo">SCROLL UNIVERSITY</div>
      <div class="subtitle">Excellence in Kingdom Education</div>
    </div>
    <div class="title">${headingText}</div>
    <div class="content">
      <div class="awarded-to">This is proudly awarded to</div>
      <div class="student-name">${studentName}</div>
      <div class="completion-text">${awardedText}</div>
      <div class="course-title">${title}</div>
      ${faculty ? `<div class="faculty">${faculty}</div>` : ''}
      ${scrollBadge ? '<div class="badge">🏆 ScrollBadge Earned</div>' : ''}
      <div class="date">Conferred on ${formattedDate}</div>
      ${outcomes.length > 0 ? `
      <div style="margin-top:24px;padding:16px 24px;background:#faf7ff;border-left:4px solid ${accentColor};text-align:left;border-radius:4px;">
        <div style="font-size:13px;font-weight:bold;color:${accentColor};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Demonstrated Learning Outcomes</div>
        <ul style="list-style:none;padding:0;margin:0;font-size:12px;color:#374151;line-height:1.6;">
          ${outcomes.slice(0, 8).map(o => `<li style="margin:4px 0;">✓ ${o.code ? `<span style="font-family:monospace;color:#6b7280;margin-right:6px;">${o.code}</span>` : ''}${o.statement}</li>`).join('')}
          ${outcomes.length > 8 ? `<li style="margin-top:6px;color:#6b7280;font-style:italic;">…and ${outcomes.length - 8} more outcome(s)</li>` : ''}
        </ul>
      </div>` : ''}
    </div>
    <div class="footer">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-title">Office of the Registrar</div>
      </div>
      <div class="signature-block">
        <img src="${CHANCELLOR_SIGNATURE_DATA_URI}" alt="Founder & Chancellor signature" style="height:48px;display:block;margin:0 auto -8px;object-fit:contain;" />
        <div class="signature-line"></div>
        <div class="signature-title">Founder &amp; Chancellor</div>
      </div>
    </div>
    <div class="cross">✝️ Jesus Christ is Lord</div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { courseId, userId, degreeLevel, type = 'course' } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✝️ Generating certificate:', { userId, courseId, degreeLevel, type });

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    const studentName = profile?.full_name || profile?.email?.split('@')[0] || 'Scholar';

    if (type === 'graduation' && degreeLevel) {
      // ===== DEGREE-LEVEL CERTIFICATE =====
      const label = DEGREE_LABELS[degreeLevel] || degreeLevel;
      const completionDate = new Date().toISOString();

      const html = generateCertificateHTML(
        studentName, label, '', completionDate, true, 'graduation', degreeLevel
      );

      // Record graduation
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (student) {
        await supabase.from('graduations').upsert({
          student_id: student.id,
          ceremony_date: completionDate.split('T')[0],
          certificate_url: `scrolluniversity://degree/${degreeLevel}/${userId}`,
          honors: degreeLevel,
        }, { onConflict: 'student_id' });
      }

      return new Response(
        JSON.stringify({ success: true, html, degreeLevel, studentName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== COURSE-LEVEL CERTIFICATE =====
    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'courseId is required for course certificates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: course } = await supabase
      .from('courses')
      .select('title, faculty')
      .eq('id', courseId)
      .single();

    if (!course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const completionDate = new Date().toISOString();
    const html = generateCertificateHTML(
      studentName, course.title, course.faculty || '', completionDate, true, 'course'
    );

    // Save certificate record
    const { data: certificate, error: certError } = await supabase
      .from('course_certificates')
      .upsert({
        user_id: userId,
        course_id: courseId,
        certificate_url: `scrolluniversity://cert/${courseId}/${userId}`,
        scroll_badge_earned: true,
        completion_date: completionDate,
      }, { onConflict: 'user_id,course_id' })
      .select()
      .single();

    if (certError) throw certError;

    return new Response(
      JSON.stringify({ success: true, certificate, html, studentName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating certificate:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
