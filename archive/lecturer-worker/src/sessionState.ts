import { config } from './config.js';
import { log } from './logger.js';

export type LecturerStatus = 'joining' | 'live' | 'error' | 'ended';
export type DeliveryMode = 'awaiting-publisher' | 'avatar' | 'audio' | 'text' | 'error';

export interface SessionPatch {
  lecturer_bot_status?: LecturerStatus;
  delivery_mode?: DeliveryMode;
  last_bootstrap_reason?: string | null;
  lecturer_identity?: string;
}

/**
 * Truthfully reflect the worker's real state onto the classroom_sessions row,
 * via the `lecturer-session-patch` edge function. We call the edge function
 * (not the DB directly) because on Lovable Cloud the service-role key is not
 * exposed to external infra — the edge function holds it and authorises us
 * via the shared LECTURER_WORKER_KEY secret.
 */
export async function patchSession(sessionId: string, patch: SessionPatch): Promise<void> {
  const url = `${config.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/lecturer-session-patch`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.LECTURER_WORKER_KEY}`,
      },
      body: JSON.stringify({ sessionId, patch }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      log.error('patchSession failed', { sessionId, patch, status: res.status, detail });
    } else {
      log.debug('patchSession', { sessionId, patch });
    }
  } catch (e) {
    log.error('patchSession threw', { sessionId, patch, error: (e as Error).message });
  }
}
