// Faculty/admin-controlled classroom session lifecycle.
// Start/end a live classroom session for a course. JWT-verified in code.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  action: z.enum(['start', 'end']),
  courseId: z.string().uuid(),
  lectureTitle: z.string().min(1).max(200).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, courseId, lectureTitle } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    // Role check: faculty OR admin only.
    const [{ data: isFaculty }, { data: isAdmin }] = await Promise.all([
      admin.rpc('has_role', { _user_id: userId, _role: 'faculty' }),
      admin.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    ]);
    if (!isFaculty && !isAdmin) {
      console.warn('[classroom-session-control] forbidden', { userId, action, courseId });
      return json({ error: 'Only faculty/admin can control live classroom sessions.' }, 403);
    }

    const { data: course, error: courseErr } = await admin
      .from('courses')
      .select('id, title, faculty_id')
      .eq('id', courseId)
      .maybeSingle();
    if (courseErr || !course) {
      return json({ error: `Course ${courseId} not found.` }, 404);
    }

    const roomName = `course-${courseId}`;

    if (action === 'start') {
      // Idempotent: reuse existing live session for this room.
      const { data: existing } = await admin
        .from('classroom_sessions')
        .select('id, room_name, status, lecturer_bot_status, delivery_mode')
        .eq('room_name', roomName)
        .maybeSingle();

      let sessionRow;
      if (existing && existing.status === 'live') {
        console.log('[classroom-session-control] reusing live session', existing.id);
        sessionRow = existing;
      } else if (existing) {
        const { data: updated, error: upErr } = await admin
          .from('classroom_sessions')
          .update({
            status: 'live',
            started_at: new Date().toISOString(),
            ended_at: null,
            delivery_mode: 'awaiting-publisher',
            lecturer_bot_status: 'idle',
            lecture_title: lectureTitle ?? course.title,
            faculty_id: course.faculty_id ?? null,
            created_by: userId,
            last_bootstrap_reason: null,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (upErr) return json({ error: `Failed to reopen session: ${upErr.message}` }, 500);
        sessionRow = updated;
      } else {
        const { data: inserted, error: insErr } = await admin
          .from('classroom_sessions')
          .insert({
            room_name: roomName,
            course_id: courseId,
            faculty_id: course.faculty_id ?? null,
            lecture_title: lectureTitle ?? course.title,
            status: 'live',
            lecturer_bot_status: 'idle',
            delivery_mode: 'awaiting-publisher',
            started_at: new Date().toISOString(),
            created_by: userId,
          })
          .select()
          .single();
        if (insErr) return json({ error: `Failed to create session: ${insErr.message}` }, 500);
        sessionRow = inserted;
      }

      console.log('[classroom-session-control] started', { id: sessionRow.id, roomName, userId });

      // Fire-and-await lecturer bootstrap (non-blocking semantics — we return
      // even if the publisher worker is unavailable, so the UI updates).
      try {
        const bootstrapRes = await fetch(
          `${supabaseUrl}/functions/v1/lecturer-bootstrap`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId: sessionRow.id }),
          },
        );
        const bootstrapJson = await bootstrapRes.json().catch(() => ({}));
        console.log('[classroom-session-control] bootstrap result', bootstrapJson);
      } catch (e) {
        console.error('[classroom-session-control] bootstrap failed', e);
      }

      return json({ ok: true, session: sessionRow }, 200);
    }

    // action === 'end'
    const { data: ended, error: endErr } = await admin
      .from('classroom_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        lecturer_bot_status: 'ended',
        delivery_mode: 'offline',
      })
      .eq('room_name', roomName)
      .select()
      .maybeSingle();
    if (endErr) return json({ error: `Failed to end session: ${endErr.message}` }, 500);
    if (!ended) return json({ error: `No session found for room ${roomName}.` }, 404);
    console.log('[classroom-session-control] ended', { id: ended.id, roomName, userId });
    return json({ ok: true, session: ended }, 200);
  } catch (err) {
    console.error('[classroom-session-control] unhandled', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
