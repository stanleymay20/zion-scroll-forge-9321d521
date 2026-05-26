// LiveKit access token minting for AI Live Classrooms.
// JWT-verified. Validates room access via classroom_sessions + enrollments.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { AccessToken } from 'npm:livekit-server-sdk@2.9.4';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  roomName: z.string().min(3).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  role: z.enum(['student', 'faculty', 'observer']).default('student'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { roomName, role } = parsed.data;

    // Service-role client for authoritative access checks
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: session, error: sessionErr } = await admin
      .from('classroom_sessions')
      .select('id, room_name, course_id, status, lecture_title')
      .eq('room_name', roomName)
      .maybeSingle();

    if (sessionErr) {
      console.error('[livekit-token] session lookup failed', sessionErr);
      return json({ error: 'Session lookup failed' }, 500);
    }
    if (!session) {
      return json({ error: 'Room not found' }, 404);
    }
    if (session.status === 'ended' || session.status === 'cancelled') {
      return json({ error: 'Room is not active' }, 409);
    }

    // Authorization: faculty/admin OR enrolled student
    const [{ data: facultyRole }, { data: adminRole }] = await Promise.all([
      admin.rpc('has_role', { _user_id: userId, _role: 'faculty' }),
      admin.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    ]);
    const isStaff = Boolean(facultyRole) || Boolean(adminRole);

    let allowed = isStaff;
    if (!allowed && session.course_id) {
      const { data: enrollment } = await admin
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', session.course_id)
        .maybeSingle();
      allowed = Boolean(enrollment);
    }
    if (!allowed) {
      return json({ error: 'Not enrolled in this course' }, 403);
    }

    if (role === 'faculty' && !isStaff) {
      return json({ error: 'Faculty role requires staff privileges' }, 403);
    }

    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    if (!livekitUrl || !apiKey || !apiSecret) {
      console.error('[livekit-token] missing LiveKit env');
      return json({ error: 'LiveKit not configured' }, 500);
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${role}:${userId}`,
      name: claimsData.claims.email ?? userId,
      ttl: 60 * 60, // 1h
    });

    const canPublish = role === 'faculty';
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canPublishData: true,
      canSubscribe: true,
    });

    const accessToken = await at.toJwt();

    return json({
      token: accessToken,
      url: livekitUrl,
      room: roomName,
      identity: `${role}:${userId}`,
      session: {
        id: session.id,
        lectureTitle: session.lecture_title,
        status: session.status,
      },
    }, 200);
  } catch (err) {
    console.error('[livekit-token] unhandled error', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
