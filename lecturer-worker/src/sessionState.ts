import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { log } from './logger.js';

let client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (!client) {
    client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export type LecturerStatus = 'joining' | 'live' | 'error' | 'ended';
export type DeliveryMode = 'awaiting-publisher' | 'avatar' | 'audio' | 'text' | 'error';

export interface SessionPatch {
  lecturer_bot_status?: LecturerStatus;
  delivery_mode?: DeliveryMode;
  last_bootstrap_reason?: string | null;
  lecturer_identity?: string;
}

/**
 * Truthfully reflect the worker's real state onto the classroom_sessions row.
 * The frontend subscribes via Supabase Realtime and renders accordingly — so
 * we MUST only call this with states that match observable reality (e.g. set
 * 'live' only after a track has actually been published).
 */
export async function patchSession(sessionId: string, patch: SessionPatch): Promise<void> {
  const { error } = await admin()
    .from('classroom_sessions')
    .update(patch)
    .eq('id', sessionId);
  if (error) {
    log.error('patchSession failed', { sessionId, patch, error: error.message });
  } else {
    log.debug('patchSession', { sessionId, patch });
  }
}
