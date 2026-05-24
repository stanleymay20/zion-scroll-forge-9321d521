// Stub adapters for providers we have not yet integrated. They report
// truthful "unconfigured" health so the registry can skip them cleanly.
import type {
  AvatarProvider, CreateSessionResult, ProviderHealth, ProviderKind, ProviderCapabilities,
} from "./types.ts";

function makeStub(
  kind: ProviderKind,
  envKey: string,
  costPerMinUsd: number,
  capabilities: ProviderCapabilities,
): AvatarProvider {
  const configured = Boolean(Deno.env.get(envKey));
  return {
    kind, capabilities, estimatedCostPerMinuteUsd: costPerMinUsd,
    async getHealth(): Promise<ProviderHealth> {
      return {
        kind, healthy: false,
        reason: configured ? "AVATAR_PROVIDER_NOT_IMPLEMENTED" : "AVATAR_PROVIDER_UNCONFIGURED",
        capabilities, estimatedCostPerMinuteUsd: costPerMinUsd,
        checkedAt: new Date().toISOString(),
      };
    },
    async createSession(): Promise<CreateSessionResult> {
      return {
        ok: false, fallback: true, providerKind: kind,
        reason: configured ? "AVATAR_PROVIDER_NOT_IMPLEMENTED" : "AVATAR_PROVIDER_UNCONFIGURED",
        estimatedCostPerMinuteUsd: costPerMinUsd,
      };
    },
  };
}

export const createTavusProvider = () => makeStub("tavus", "TAVUS_API_KEY", 0.40, {
  realtimeVideo: true, realtimeAudio: true, interruptionSupport: true,
  multilingual: true, mobileOptimized: true, maxSessionMinutes: 60,
  supportsRecordedMode: true, supportsSemiLiveMode: true,
});

export const createHeygenProvider = () => makeStub("heygen", "HEYGEN_API_KEY", 0.50, {
  realtimeVideo: true, realtimeAudio: true, interruptionSupport: false,
  multilingual: true, mobileOptimized: true, maxSessionMinutes: 30,
  supportsRecordedMode: true, supportsSemiLiveMode: true,
});

export const createSovereignMuseTalkProvider = () => makeStub(
  "sovereign-musetalk", "SOVEREIGN_AVATAR_URL", 0.05, {
    realtimeVideo: true, realtimeAudio: true, interruptionSupport: true,
    multilingual: true, mobileOptimized: false, maxSessionMinutes: 120,
    supportsRecordedMode: true, supportsSemiLiveMode: true,
  },
);

export const createVoiceOnlyProvider = (): AvatarProvider => {
  const hasTts = Boolean(Deno.env.get("ELEVENLABS_API_KEY"));
  const caps: ProviderCapabilities = {
    realtimeVideo: false, realtimeAudio: true, interruptionSupport: false,
    multilingual: true, mobileOptimized: true,
    supportsRecordedMode: true, supportsSemiLiveMode: true,
  };
  return {
    kind: "voice-only", capabilities: caps, estimatedCostPerMinuteUsd: 0.02,
    async getHealth() {
      return {
        kind: "voice-only", healthy: hasTts,
        reason: hasTts ? "OK" : "VOICE_PROVIDER_UNCONFIGURED",
        capabilities: caps, estimatedCostPerMinuteUsd: 0.02,
        checkedAt: new Date().toISOString(),
      };
    },
    async createSession() {
      return { ok: hasTts, providerKind: "voice-only",
        fallback: !hasTts, reason: hasTts ? undefined : "VOICE_PROVIDER_UNCONFIGURED",
        estimatedCostPerMinuteUsd: 0.02 };
    },
  };
};

export const createTextOnlyProvider = (): AvatarProvider => {
  const caps: ProviderCapabilities = {
    realtimeVideo: false, realtimeAudio: false, interruptionSupport: true,
    multilingual: true, mobileOptimized: true,
    supportsRecordedMode: true, supportsSemiLiveMode: false,
  };
  return {
    kind: "text-only", capabilities: caps, estimatedCostPerMinuteUsd: 0.005,
    async getHealth() {
      return {
        kind: "text-only", healthy: Boolean(Deno.env.get("LOVABLE_API_KEY")),
        reason: Deno.env.get("LOVABLE_API_KEY") ? "OK" : "LLM_UNCONFIGURED",
        capabilities: caps, estimatedCostPerMinuteUsd: 0.005,
        checkedAt: new Date().toISOString(),
      };
    },
    async createSession() {
      return { ok: true, providerKind: "text-only", estimatedCostPerMinuteUsd: 0.005 };
    },
  };
};
