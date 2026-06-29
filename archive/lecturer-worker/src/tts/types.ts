/**
 * TTS provider abstraction.
 *
 * Each provider returns an async iterable of PCM frames (16-bit signed,
 * little-endian, mono) at a fixed sample rate. The room publisher converts
 * those frames into LiveKit AudioFrames.
 *
 * The frame size and sample rate are intentionally provider-controlled so
 * each backend can pick what its decode pipeline produces natively.
 */

export interface PcmChunk {
  /** 16-bit signed PCM samples, mono, little-endian, length = samples * 2 bytes. */
  pcm: Uint8Array;
  sampleRate: number;
  /** Samples per channel in this chunk. */
  samples: number;
}

export interface SynthesizeOptions {
  voiceId?: string;
  /** Optional context from prior utterance, used by stitching-aware providers. */
  previousText?: string;
}

export interface TTSProvider {
  readonly name: string;
  /** Native sample rate the provider emits. */
  readonly sampleRate: number;
  synthesize(text: string, opts?: SynthesizeOptions): AsyncIterable<PcmChunk>;
}

export class ProviderUnavailableError extends Error {
  constructor(public providerName: string, message: string) {
    super(`[${providerName}] ${message}`);
    this.name = 'ProviderUnavailableError';
  }
}
