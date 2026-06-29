import { config } from '../config.js';
import { log } from '../logger.js';
import { PcmChunk, ProviderUnavailableError, SynthesizeOptions, TTSProvider } from './types.js';

const SAMPLE_RATE = 16000; // pcm_16000 -> raw 16kHz s16le mono
const FRAME_SAMPLES = 320; // 20ms @ 16kHz — LiveKit-friendly frame size

/**
 * ElevenLabs streaming TTS, returning raw 16kHz s16le PCM.
 * We request `pcm_16000` so we can ship frames directly to LiveKit without
 * decoding MP3 in-process.
 */
export class ElevenLabsProvider implements TTSProvider {
  readonly name = 'elevenlabs';
  readonly sampleRate = SAMPLE_RATE;

  constructor(private readonly apiKey: string, private readonly defaultVoiceId: string, private readonly modelId: string) {}

  async *synthesize(text: string, opts: SynthesizeOptions = {}): AsyncIterable<PcmChunk> {
    const voiceId = opts.voiceId || this.defaultVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=pcm_16000`;
    const startedAt = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: this.modelId,
        ...(opts.previousText ? { previous_text: opts.previousText } : {}),
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      throw new ProviderUnavailableError(this.name, `HTTP ${res.status}: ${detail || 'no body'}`);
    }

    log.debug('elevenlabs.synthesize started', { voiceId, chars: text.length });

    const reader = res.body.getReader();
    // Accumulate bytes so we can emit fixed-size 20ms frames.
    let carry = new Uint8Array(0);
    let firstChunkAt: number | null = null;
    let totalSamples = 0;
    const frameBytes = FRAME_SAMPLES * 2;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value || value.length === 0) continue;
      if (firstChunkAt === null) {
        firstChunkAt = Date.now();
        log.info('elevenlabs.ttfb', { ms: firstChunkAt - startedAt, voiceId });
      }
      const merged = new Uint8Array(carry.length + value.length);
      merged.set(carry, 0);
      merged.set(value, carry.length);
      let offset = 0;
      while (merged.length - offset >= frameBytes) {
        const slice = merged.slice(offset, offset + frameBytes);
        offset += frameBytes;
        totalSamples += FRAME_SAMPLES;
        yield { pcm: slice, sampleRate: SAMPLE_RATE, samples: FRAME_SAMPLES };
      }
      carry = merged.slice(offset);
    }

    if (carry.length >= 2) {
      // Pad final partial frame with silence so LiveKit gets a uniform frame size.
      const padded = new Uint8Array(frameBytes);
      padded.set(carry.slice(0, Math.min(carry.length, frameBytes)));
      totalSamples += FRAME_SAMPLES;
      yield { pcm: padded, sampleRate: SAMPLE_RATE, samples: FRAME_SAMPLES };
    }

    log.info('elevenlabs.synthesize complete', {
      voiceId,
      durationMs: Date.now() - startedAt,
      samples: totalSamples,
      seconds: +(totalSamples / SAMPLE_RATE).toFixed(2),
    });
  }
}

/** Silent provider — used when no TTS is configured. Truthful by design. */
export class TextOnlyProvider implements TTSProvider {
  readonly name = 'text';
  readonly sampleRate = SAMPLE_RATE;
  // eslint-disable-next-line require-yield
  async *synthesize(): AsyncIterable<PcmChunk> {
    // Emits nothing. Caller is responsible for publishing transcript via data
    // channel and setting delivery_mode='text'.
    return;
  }
}

export function buildTtsProvider(): TTSProvider {
  if (config.TTS_PROVIDER === 'elevenlabs') {
    if (!config.ELEVENLABS_API_KEY) {
      log.warn('TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set; falling back to text-only.');
      return new TextOnlyProvider();
    }
    return new ElevenLabsProvider(
      config.ELEVENLABS_API_KEY,
      config.ELEVENLABS_DEFAULT_VOICE_ID,
      config.ELEVENLABS_MODEL_ID,
    );
  }
  return new TextOnlyProvider();
}
