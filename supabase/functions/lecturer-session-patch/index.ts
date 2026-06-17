// lecturer-session-patch — allows the external RunPod worker to truthfully
// update classroom_sessions state without needing the Supabase service-role
// key (which is not accessible on Lovable Cloud).
//
// AuthN: shared secret `LECTURER_WORKER_KEY` in the Authorization header,
// matching the same-named secret on the worker pod.
// AuthZ: only whitelisted columns may be patched.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const PatchSchema = z.object({
  sessionId: z.string().uuid(),
  patch: z.object({
    lecturer_bot_status: z.enum(['joining', 'live', 'error', 'ended']).optional(),
    delivery_mode: z.enum(['awaiting-publisher', 'avatar', 'audio', 'text', 'error']).optional(),
    last_bootstrap_reason: z.string().nullable().optional(),
    lecturer_identity: z.string().optional(),
  }),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const expected = Deno.env.get('LECTURER_WORKER_KEY');
    if (!expected) return json({ error: 'worker_key_not_configured' }, 500);
    const got = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (got !== expected) return json({ error: 'Unauthorized' }, 401);

    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await admin
      .from('classroom_sessions')
      .update(parsed.data.patch)
      .eq('id', parsed.data.sessionId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
