// Avatar provider abstraction — Phase 0
// Every provider (external or sovereign) conforms to this contract so the
// orchestrator can swap, fall back, and route based on capabilities + cost.

export type ProviderKind =
  | "did" | "tavus" | "heygen"
  | "sovereign-musetalk" | "sovereign-wav2lip" | "sovereign-sadtalker"
  | "voice-only" | "text-only";

export type LectureMode = "live" | "recorded_ai" | "semi_live";

export interface ProviderCapabilities {
  realtimeVideo: boolean;
  realtimeAudio: boolean;
  interruptionSupport: boolean;
  multilingual: boolean;
  mobileOptimized: boolean;
  maxSessionMinutes?: number;
  supportsRecordedMode?: boolean;
  supportsSemiLiveMode?: boolean;
}

export interface ProviderHealth {
  kind: ProviderKind;
  healthy: boolean;
  reason?: string;                // truthful: AVATAR_PROVIDER_UNCONFIGURED | _CREDITS_EXHAUSTED | _AUTH_FAILED | _UNREACHABLE | OK
  capabilities: ProviderCapabilities;
  estimatedCostPerMinuteUsd: number;
  checkedAt: string;
}

export interface CreateSessionInput {
  lectureMode: LectureMode;
  isMobile?: boolean;
  preferredLanguage?: string;
  facultyVoiceId?: string | null;
  budgetCeilingUsd?: number;      // hard cap — orchestrator routes below this
}

export interface CreateSessionResult {
  ok: boolean;
  providerKind: ProviderKind;
  // WebRTC handshake artifacts (only when realtime video is established)
  stream_id?: string;
  session_id?: string;
  offer?: unknown;
  ice_servers?: unknown;
  // Truthful fallback signal
  fallback?: boolean;
  reason?: string;
  // Cost projection used for budget governance
  estimatedCostPerMinuteUsd: number;
}

export interface AvatarProvider {
  kind: ProviderKind;
  capabilities: ProviderCapabilities;
  estimatedCostPerMinuteUsd: number;
  getHealth(): Promise<ProviderHealth>;
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  // Optional: realtime control surface — implementations may no-op for voice/text.
  sendSdpAnswer?(streamId: string, sessionId: string, answer: unknown): Promise<void>;
  sendIceCandidate?(streamId: string, sessionId: string, candidate: unknown): Promise<void>;
  speak?(streamId: string, sessionId: string, text: string, voiceId?: string): Promise<unknown>;
  destroy?(streamId: string, sessionId: string): Promise<void>;
}
