import Fastify from 'fastify';
import { z } from 'zod';

import { config } from './config.js';
import { log } from './logger.js';
import { endActiveSession, shutdownAll, spawnRoomSession } from './room.js';

const PublishBody = z.object({
  livekitUrl: z.string().url(),
  token: z.string().min(20),
  identity: z.string().min(1),
  room: z.string().min(1),
  sessionId: z.string().uuid(),
  lectureTitle: z.string().nullable().optional(),
  tutor: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      specialty: z.string().nullable().optional(),
      voiceId: z.string().nullable().optional(),
      avatar_image_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const StopBody = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().optional(),
});

function requireAuth(headerVal: string | undefined): boolean {
  if (!headerVal) return false;
  const token = headerVal.replace(/^Bearer\s+/i, '').trim();
  return token === config.LECTURER_WORKER_KEY;
}

const app = Fastify({ logger: false, disableRequestLogging: true });

app.get('/health', async () => ({
  ok: true,
  service: 'scrolluniversity-lecturer-worker',
  ttsProvider: config.TTS_PROVIDER,
  ts: new Date().toISOString(),
}));

app.post('/publish-lecturer', async (req, reply) => {
  if (!requireAuth(req.headers.authorization)) {
    return reply.code(401).send({ ok: false, reason: 'unauthorized' });
  }
  const parsed = PublishBody.safeParse(req.body);
  if (!parsed.success) {
    log.warn('publish-lecturer.invalid_body', { issues: parsed.error.flatten() });
    return reply.code(400).send({ ok: false, reason: 'invalid_body', detail: parsed.error.flatten() });
  }
  const body = parsed.data;
  log.info('publish-lecturer.request', {
    sessionId: body.sessionId,
    room: body.room,
    identity: body.identity,
    tutor: body.tutor?.name ?? null,
    title: body.lectureTitle ?? null,
  });
  const result = await spawnRoomSession({
    livekitUrl: body.livekitUrl,
    token: body.token,
    identity: body.identity,
    room: body.room,
    sessionId: body.sessionId,
    lectureTitle: body.lectureTitle ?? null,
    tutor: body.tutor ?? null,
  });
  return reply.code(result.ok ? 200 : 502).send(result);
});

app.post('/stop-lecturer', async (req, reply) => {
  if (!requireAuth(req.headers.authorization)) {
    return reply.code(401).send({ ok: false, reason: 'unauthorized' });
  }
  const parsed = StopBody.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ ok: false, reason: 'invalid_body' });
  }
  await endActiveSession(parsed.data.sessionId, parsed.data.reason ?? 'stop_requested');
  return reply.send({ ok: true });
});

async function main() {
  await app.listen({ host: '0.0.0.0', port: config.PORT });
  log.info('worker.listening', { port: config.PORT, tts: config.TTS_PROVIDER });
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    log.warn('worker.signal', { sig });
    try {
      await app.close();
      await shutdownAll();
    } finally {
      process.exit(0);
    }
  });
}

main().catch((e) => {
  log.error('worker.start_failed', { err: (e as Error).message, stack: (e as Error).stack });
  process.exit(1);
});
