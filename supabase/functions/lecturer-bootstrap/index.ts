// Lecturer bootstrap — provider-agnostic LiveKit publisher orchestration.
//
// Triggered by classroom-session-control after a session goes 'live'. This
// function does NOT itself stream WebRTC (Deno edge runtimes are not suited
// to long-running RTC publishers). Instead it:
//
//   1. Mints a LiveKit publisher token for identity `lecturer-<faculty-id>`
//      (so a worker can use it without minting its own).
//   2. POSTs the room/token/context to LECTURER_WORKER_URL (e.g. RunPod
//      serverless endpoint hosting the avatar renderer + LiveKit publisher).
//   3. Truthfully records the bootstrap outcome on classroom_sessions:
//        - lecturer_bot_status: 'joining' | 'live' | 'error'
//        - delivery_mode:       'awaiting-publisher' | 'avatar' | 'audio' | 'text'
//        - last_bootstrap_reason
//
// If LECTURER_WORKER_URL is not configured, the function records
// `no_worker_configured` and the UI surfaces this honestly — it never
// fakes a live state.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { AccessToken } from 'npm:livekit-server-sdk@2.9.4';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({ sessionId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Allow either service-role caller (from classroom-session-control) OR
    // an authenticated faculty/admin user invoking directly.
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerToken = authHeader.replace('Bearer ', '');
    const isService = callerToken === serviceKey;

    if (!isService) {
      if (!callerToken) return json({ error: 'Unauthorized' }, 401);
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(callerToken);
      if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
      const userId = claims.claims.sub as string;
      const [{ data: isFaculty }, { data: isAdmin }] = await Promise.all([
        admin.rpc('has_role', { _user_id: userId, _role: 'faculty' }),
        admin.rpc('has_role', { _user_id: userId, _role: 'admin' }),
      ]);
      if (!isFaculty && !isAdmin) return json({ error: 'Forbidden' }, 403);
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const { data: session, error: sErr } = await admin
      .from('classroom_sessions')
      .select('id, room_name, course_id, faculty_id, lecture_title, status')
      .eq('id', parsed.data.sessionId)
      .maybeSingle();
    if (sErr || !session) return json({ error: 'Session not found' }, 404);
    if (session.status !== 'live') {
      return json({ error: `Session status is ${session.status}, not live.` }, 409);
    }

    // Resolve tutor by faculty for the worker prompt context.
    let tutor: { id: string; name: string; specialty: string; avatar_image_url: string | null } | null = null;
    if (session.faculty_id) {
      const { data } = await admin
        .from('ai_tutors')
        .select('id,name,specialty,avatar_image_url')
        .eq('faculty_id', session.faculty_id)
        .limit(1)
        .maybeSingle();
      if (data) tutor = data as any;
    }

    // Resolve module-level tutor_context for the worker prompt.
    // Match by lecture_title first; fall back to the first module of the course with a non-null tutor_context.
    let tutorContext: string | null = null;
    if (session.course_id) {
      let modRow: { tutor_context: string | null } | null = null;
      if (session.lecture_title) {
        const { data } = await admin
          .from('course_modules')
          .select('tutor_context')
          .eq('course_id', session.course_id)
          .ilike('title', session.lecture_title)
          .not('tutor_context', 'is', null)
          .limit(1)
          .maybeSingle();
        modRow = data as any;
      }
      if (!modRow) {
        const { data } = await admin
          .from('course_modules')
          .select('tutor_context')
          .eq('course_id', session.course_id)
          .not('tutor_context', 'is', null)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();
        modRow = data as any;
      }
      tutorContext = modRow?.tutor_context ?? null;
    }

    const lkUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    if (!lkUrl || !apiKey || !apiSecret) {
      await recordOutcome(admin, session.id, {
        lecturer_bot_status: 'error',
        delivery_mode: 'awaiting-publisher',
        last_bootstrap_reason: 'livekit_not_configured',
      });
      return json({ ok: false, reason: 'livekit_not_configured' }, 500);
    }

    const lecturerIdentity = tutor
      ? `lecturer:${tutor.id}`
      : `lecturer:${session.faculty_id ?? 'bot'}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: lecturerIdentity,
      name: tutor?.name ?? 'AI Lecturer',
      ttl: 60 * 60 * 4,
    });
    at.addGrant({
      room: session.room_name,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });
    const publisherToken = await at.toJwt();

    const workerUrl = Deno.env.get('LECTURER_WORKER_URL');
    if (!workerUrl) {
      console.warn('[lecturer-bootstrap] LECTURER_WORKER_URL not configured');
      await recordOutcome(admin, session.id, {
        lecturer_bot_status: 'error',
        delivery_mode: 'awaiting-publisher',
        last_bootstrap_reason: 'no_worker_configured',
        lecturer_identity: lecturerIdentity,
      });
      return json({
        ok: false,
        reason: 'no_worker_configured',
        message:
          'No lecturer media worker (LECTURER_WORKER_URL) is configured. The classroom session is live in LiveKit but no AI lecturer is publishing media yet.',
        lecturerIdentity,
        room: session.room_name,
      }, 200);
    }

    // Mark joining before contacting worker so the UI updates immediately.
    await recordOutcome(admin, session.id, {
      lecturer_bot_status: 'joining',
      delivery_mode: 'awaiting-publisher',
      last_bootstrap_reason: 'worker_dispatched',
      lecturer_identity: lecturerIdentity,
    });

    const workerKey = Deno.env.get('LECTURER_WORKER_KEY') ?? '';
    let workerResult: { ok: boolean; mode?: string; reason?: string; detail?: string } = { ok: false };
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(workerKey ? { Authorization: `Bearer ${workerKey}` } : {}),
        },
        body: JSON.stringify({
          livekitUrl: lkUrl,
          token: publisherToken,
          identity: lecturerIdentity,
          room: session.room_name,
          sessionId: session.id,
          lectureTitle: session.lecture_title,
          tutorContext,
          tutor,
        }),
      });
      workerResult = await res.json().catch(() => ({ ok: res.ok }));
      console.log('[lecturer-bootstrap] worker response', { status: res.status, workerResult });
      if (!res.ok) workerResult.ok = false;
    } catch (e) {
      console.error('[lecturer-bootstrap] worker fetch failed', e);
      workerResult = { ok: false, reason: 'worker_unreachable', detail: (e as Error).message };
    }

    if (workerResult.ok) {
      const mode = workerResult.mode === 'audio' || workerResult.mode === 'text'
        ? workerResult.mode
        : 'avatar';
      await recordOutcome(admin, session.id, {
        lecturer_bot_status: 'joining', // worker reports 'live' once it actually publishes via realtime row update
        delivery_mode: mode as 'avatar' | 'audio' | 'text',
        last_bootstrap_reason: workerResult.reason ?? null,
      });
      return json({ ok: true, mode, lecturerIdentity, room: session.room_name }, 200);
    }

    await recordOutcome(admin, session.id, {
      lecturer_bot_status: 'error',
      delivery_mode: 'awaiting-publisher',
      last_bootstrap_reason: workerResult.reason ?? 'worker_failed',
    });
    return json({ ok: false, reason: workerResult.reason ?? 'worker_failed', detail: workerResult.detail }, 200);
  } catch (err) {
    console.error('[lecturer-bootstrap] unhandled', err);
    return json({ error: 'Internal error' }, 500);
  }
});

async function recordOutcome(
  admin: ReturnType<typeof createClient>,
  sessionId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from('classroom_sessions')
    .update(patch)
    .eq('id', sessionId);
  if (error) console.error('[lecturer-bootstrap] recordOutcome failed', error);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
