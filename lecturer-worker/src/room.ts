import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  Room,
  RoomEvent,
  TrackPublishOptions,
  TrackSource,
  dispose,
} from '@livekit/rtc-node';

import { config } from './config.js';
import { log, type Logger } from './logger.js';
import { draftLectureTurn } from './pedagogy.js';
import { patchSession } from './sessionState.js';
import { buildTtsProvider } from './tts/providers.js';
import type { PcmChunk, TTSProvider } from './tts/types.js';

export interface RoomSessionParams {
  livekitUrl: string;
  token: string;
  identity: string;
  room: string;
  sessionId: string;
  lectureTitle?: string | null;
  tutor: { id?: string; name?: string; specialty?: string | null; voiceId?: string | null } | null;
}

/**
 * Active sessions registry — one lecturer per (sessionId, room).
 * Keeps the worker honest under repeated dispatch from lecturer-bootstrap.
 */
const ACTIVE: Map<string, RoomSession> = new Map();

export function getActiveSession(sessionId: string): RoomSession | undefined {
  return ACTIVE.get(sessionId);
}

export async function endActiveSession(sessionId: string, reason: string): Promise<void> {
  const s = ACTIVE.get(sessionId);
  if (s) await s.stop(reason);
}

class RoomSession {
  private room: Room | null = null;
  private source: AudioSource | null = null;
  private track: LocalAudioTrack | null = null;
  private tts: TTSProvider;
  private stopped = false;
  private mediaPublished = false;
  private hardStopAt: number;
  private logger: Logger;
  private lastUtterance: string | undefined;

  constructor(private readonly params: RoomSessionParams) {
    this.tts = buildTtsProvider();
    this.hardStopAt = Date.now() + config.MAX_SESSION_SECONDS * 1000;
    this.logger = log.child({
      sessionId: params.sessionId,
      room: params.room,
      identity: params.identity,
      tutor: params.tutor?.name ?? null,
    });
  }

  async start(): Promise<{ mode: 'audio' | 'text'; reason?: string }> {
    const t0 = Date.now();
    this.logger.info('room.connecting', { url: this.params.livekitUrl });

    const room = new Room();
    this.room = room;

    room
      .on(RoomEvent.Disconnected, (reason) => {
        this.logger.warn('room.disconnected', { reason: String(reason) });
        void this.handleDisconnect(`livekit:${reason}`);
      })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        this.logger.info('room.localTrackPublished', { sid: pub.sid, kind: pub.kind });
      });

    await room.connect(this.params.livekitUrl, this.params.token, {
      autoSubscribe: false,
      dynacast: true,
    });
    this.logger.info('room.connected', { ms: Date.now() - t0 });

    // Provider-truthful mode: if TTS is text-only, we do not publish an
    // audio track. We mark the session text mode so the UI tells the truth.
    if (this.tts.name === 'text') {
      await patchSession(this.params.sessionId, {
        lecturer_bot_status: 'live',
        delivery_mode: 'text',
        last_bootstrap_reason: 'tts_text_only_mode',
        lecturer_identity: this.params.identity,
      });
      // Keep the lecturer participant in the room so students see presence,
      // but stream lecture text via data channel.
      void this.runTextLoop();
      return { mode: 'text', reason: 'tts_text_only_mode' };
    }

    // Set up the audio source @ provider's native sample rate, mono.
    const sampleRate = this.tts.sampleRate;
    const source = new AudioSource(sampleRate, 1);
    const track = LocalAudioTrack.createAudioTrack('lecturer-audio', source);
    const opts = new TrackPublishOptions();
    opts.source = TrackSource.SOURCE_MICROPHONE;
    await room.localParticipant.publishTrack(track, opts);

    this.source = source;
    this.track = track;
    this.mediaPublished = true;

    this.logger.info('audio.published', { sampleRate, msSinceStart: Date.now() - t0 });
    await patchSession(this.params.sessionId, {
      lecturer_bot_status: 'live',
      delivery_mode: 'audio',
      last_bootstrap_reason: 'audio_track_published',
      lecturer_identity: this.params.identity,
    });

    // Kick off speaking loop in background.
    void this.runAudioLoop();
    return { mode: 'audio' };
  }

  private async runAudioLoop(): Promise<void> {
    let kind: 'opening' | 'continue' = 'opening';
    while (!this.stopped && Date.now() < this.hardStopAt) {
      try {
        const text = await draftLectureTurn(
          {
            lectureTitle: this.params.lectureTitle,
            tutor: this.params.tutor,
            mode: 'lecture',
          },
          kind,
          this.lastUtterance,
        );
        this.lastUtterance = text;
        await this.speak(text);
        kind = 'continue';
        // Brief pause between turns so students can interject.
        await delay(1500);
      } catch (e) {
        this.logger.error('audio.loop.error', { err: (e as Error).message });
        await delay(3000);
      }
    }
    await this.stop('audio_loop_exit');
  }

  private async runTextLoop(): Promise<void> {
    let kind: 'opening' | 'continue' = 'opening';
    while (!this.stopped && Date.now() < this.hardStopAt) {
      try {
        const text = await draftLectureTurn(
          {
            lectureTitle: this.params.lectureTitle,
            tutor: this.params.tutor,
            mode: 'lecture',
          },
          kind,
          this.lastUtterance,
        );
        this.lastUtterance = text;
        await this.publishTranscript(text);
        kind = 'continue';
        await delay(5000);
      } catch (e) {
        this.logger.error('text.loop.error', { err: (e as Error).message });
        await delay(3000);
      }
    }
    await this.stop('text_loop_exit');
  }

  private async speak(text: string): Promise<void> {
    if (!this.source) return;
    await this.publishTranscript(text);
    const ttsStart = Date.now();
    let frames = 0;
    try {
      for await (const chunk of this.tts.synthesize(text, {
        voiceId: this.params.tutor?.voiceId ?? undefined,
      })) {
        if (this.stopped) break;
        await this.captureChunk(chunk);
        frames++;
      }
    } catch (e) {
      this.logger.error('tts.error', { err: (e as Error).message });
      return;
    }
    this.logger.info('utterance.spoken', {
      chars: text.length,
      frames,
      ttsMs: Date.now() - ttsStart,
    });
  }

  private async captureChunk(chunk: PcmChunk): Promise<void> {
    if (!this.source) return;
    // Build Int16Array view over the byte buffer (s16le).
    // Use subarray, not slice, per @livekit/rtc-node guidance.
    const samples = new Int16Array(
      chunk.pcm.buffer,
      chunk.pcm.byteOffset,
      chunk.pcm.byteLength / 2,
    );
    const frame = new AudioFrame(samples, chunk.sampleRate, 1, chunk.samples);
    await this.source.captureFrame(frame);
  }

  private async publishTranscript(text: string): Promise<void> {
    if (!this.room) return;
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: 'lecturer.transcript', text, ts: Date.now() }),
      );
      await this.room.localParticipant.publishData(payload, { reliable: true, topic: 'lecturer' });
    } catch (e) {
      this.logger.warn('transcript.publish.failed', { err: (e as Error).message });
    }
  }

  private async handleDisconnect(reason: string): Promise<void> {
    if (this.stopped) return;
    await patchSession(this.params.sessionId, {
      lecturer_bot_status: 'error',
      delivery_mode: this.mediaPublished ? 'error' : 'awaiting-publisher',
      last_bootstrap_reason: reason,
    });
    await this.stop(reason);
  }

  async stop(reason: string): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.logger.info('session.stopping', { reason });
    try {
      if (this.track) await this.track.close();
    } catch (e) {
      this.logger.warn('track.close.failed', { err: (e as Error).message });
    }
    try {
      if (this.room) await this.room.disconnect();
    } catch (e) {
      this.logger.warn('room.disconnect.failed', { err: (e as Error).message });
    }
    ACTIVE.delete(this.params.sessionId);
    await patchSession(this.params.sessionId, {
      lecturer_bot_status: 'ended',
      delivery_mode: 'awaiting-publisher',
      last_bootstrap_reason: `stopped:${reason}`,
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Spawn (or reuse) a RoomSession for the given dispatch.
 * Returns once the worker has either (a) published the audio track, or
 * (b) determined it cannot and reported the truthful reason.
 */
export async function spawnRoomSession(params: RoomSessionParams): Promise<{
  ok: boolean;
  mode?: 'audio' | 'text';
  reason?: string;
  detail?: string;
}> {
  const existing = ACTIVE.get(params.sessionId);
  if (existing) {
    log.info('spawnRoomSession: existing session reused', { sessionId: params.sessionId });
    return { ok: true, mode: 'audio', reason: 'already_active' };
  }
  const session = new RoomSession(params);
  ACTIVE.set(params.sessionId, session);
  try {
    const result = await session.start();
    return { ok: true, mode: result.mode, reason: result.reason };
  } catch (e) {
    ACTIVE.delete(params.sessionId);
    const detail = (e as Error).message;
    log.error('spawnRoomSession failed', { sessionId: params.sessionId, detail });
    await patchSession(params.sessionId, {
      lecturer_bot_status: 'error',
      delivery_mode: 'awaiting-publisher',
      last_bootstrap_reason: 'worker_join_failed',
    });
    return { ok: false, reason: 'worker_join_failed', detail };
  }
}

export async function shutdownAll(): Promise<void> {
  const all = Array.from(ACTIVE.values());
  await Promise.allSettled(all.map((s) => s.stop('worker_shutdown')));
  try {
    await dispose();
  } catch {
    /* ignore */
  }
}
